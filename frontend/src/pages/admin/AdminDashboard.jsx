import { useState, useEffect } from 'react';
import {
  Users,
  Utensils,
  BookOpen,
  Camera,
  Activity,
  Clock,
  Package,
  Cpu,
} from 'lucide-react';
import adminService from '../../services/adminService';
import StatCard from '../../components/admin/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ProgressBar from '../../components/common/ProgressBar';
import { formatRelativeTime } from '../../utils/helpers';

const formatPercent = (value) => (value == null ? '-' : `${(value * 100).toFixed(1)}%`);

export const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getDashboard();
      setData(res);
    } catch {
      setError('Unable to load admin dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return <LoadingSpinner fullPage message="Aggregating admin telemetry..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchDashboard} />;
  }

  const stats = data?.stats || {};
  const activity = data?.recent_activity || [];
  const model = data?.model || {};
  const topPantry = data?.top_pantry_ingredients || [];
  const maxPantry = Math.max(1, ...topPantry.map((item) => item.count));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Control Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Admin Overview
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            System performance, ingredient recognition logs, pantry usage and content management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
              model.trained
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            {model.trained ? `Model trained (${model.num_classes} classes)` : 'Model not trained yet'}
          </span>
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={(stats.total_users ?? 0).toLocaleString()}
          icon={Users}
          subText={`${stats.active_users ?? 0} active accounts`}
          color="blue"
        />
        <StatCard
          title="Ingredient Catalog"
          value={stats.total_foods ?? 0}
          icon={Utensils}
          subText={`${stats.total_pantry_items ?? 0} pantry items across ${stats.users_with_pantry ?? 0} users`}
          color="emerald"
        />
        <StatCard
          title="Total Recipes"
          value={stats.total_recipes ?? 0}
          icon={BookOpen}
          subText={`${stats.total_meal_plans ?? 0} planned meal slots`}
          color="purple"
        />
        <StatCard
          title="Total Recognitions"
          value={(stats.total_recognitions ?? 0).toLocaleString()}
          icon={Camera}
          subText={`Average confidence ${formatPercent(stats.avg_recognition_confidence)}`}
          color="amber"
        />
      </div>

      {/* Visual Activity & Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Real-time System Activity Feed */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Activity</h3>
              <p className="text-xs text-slate-500">Latest scans, meal logs, pantry updates and sign-ups</p>
            </div>
            <button
              type="button"
              onClick={fetchDashboard}
              className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg cursor-pointer"
            >
              Refresh
            </button>
          </div>

          {activity.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No activity recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white border border-slate-200 text-emerald-600 font-bold">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">{item.action}</span>
                      <span className="text-slate-500">
                        by <span className="font-semibold text-slate-700">{item.user}</span> • {item.detail}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                    {formatRelativeTime(item.time)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-6">
          {/* Right: Computer Vision Confidence Quality Widget */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recognition Model</h3>
                <p className="text-xs text-slate-500">Ingredient classifier used by Scan Ingredients</p>
              </div>
              <Cpu className="w-4 h-4 text-emerald-600" />
            </div>

            {model.trained ? (
              <div className="space-y-4">
                <ProgressBar
                  label="Test accuracy"
                  value={(model.test_accuracy ?? model.validation_accuracy ?? 0) * 100}
                  max={100}
                  subLabel={formatPercent(model.test_accuracy ?? model.validation_accuracy)}
                  color="emerald"
                  size="sm"
                />
                <ProgressBar
                  label="Top-3 accuracy"
                  value={(model.test_top3_accuracy ?? 0) * 100}
                  max={100}
                  subLabel={formatPercent(model.test_top3_accuracy)}
                  color="blue"
                  size="sm"
                />
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50">
                    <dt className="text-slate-400 font-semibold">Architecture</dt>
                    <dd className="font-bold text-slate-800">{model.architecture || '-'}</dd>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50">
                    <dt className="text-slate-400 font-semibold">Ingredient classes</dt>
                    <dd className="font-bold text-slate-800">{model.num_classes}</dd>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50">
                    <dt className="text-slate-400 font-semibold">Training images</dt>
                    <dd className="font-bold text-slate-800">{model.train_images ?? '-'}</dd>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50">
                    <dt className="text-slate-400 font-semibold">Trained</dt>
                    <dd className="font-bold text-slate-800">{formatRelativeTime(model.trained_at) || '-'}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <span className="font-bold block mb-0.5">No trained model found</span>
                <span>
                  Run ml/training/prepare_dataset.py and ml/training/train.py on the server. Until then, scans return
                  low-confidence guesses and users can type ingredients instead.
                </span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Most Stocked Ingredients</h3>
                <p className="text-xs text-slate-500">Across all user pantries</p>
              </div>
              <Package className="w-4 h-4 text-purple-600" />
            </div>
            {topPantry.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No pantry items yet.</p>
            ) : (
              <div className="space-y-3">
                {topPantry.map((item) => (
                  <ProgressBar
                    key={item.name}
                    label={item.name}
                    value={item.count}
                    max={maxPantry}
                    subLabel={`${item.count} pantr${item.count === 1 ? 'y' : 'ies'}`}
                    color="purple"
                    size="sm"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
