import { useState, useEffect } from 'react';
import {
  BarChart3,
  Camera,
  Sparkles,
  Award,
  Activity,
  Package,
  ThumbsUp,
} from 'lucide-react';
import adminService from '../../services/adminService';
import ProgressBar from '../../components/common/ProgressBar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const BAR_SERIES = [
  { key: 'scans', label: 'Ingredient scans', color: 'bg-emerald-500' },
  { key: 'pantry_additions', label: 'Pantry additions', color: 'bg-purple-500' },
  { key: 'meals_logged', label: 'Meals logged', color: 'bg-amber-500' },
  { key: 'new_users', label: 'New users', color: 'bg-blue-500' },
];

const RankedList = ({ items, unit, emptyText }) =>
  items.length === 0 ? (
    <p className="text-xs text-slate-400 text-center py-6">{emptyText}</p>
  ) : (
    <div className="space-y-3 pt-2">
      {items.map((item, idx) => (
        <div key={item.name} className="p-3.5 rounded-2xl bg-slate-50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[11px]">
              #{idx + 1}
            </span>
            <span className="font-bold text-slate-800">{item.name}</span>
          </div>
          <span className="font-semibold text-emerald-700">
            {item.count.toLocaleString()} {unit}
          </span>
        </div>
      ))}
    </div>
  );

