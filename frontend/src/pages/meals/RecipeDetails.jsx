import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Clock,
  Users,
  Flame,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  BookOpen,
  Utensils,
  Search,
  Activity,
  Layers,
  ChevronRight,
  X,
  XCircle,
  ShoppingBasket,
} from 'lucide-react';
import recipeService from '../../services/recipeService';
import pantryService from '../../services/pantryService';
import historyService from '../../services/historyService';
import RecipeCard from '../../components/meals/RecipeCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import Button from '../../components/common/Button';
import SearchBar from '../../components/common/SearchBar';
import { getFoodImage, FALLBACK_FOOD_IMAGES } from '../../utils/helpers';

// Helper to safely parse instructions into an array of clean steps
const parseInstructions = (instructions) => {
  if (!instructions) return [];
  if (Array.isArray(instructions)) return instructions.filter(Boolean);
  if (typeof instructions !== 'string') return [String(instructions)];

  // Check if string contains newlines
  if (instructions.includes('\n')) {
    return instructions
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/^\d+[.)]\s*/, ''));
  }

  // Check if string is numbered steps like "1. Step one. 2. Step two."
  const numberedSteps = instructions.split(/(?=\b\d+\.\s+)/g);
  if (numberedSteps.length > 1) {
    return numberedSteps
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/^\d+[.)]\s*/, ''));
  }

  return [instructions.trim()];
};

