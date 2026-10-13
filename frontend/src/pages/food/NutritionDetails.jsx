import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import nutritionService from '../../services/nutritionService';
import userService from '../../services/userService';
import NutritionCard from '../../components/nutrition/NutritionCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import Button from '../../components/common/Button';

export const NutritionDetails = () => {
  const { foodId } = useParams();
  const navigate = useNavigate();

  const [nutrition, setNutrition] = useState(null);
  const [targets, setTargets] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNutrition = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await nutritionService.getNutrition(foodId || 1);
        setNutrition(data);
        try {
          const prefs = await userService.getPreferences();
          setTargets({
            calories: prefs?.daily_calories || 2000,
            protein: prefs?.protein_target || 75,
            carbs: prefs?.carbohydrate_target || 250,
            fat: prefs?.fat_target || 65,
          });
        } catch {
          setTargets(undefined);
        }
      } catch {
        setError('Failed to fetch nutrition metrics for this food item.');
      } finally {
        setLoading(false);
      }
    };

    fetchNutrition();
  }, [foodId]);

  if (loading) {
    return <LoadingSpinner fullPage message="Fetching detailed nutritional profile..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button and page title */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <Button
          variant="outline"
          size="sm"
          icon={BookOpen}
          onClick={() =>
            navigate(nutrition?.food_name ? `/recipes?search=${encodeURIComponent(nutrition.food_name)}` : '/recipes')
          }
        >
          Recipes Using It
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Nutritional Analysis
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Macronutrients per serving from the ingredient nutrition database, compared with your daily targets.
        </p>
      </div>

      {/* Main Nutrition Card */}
      {nutrition && (
        <NutritionCard
          nutrition={nutrition}
          foodName={nutrition.food_name}
          servingSize={nutrition.serving_size}
          category={nutrition.category}
          dailyTargets={targets}
        />
      )}
    </div>
  );
};

export default NutritionDetails;