export const Reports = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getReports();
      setReports(data);
    } catch {
      setError('Failed to fetch analytical reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return <LoadingSpinner fullPage message="Compiling machine learning vision reports..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchReports} />;
  }

  const vision = reports?.computer_vision_performance || {};
  const model = vision.model || {};
  const planning = reports?.meal_planning || {};
  const pantry = reports?.pantry || {};
  const satisfaction = reports?.user_satisfaction || {};
  const recognizedFoods = vision.most_recognized_ingredients || [];
  const confidenceStats = vision.confidence_distribution || [];
  const monthly = reports?.monthly_activity || [];
  const peak = Math.max(1, ...monthly.flatMap((m) => BAR_SERIES.map((s) => m[s.key] || 0)));
  const plannedRecipes = planning.most_planned_recipes || [];
  const cookedRecipes = planning.most_cooked_recipes || [];
  const feedback = satisfaction.feedback_breakdown || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
          System Analytics & Telemetry
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
          Computer Vision & Activity Reports
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Aggregated data across ingredient scans, pantries, meal plans and feedback.
        </p>
      </div>

      {/* Top Level Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 font-bold">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Scans</span>
            <div className="text-2xl font-black text-slate-900">{(vision.total_inferences ?? 0).toLocaleString()}</div>
            <span className="text-xs text-emerald-600 font-semibold">
              {vision.high_confidence_rate_percentage ?? 0}% confident (50%+)
            </span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600 font-bold">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Days Planned</span>
            <div className="text-2xl font-black text-slate-900">{(planning.planned_days ?? 0).toLocaleString()}</div>
            <span className="text-xs text-blue-600 font-semibold">{planning.plan_entries ?? 0} meal slots filled</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-purple-50 text-purple-600 font-bold">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pantry Items</span>
            <div className="text-2xl font-black text-slate-900">{(pantry.total_items ?? 0).toLocaleString()}</div>
            <span className="text-xs text-purple-600 font-semibold">Ingredients users have in stock</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-600 font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Model Test Accuracy</span>
            <div className="text-2xl font-black text-slate-900">
              {model.test_accuracy != null ? `${(model.test_accuracy * 100).toFixed(1)}%` : 'Not trained'}
            </div>
            <span className="text-xs text-amber-600 font-semibold">
              {model.trained
                ? `${model.architecture || 'Classifier'} on ${model.num_classes} ingredients`
                : 'Run the training pipeline'}
            </span>
          </div>
        </div>
      </div>

      {/* Two-Column Visual Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Most Recognized Foods */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Most Recognized Ingredients</h3>
              <p className="text-xs text-slate-500">Most frequent predictions from ingredient scans</p>
            </div>
            <Camera className="w-4 h-4 text-emerald-600" />
          </div>

          {recognizedFoods.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No scans recorded yet.</p>
          ) : (
            <div className="space-y-3.5 pt-2">
              {recognizedFoods.map((f, idx) => (
                <div key={f.name}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-800">{f.name}</span>
                    <span className="text-slate-500">
                      {f.count.toLocaleString()} scans ({f.percentage}%)
                    </span>
                  </div>
                  <ProgressBar
                    value={f.percentage}
                    max={100}
                    color={idx === 0 ? 'emerald' : idx === 1 ? 'blue' : idx === 2 ? 'amber' : 'purple'}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prediction Confidence Distribution */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Vision Confidence Distribution</h3>
              <p className="text-xs text-slate-500">Model certainty tiers across all uploaded images</p>
            </div>
            <Activity className="w-4 h-4 text-purple-600" />
          </div>

          <div className="space-y-3.5 pt-2">
            {confidenceStats.map((conf, idx) => (
              <div key={conf.range}>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800">{conf.range}</span>
                  <span className="text-slate-500">
                    {conf.count.toLocaleString()} scans ({conf.percentage}%)
                  </span>
                </div>
                <ProgressBar
                  value={conf.percentage}
                  max={100}
                  color={idx === 0 ? 'emerald' : idx === 1 ? 'blue' : idx === 2 ? 'amber' : 'red'}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row: Top Recommended Recipes & Monthly User Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Most Recommended Recipes */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {cookedRecipes.length ? 'Most Cooked Recipes' : 'Most Planned Recipes'}
              </h3>
              <p className="text-xs text-slate-500">
                {cookedRecipes.length ? 'Recipes users logged as cooked' : 'Recipes chosen most often by the meal planner'}
              </p>
            </div>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <RankedList
            items={cookedRecipes.length ? cookedRecipes : plannedRecipes}
            unit={cookedRecipes.length ? 'times cooked' : 'times planned'}
            emptyText="No meal plans generated yet."
          />
          <div className="flex flex-wrap gap-2 pt-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold">
              <ThumbsUp className="w-3.5 h-3.5" /> Avg rating {satisfaction.average_rating ?? 0} / 5
            </span>
            {Object.entries(feedback).map(([label, count]) => (
              <span key={label} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold capitalize">
                {label}: {count}
              </span>
            ))}
          </div>
        </div>

        {/* Monthly Activity Trend Bar Chart */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Activity (Last 6 Months)</h3>
              <p className="text-xs text-slate-500">Monthly scans, pantry additions, meal logs and sign-ups</p>
            </div>
            <BarChart3 className="w-4 h-4 text-blue-600" />
          </div>

          <div className="pt-4 flex items-end justify-between gap-3 h-48 border-b border-slate-100 pb-2">
            {monthly.map((month) => (
              <div key={`${month.year}-${month.month}`} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className="w-full flex-1 flex items-end justify-center gap-0.5">
                  {BAR_SERIES.map((series) => (
                    <div
                      key={series.key}
                      className={`w-1/5 ${series.color} rounded-t-sm transition-all duration-500`}
                      style={{ height: `${Math.round(((month[series.key] || 0) / peak) * 100)}%` }}
                      title={`${month.month} ${month.year}: ${month[series.key] || 0} ${series.label.toLowerCase()}`}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-slate-700">{month.month}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs text-slate-500">
            {BAR_SERIES.map((series) => (
              <span key={series.key} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-xs ${series.color} inline-block`} /> {series.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Most Stocked Pantry Ingredients</h3>
            <p className="text-xs text-slate-500">What users most often have in their kitchens</p>
          </div>
          <Package className="w-4 h-4 text-purple-600" />
        </div>
        <RankedList items={pantry.top_ingredients || []} unit="pantries" emptyText="No pantry items yet." />
      </div>
    </div>
  );
};

export default Reports;