// Helper to safely parse ingredients into an array
const parseIngredients = (ingredients) => {
  if (!ingredients) return [];
  if (Array.isArray(ingredients)) return ingredients.filter(Boolean);
  if (typeof ingredients === 'string') {
    try {
      const parsed = JSON.parse(ingredients);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return ingredients
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [String(ingredients)];
};

// Helper to safely extract allergen notices
const parseAllergies = (recipe) => {
  const allergies = recipe?.allergy_information || recipe?.allergies;
  if (!allergies) return [];
  if (Array.isArray(allergies)) return allergies.filter(Boolean);
  if (typeof allergies === 'string') {
    try {
      const parsed = JSON.parse(allergies);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return allergies.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
};

export const RecipeDetails = () => {
  const { recipeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryRecipeId = searchParams.get('recipeId') || searchParams.get('id');
  const effectiveRecipeId = recipeId || queryRecipeId;
  const initialSearch = searchParams.get('search') || '';

  const [recipe, setRecipe] = useState(null);
  const [pantryIds, setPantryIds] = useState(null);
  const [cookedState, setCookedState] = useState(null);
  const [allRecipes, setAllRecipes] = useState([]);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedDiet, setSelectedDiet] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialSearch) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (effectiveRecipeId) {
          const data = await recipeService.getRecipeById(effectiveRecipeId);
          if (isMounted) setRecipe(data);
          try {
            const pantry = await pantryService.getPantry();
            if (isMounted) setPantryIds(new Set(pantry.map((item) => item.food_id)));
          } catch {
            if (isMounted) setPantryIds(null);
          }
        } else {
          const list = await recipeService.getRecipes({ limit: 300 });
          if (isMounted) setAllRecipes(list || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(effectiveRecipeId ? 'Recipe not found or failed to load.' : 'Failed to load recipe library.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [effectiveRecipeId]);

  if (loading) {
    return <LoadingSpinner fullPage message="Loading culinary instructions..." />;
  }

  // View A: Single Recipe Details View
  if (effectiveRecipeId) {
    if (error || !recipe) {
      return (
        <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <Utensils className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Recipe Not Available</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {error || `We couldn't locate recipe #${effectiveRecipeId} in our culinary database.`}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              icon={ArrowLeft}
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/weekly-plan');
                }
              }}
            >
              Back to Plan
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/recipes')}
            >
              Browse All Recipes
            </Button>
          </div>
        </div>
      );
    }

    const steps = parseInstructions(recipe.instructions);
    const ingredients = parseIngredients(recipe.ingredients);
    const structured = Array.isArray(recipe.ingredient_items) ? recipe.ingredient_items : [];
    const keyItems = structured.filter((i) => !i.is_optional && !i.is_staple);
    const missingKey = pantryIds ? keyItems.filter((i) => !pantryIds.has(i.food_id)) : [];

    const handleCooked = async () => {
      setCookedState('saving');
      try {
        await historyService.logMeal({
          recipe_id: recipe.id,
          meal_type: recipe.meal_type || 'Meal',
          notes: 'Cooked from recipe page',
        });
        setCookedState('saved');
      } catch {
        setCookedState('error');
      }
    };

    const handleAddMissing = async () => {
      try {
        await pantryService.addItems({ names: missingKey.map((i) => i.name) });
        const pantry = await pantryService.getPantry();
        setPantryIds(new Set(pantry.map((item) => item.food_id)));
      } catch {
        setPantryIds(pantryIds);
      }
    };
    const allergies = parseAllergies(recipe);
    const prepTime = recipe.preparation_time ? `${recipe.preparation_time} mins` : (recipe.prep_time || '15 mins');
    const cookTime = recipe.cooking_time ? `${recipe.cooking_time} mins` : (recipe.cook_time || '20 mins');
    const servingsCount = recipe.servings || 1;

    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-10">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/weekly-plan');
                }
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Meal Plan
            </button>
            <button
              type="button"
              onClick={() => navigate('/recipes')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              All Recipes
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {recipe.meal_type && (
              <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200">
                {recipe.meal_type}
              </span>
            )}
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200">
              {recipe.diet_type || 'Healthy Choice'}
            </span>
            <Button
              variant={cookedState === 'saved' ? 'secondary' : 'primary'}
              size="sm"
              icon={CheckCircle2}
              loading={cookedState === 'saving'}
              disabled={cookedState === 'saved'}
              onClick={handleCooked}
            >
              {cookedState === 'saved' ? 'Logged' : 'I Cooked This'}
            </Button>
          </div>
        </div>

        {cookedState === 'saved' && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex flex-wrap items-center justify-between gap-2">
            <span>Added to your meal history. Rate it there to improve future recommendations.</span>
            <button
              type="button"
              onClick={() => navigate('/meal-history')}
              className="underline cursor-pointer"
            >
              Open meal history
            </button>
          </div>
        )}
        {cookedState === 'error' && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
            Could not log this meal. Please try again.
          </div>
        )}

        {/* Hero Card */}
        <div className="rounded-3xl overflow-hidden bg-white border border-slate-200/80 shadow-xs">
          <div className="relative aspect-video sm:aspect-21/9 w-full overflow-hidden bg-slate-100">
            <img
              src={getFoodImage(recipe)}
              alt={recipe.title || recipe.name}
              onError={(e) => { e.currentTarget.src = FALLBACK_FOOD_IMAGES.default; }}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-6 right-6 text-white drop-shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Nutritious Recipe #{recipe.id}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white mt-0.5">
                {recipe.title || recipe.name}
              </h1>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <p className="text-sm text-slate-600 leading-relaxed">
              {recipe.description}
            </p>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 text-center">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
                <span className="text-[11px] font-bold text-emerald-700 uppercase block">Calories</span>
                <span className="text-lg font-black text-slate-900">{recipe.calories || 0} kcal</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100">
                <span className="text-[11px] font-bold text-blue-700 uppercase block">Prep Time</span>
                <span className="text-lg font-black text-slate-900">{prepTime}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100">
                <span className="text-[11px] font-bold text-amber-700 uppercase block">Cook Time</span>
                <span className="text-lg font-black text-slate-900">{cookTime}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-100">
                <span className="text-[11px] font-bold text-purple-700 uppercase block">Servings</span>
                <span className="text-lg font-black text-slate-900">{servingsCount} portion{servingsCount > 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Macronutrient Breakdown */}
            {(recipe.protein != null || recipe.carbohydrates != null || recipe.fat != null) && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Macronutrient Breakdown (per serving)</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">Protein</span>
                    <span className="text-sm font-black text-blue-600">{recipe.protein ?? 0}g</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">Carbs</span>
                    <span className="text-sm font-black text-amber-600">{recipe.carbohydrates ?? 0}g</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">Fat</span>
                    <span className="text-sm font-black text-rose-600">{recipe.fat ?? 0}g</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">Fiber</span>
                    <span className="text-sm font-black text-emerald-600">{recipe.fiber ?? 0}g</span>
                  </div>
                </div>
              </div>
            )}

            {/* Allergens warning badge */}
            {allergies.length > 0 && (
              <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2 font-medium">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Allergen Notice: Contains {allergies.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Ingredients & Instructions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Ingredients Checklist */}
          <div className="md:col-span-5">
            <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-xs sticky top-6">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Utensils className="w-4 h-4 text-emerald-600" /> Ingredients ({structured.length || ingredients.length})
              </h3>
              {structured.length > 0 && pantryIds && (
                <div
                  className={`mb-4 p-3 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 ${
                    missingKey.length === 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  <span>
                    {missingKey.length === 0
                      ? 'You have everything you need!'
                      : `You have ${keyItems.length - missingKey.length} of ${keyItems.length}. Missing: ${missingKey.map((i) => i.name).join(', ')}`}
                  </span>
                  {missingKey.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAddMissing}
                      className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 cursor-pointer"
                    >
                      <ShoppingBasket className="w-3.5 h-3.5" /> Got them
                    </button>
                  )}
                </div>
              )}
              {structured.length > 0 ? (
                <ul className="space-y-2.5">
                  {structured.map((item) => {
                    const have = pantryIds?.has(item.food_id);
                    return (
                      <li key={item.food_id} className="text-xs text-slate-700 flex items-start gap-2.5">
                        {pantryIds ? (
                          have ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : item.is_staple || item.is_optional ? (
                            <span className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          )
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                        )}
                        <span className="flex-1">
                          <span className="font-semibold text-slate-900">{item.name}</span>
                          {item.quantity && <span className="text-slate-500"> - {item.quantity}</span>}
                          {item.is_optional && <span className="ml-1.5 text-[10px] font-bold text-slate-400 uppercase">optional</span>}
                          {item.is_staple && <span className="ml-1.5 text-[10px] font-bold text-slate-400 uppercase">basic</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : ingredients.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No specific ingredients listed.</p>
              ) : (
                <ul className="space-y-2.5">
                  {ingredients.map((ing, i) => (
                    <li key={i} className="text-xs text-slate-700 flex items-start gap-2.5 group">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0 group-hover:scale-125 transition-transform" />
                      <span className="font-medium">{ing}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Instructions Step-by-Step */}
          <div className="md:col-span-7">
            <div className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Step-by-Step Instructions ({steps.length})
              </h3>
              {steps.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No instructions available for this recipe.</p>
              ) : (
                <div className="space-y-4">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs leading-relaxed text-slate-700 p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-100 transition-colors">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-black text-xs shadow-xs">
                        {idx + 1}
                      </span>
                      <p className="pt-0.5 font-medium">{step}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // View B: Recipe Catalog View (when on /recipes without ID)
  const filteredList = allRecipes.filter((r) => {
    const matchesSearch =
      r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.ingredient_items || []).some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDiet =
      selectedDiet === 'All' || r.diet_type?.toLowerCase() === selectedDiet.toLowerCase();

    return matchesSearch && matchesDiet;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
          Culinary Library
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
          Healthy Recipe Collection
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore nutritious recipes with exact macros, allergen alerts, and easy step-by-step directions.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search recipes, ingredients..."
          className="flex-1"
        />

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['All', 'Vegetarian', 'Vegan', 'Non-Vegetarian', 'Eggetarian'].map((diet) => (
            <button
              key={diet}
              onClick={() => setSelectedDiet(diet)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                selectedDiet === diet
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {diet}
            </button>
          ))}
        </div>
      </div>

      {searchQuery && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs">
          <span className="font-semibold text-emerald-800">
            Showing specific recipe for &quot;{searchQuery}&quot; ({filteredList.length} match{filteredList.length === 1 ? '' : 'es'})
          </span>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs hover:bg-emerald-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Clear Filter
          </button>
        </div>
      )}

      {/* Recipe Cards Grid */}
      {filteredList.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200">
          <p className="text-sm text-slate-500">No recipes matched your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredList.map((rec) => (
            <RecipeCard
              key={rec.id}
              recipe={rec}
              onViewRecipe={(r) => navigate(`/recipes/${r.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RecipeDetails;
