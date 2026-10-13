import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, SlidersHorizontal, RefreshCw, Filter } from 'lucide-react';
import recommendationService from '../../services/recommendationService';
import RecipeCard from '../../components/meals/RecipeCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import Button from '../../components/common/Button';

export const Recommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMealType, setSelectedMealType] = useState('All');

  const navigate = useNavigate();

  const fetchRecommendations = async (mealType = selectedMealType) => {
    setLoading(true);
    setError(null);
    try {
      const typeParam = mealType === 'Snacks' ? 'Snack' : mealType;
      const data = await recommendationService.getRecommendations({
        meal_type: typeParam,
        limit: 12,
      });
      setRecommendations(data || []);
    } catch (err) {
      setError('Unable to fetch personalized recommendations from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations(selectedMealType);
  }, [selectedMealType]);

  const mealFilters = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snacks'];

  const filtered = recommendations.filter((item) => {
    if (selectedMealType === 'All') return true;
    if (selectedMealType === 'Snacks') {
      return item.meal_type.toLowerCase().includes('snack');
    }
    return item.meal_type.toLowerCase() === selectedMealType.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> AI Recommendation Engine
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Recommended For You
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Curated recipes matching your diet, allergen constraints and calorie targets, favouring ones you can make from your pantry.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          onClick={fetchRecommendations}
          disabled={loading}
        >
          Refresh Suggestions
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filter by:
        </span>
        {mealFilters.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedMealType(type)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedMealType === type
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner fullPage message="Personalizing meal recommendations..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchRecommendations} />
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200">
          <p className="text-sm text-slate-500">No recommendations found for &quot;{selectedMealType}&quot;.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              matchScore={recipe.match_score}
              onViewRecipe={(r) => navigate(`/recipes/${r.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Recommendations;
