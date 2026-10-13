import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  Filter,
  ChefHat,
  Flame,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import historyService from '../../services/historyService';
import { formatDate, getConfidenceBadge, getFoodImage } from '../../utils/helpers';
import SearchBar from '../../components/common/SearchBar';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import Button from '../../components/common/Button';

export const MealHistory = () => {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('All');
  const [selectedDate, setSelectedDate] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(null);

  const navigate = useNavigate();

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await historyService.getHistory();
      setHistoryItems(data || []);
    } catch (err) {
      setError('Failed to fetch meal history logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFeedback = async (mealId, rating) => {
    setSubmittingFeedback(mealId);
    try {
      await historyService.submitFeedback({
        meal_id: mealId,
        feedback: rating,
      });

      // Update feedback in local state
      setHistoryItems((prev) =>
        prev.map((item) =>
          item.id === mealId ? { ...item, feedback: rating } : item
        )
      );
    } catch (err) {
      console.error('Failed to submit feedback', err);
    } finally {
      setSubmittingFeedback(null);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage message="Loading your meal recognition records..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchHistory} />;
  }

  // Filter items by meal type, search, and date
  const filtered = historyItems.filter((item) => {
    const matchesSearch = item.food_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      selectedMealType === 'All' || item.meal_type?.toLowerCase() === selectedMealType.toLowerCase();
    const matchesDate = !selectedDate || item.date?.startsWith(selectedDate);
    return matchesSearch && matchesType && matchesDate;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Logged Nutrition
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Meal History
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Review the meals you have cooked and rate them to fine-tune your recommendations.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={ChefHat}
          onClick={() => navigate('/cook')}
        >
          Find Something to Cook
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="sm:col-span-5">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search food item..."
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={selectedMealType}
            onChange={(e) => setSelectedMealType(e.target.value)}
            className="w-full text-xs font-semibold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Meal Types</option>
            <option value="Breakfast">Breakfast</option>
            <option value="Morning Snack">Morning Snack</option>
            <option value="Lunch">Lunch</option>
            <option value="Evening Snack">Evening Snack</option>
            <option value="Dinner">Dinner</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* History Items List or Empty State */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="No meals logged yet"
          description="Open any recipe and press I Cooked This to log it here, then rate it to improve your recommendations."
          actionLabel="Find Something to Cook"
          onAction={() => navigate('/cook')}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const confidence = item.confidence != null ? getConfidenceBadge(item.confidence) : null;
            return (
              <div
                key={item.id}
                className="rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-200 p-4 sm:p-5 shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  {/* Image */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={getFoodImage({ image: item.image, name: item.food_name, meal_type: item.meal_type })}
                      alt={item.food_name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {item.meal_type}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDate(item.date)}
                      </span>
                      {confidence && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${confidence.color}`}
                        >
                          {confidence.text} confidence
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {item.recipe_id ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/recipes/${item.recipe_id}`)}
                          className="hover:text-emerald-700 cursor-pointer text-left"
                        >
                          {item.food_name}
                        </button>
                      ) : (
                        item.food_name
                      )}
                    </h3>

                    {item.calories != null && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                        <span className="flex items-center gap-1 font-semibold text-emerald-700">
                          <Flame className="w-3.5 h-3.5 text-amber-500" />
                          {item.calories} kcal
                        </span>
                        {item.protein != null && (
                          <>
                            <span>•</span>
                            <span>{item.protein}g Protein</span>
                          </>
                        )}
                        {item.carbohydrates != null && (
                          <>
                            <span>•</span>
                            <span>{item.carbohydrates}g Carbs</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Feedback Controls (👍 Good, 👎 Not Suitable) */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:inline">
                    Feedback:
                  </span>

                  <button
                    type="button"
                    onClick={() => handleFeedback(item.id, 'Good')}
                    disabled={submittingFeedback === item.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      item.feedback === 'Good'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Good</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFeedback(item.id, 'Not Suitable')}
                    disabled={submittingFeedback === item.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      item.feedback === 'Not Suitable'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700'
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    <span>Not Suitable</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MealHistory;
