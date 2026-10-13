import { useContext, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  ChefHat,
  PackagePlus,
  Activity,
  UploadCloud,
} from 'lucide-react';
import { getConfidenceBadge } from '../../utils/helpers';
import Button from '../../components/common/Button';
import CookableRecipeCard from '../../components/pantry/CookableRecipeCard';
import pantryService from '../../services/pantryService';
import { getErrorMessage } from '../../services/api';
import { UserContext } from '../../context/UserContext';

export const FoodRecognition = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const userContext = useContext(UserContext);
  const showToast = userContext?.showToast;

  const prediction = location.state?.prediction;
  const imagePreview = location.state?.imagePreview || prediction?.image_url;

  const [inPantry, setInPantry] = useState(Boolean(prediction?.in_pantry || prediction?.added_to_pantry));
  const [adding, setAdding] = useState(false);

  if (!prediction) {
    return <Navigate to="/food-upload" replace />;
  }

  const recognized = Boolean(prediction.food_id);
  const confidenceBadge = getConfidenceBadge(prediction.confidence);
  const candidates = (prediction.candidates || []).filter((c) => c.food_id);

  const addToPantry = async (name) => {
    setAdding(true);
    try {
      await pantryService.addItems({ names: [name] });
      if (name === prediction.food_name) setInPantry(true);
      showToast?.(`${name} added to your pantry`);
      return true;
    } catch (err) {
      showToast?.(getErrorMessage(err), 'error');
      return false;
    } finally {
      setAdding(false);
    }
  };

  const addAndCook = async (name) => {
    const ok = inPantry && name === prediction.food_name ? true : await addToPantry(name);
    if (ok) navigate('/cook');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Top Banner with Breadcrumb & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Computer Vision Analysis Result
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            {recognized ? 'Ingredient Recognized' : 'Not Sure What This Is'}
          </h1>
        </div>

        <Button variant="secondary" size="sm" icon={UploadCloud} onClick={() => navigate('/food-upload')}>
          Scan Another Ingredient
        </Button>
      </div>

      {/* Warning for Low Confidence */}
      {(!recognized || confidenceBadge.isLow) && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="space-y-2">
            <span className="font-bold block">Low prediction confidence ({confidenceBadge.text})</span>
            <span>Pick the right ingredient below, retake the photo in better light, or type it on the pantry page.</span>
            {candidates.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {candidates.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    disabled={adding}
                    onClick={() => addAndCook(c.name)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-300 font-semibold hover:bg-amber-100 cursor-pointer"
                  >
                    <PackagePlus className="w-3.5 h-3.5" /> It&apos;s {c.name} ({Math.round(c.confidence * 100)}%)
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Vision Result Card */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left: Uploaded Food Image */}
          <div className="md:col-span-5">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 shadow-inner">
              {imagePreview && (
                <img src={imagePreview} alt={prediction.food_name} className="w-full h-full object-cover" />
              )}
              <div className="absolute bottom-3 left-3 right-3 bg-slate-950/70 backdrop-blur-xs text-white p-2.5 rounded-xl text-xs flex items-center justify-between">
                <span>Model Confidence</span>
                <span className="font-extrabold text-emerald-400">{confidenceBadge.text}</span>
              </div>
            </div>
          </div>

          {/* Right: Recognized Entity Details */}
          <div className="md:col-span-7 space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-lg">
                  {prediction.category || 'Ingredient'}
                </span>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${confidenceBadge.color}`}>
                  {confidenceBadge.label}
                </span>
                {inPantry && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white">
                    <CheckCircle2 className="w-3.5 h-3.5" /> In your pantry
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">{prediction.food_name}</h2>
            </div>

            {/* Confidence Progress Bar */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Model Certainty Score</span>
                <span className="text-slate-900">{confidenceBadge.text}</span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`${confidenceBadge.barColor} h-full transition-all duration-700 ease-out`}
                  style={{ width: `${confidenceBadge.percentage}%` }}
                />
              </div>
            </div>

            {/* Quick Macro Summary */}
            {prediction.nutrition && (
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Nutrition per {prediction.serving_size || '100g'}
                </span>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-900 font-bold">
                    <div className="text-base font-extrabold">{prediction.nutrition.calories}</div>
                    <div className="text-[10px] text-emerald-600 uppercase font-semibold">Calories</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-900 font-bold">
                    <div className="text-base font-extrabold">{prediction.nutrition.protein}g</div>
                    <div className="text-[10px] text-blue-600 uppercase font-semibold">Protein</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-900 font-bold">
                    <div className="text-base font-extrabold">{prediction.nutrition.carbohydrates}g</div>
                    <div className="text-[10px] text-amber-600 uppercase font-semibold">Carbs</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-purple-50 text-purple-900 font-bold">
                    <div className="text-base font-extrabold">{prediction.nutrition.fat}g</div>
                    <div className="text-[10px] text-purple-600 uppercase font-semibold">Fat</div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {recognized && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button variant="primary" icon={ChefHat} size="md" loading={adding} onClick={() => addAndCook(prediction.food_name)}>
                  {inPantry ? 'What Can I Cook Now?' : 'Add to Pantry & Find Recipes'}
                </Button>
                {!inPantry && (
                  <Button
                    variant="secondary"
                    icon={PackagePlus}
                    size="md"
                    disabled={adding}
                    onClick={() => addToPantry(prediction.food_name)}
                  >
                    Just Add to Pantry
                  </Button>
                )}
                <Button
                  variant="ghost"
                  icon={Activity}
                  size="md"
                  onClick={() => navigate(`/nutrition/${prediction.food_id}`)}
                >
                  Full Nutrition
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {prediction.recommended_recipes && prediction.recommended_recipes.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Recipes Using {prediction.food_name}</h3>
            <p className="text-xs text-slate-500">Ranked by how much of each recipe your pantry already covers.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prediction.recommended_recipes.map((recipe) => (
              <CookableRecipeCard
                key={recipe.id}
                result={{ ...recipe.pantry_match, recipe }}
                onViewRecipe={(r) => navigate(`/recipes/${r.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodRecognition;
