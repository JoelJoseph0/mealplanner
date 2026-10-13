import { useCallback, useContext, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Camera,
  ChefHat,
  CheckCircle2,
  Package,
  Save,
  ShoppingBasket,
  SlidersHorizontal,
  Sparkles,
  Plus,
} from 'lucide-react';
import pantryService from '../../services/pantryService';
import { getErrorMessage } from '../../services/api';
import { UserContext } from '../../context/UserContext';
import IngredientPicker from '../../components/pantry/IngredientPicker';
import CookableRecipeCard from '../../components/pantry/CookableRecipeCard';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { QUICK_PICK_INGREDIENTS, MAX_MISSING_OPTIONS } from '../../utils/constants';

const MEAL_FILTERS = [
  { label: 'All', value: 'All' },
  { label: 'Breakfast', value: 'Breakfast' },
  { label: 'Lunch', value: 'Lunch' },
  { label: 'Dinner', value: 'Dinner' },
  { label: 'Snacks', value: 'Snack' },
];

const parseQueryIngredients = (search) => {
  const params = new URLSearchParams(search);
  const raw = params.get('with') || '';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
};

export const WhatCanICook = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const userContext = useContext(UserContext);
  const showToast = userContext?.showToast;

  const initialTyped = location.state?.ingredients || parseQueryIngredients(location.search);

  const [mode, setMode] = useState(initialTyped.length ? 'typed' : 'pantry');
  const [typed, setTyped] = useState(initialTyped);
  const [pantry, setPantry] = useState([]);
  const [pantryLoaded, setPantryLoaded] = useState(false);
  const [mealType, setMealType] = useState('All');
  const [maxMissing, setMaxMissing] = useState(2);
  const [assumeStaples, setAssumeStaples] = useState(true);
  const [applyProfile, setApplyProfile] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const runSearch = useCallback(
    async (overrides = {}) => {
      const activeMode = overrides.mode ?? mode;
      const ingredients = overrides.typed ?? typed;
      if (activeMode === 'typed' && ingredients.length === 0) {
        setResult(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await pantryService.suggestRecipes({
          ingredients: activeMode === 'typed' ? ingredients : null,
          mealType: overrides.mealType ?? mealType,
          maxMissing: overrides.maxMissing ?? maxMissing,
          assumeStaples: overrides.assumeStaples ?? assumeStaples,
          applyProfile: overrides.applyProfile ?? applyProfile,
        });
        setResult(data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [mode, typed, mealType, maxMissing, assumeStaples, applyProfile]
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const items = await pantryService.getPantry();
        if (!active) return;
        setPantry(items);
        setPantryLoaded(true);
        if (initialTyped.length) {
          runSearch({ mode: 'typed', typed: initialTyped });
        } else if (items.length) {
          runSearch({ mode: 'pantry' });
        } else {
          setMode('typed');
        }
      } catch (err) {
        if (!active) return;
        setPantryLoaded(true);
        setMode('typed');
        if (initialTyped.length) runSearch({ mode: 'typed', typed: initialTyped });
        else setError(getErrorMessage(err));
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const switchMode = (next) => {
    setMode(next);
    setResult(null);
    if (next === 'pantry' && pantry.length) runSearch({ mode: 'pantry' });
    if (next === 'typed' && typed.length) runSearch({ mode: 'typed' });
  };

  const changeMealType = (value) => {
    setMealType(value);
    runSearch({ mealType: value });
  };

  const saveTypedToPantry = async () => {
    if (!typed.length) return;
    setSaving(true);
    try {
      const res = await pantryService.addItems({ names: typed });
      const items = await pantryService.getPantry();
      setPantry(items);
      const saved = (res.added?.length || 0) + (res.updated?.length || 0);
      showToast?.(`${saved} ingredient(s) saved to your pantry`);
    } catch (err) {
      showToast?.(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const markAsBought = async (names) => {
    if (!names.length) return;
    if (mode === 'typed') {
      const next = [...typed, ...names.filter((n) => !typed.some((t) => t.toLowerCase() === n.toLowerCase()))];
      setTyped(next);
      runSearch({ typed: next });
      return;
    }
    try {
      await pantryService.addItems({ names });
      const items = await pantryService.getPantry();
      setPantry(items);
      showToast?.(`Added ${names.join(', ')} to your pantry`);
      runSearch({ mode: 'pantry' });
    } catch (err) {
      showToast?.(getErrorMessage(err), 'error');
    }
  };

  const replaceUnrecognized = (input, suggestion) => {
    const next = [...typed.filter((t) => t !== input && t.toLowerCase() !== suggestion.toLowerCase()), suggestion];
    setTyped(next);
    runSearch({ typed: next });
  };

  const removeUnrecognized = (input) => {
    const next = typed.filter((t) => t !== input);
    setTyped(next);
    runSearch({ typed: next });
  };

  const readyResults = result?.results?.filter((r) => r.status === 'ready') || [];
  const almostResults = result?.results?.filter((r) => r.status === 'almost') || [];
  const viewRecipe = (recipe) => navigate(`/recipes/${recipe.id}`);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
            <ChefHat className="w-3.5 h-3.5" /> Pantry Recipe Finder
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">What Can I Cook?</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Tell us what you have in your kitchen. We will show recipes you can cook right now and the ones that need just one or two more items.
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={Camera} onClick={() => navigate('/food-upload')}>
          Scan an Ingredient
        </Button>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="inline-flex p-1 rounded-2xl bg-slate-100 text-xs font-bold">
          <button
            type="button"
            onClick={() => switchMode('typed')}
            className={`px-4 py-2 rounded-xl cursor-pointer transition-colors ${
              mode === 'typed' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Type ingredients
          </button>
          <button
            type="button"
            onClick={() => switchMode('pantry')}
            className={`px-4 py-2 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 ${
              mode === 'pantry' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Package className="w-3.5 h-3.5" /> Use my pantry ({pantry.length})
          </button>
        </div>

        {mode === 'typed' ? (
          <div className="space-y-3">
            <IngredientPicker
              value={typed}
              onChange={setTyped}
              quickPicks={QUICK_PICK_INGREDIENTS}
              autoFocus
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" icon={Sparkles} onClick={() => runSearch()} disabled={!typed.length} loading={loading}>
                Find Recipes
              </Button>
              <Button variant="secondary" icon={Save} onClick={saveTypedToPantry} disabled={!typed.length} loading={saving}>
                Save to My Pantry
              </Button>
            </div>
          </div>
        ) : pantryLoaded && pantry.length === 0 ? (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>Your pantry is empty. Add what you have in stock, or type ingredients for a quick search.</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => switchMode('typed')}>Type instead</Button>
              <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/pantry')}>Fill My Pantry</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {pantry.map((item) => (
                <span
                  key={item.id}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                    item.expires_soon
                      ? 'bg-orange-50 border-orange-200 text-orange-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  {item.name}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" icon={Sparkles} onClick={() => runSearch()} loading={loading}>
                Find Recipes
              </Button>
              <Link
                to="/pantry"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 px-3 py-2"
              >
                Edit pantry
              </Link>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {MEAL_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => changeMealType(filter.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mealType === filter.value
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {filter.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowFilters((s) => !s)}
              className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> More options
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <label className="space-y-1">
                <span className="font-bold text-slate-600 uppercase tracking-wider block">Allow missing items</span>
                <select
                  value={maxMissing}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setMaxMissing(value);
                    runSearch({ maxMissing: value });
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {MAX_MISSING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assumeStaples}
                  onChange={(e) => {
                    setAssumeStaples(e.target.checked);
                    runSearch({ assumeStaples: e.target.checked });
                  }}
                  className="mt-0.5 accent-emerald-600"
                />
                <span>
                  <span className="font-bold text-slate-700 block">I have kitchen basics</span>
                  <span className="text-slate-500">Salt, oil, sugar, water and everyday spices are not counted as missing.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyProfile}
                  onChange={(e) => {
                    setApplyProfile(e.target.checked);
                    runSearch({ applyProfile: e.target.checked });
                  }}
                  className="mt-0.5 accent-emerald-600"
                />
                <span>
                  <span className="font-bold text-slate-700 block">Respect my diet & allergies</span>
                  <span className="text-slate-500">Uses the diet type, allergies and avoided foods from your preferences.</span>
                </span>
              </label>
            </div>
          )}
        </div>
      </div>

      {result?.unrecognized?.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> We could not recognise some ingredients
          </div>
          {result.unrecognized.map((u) => (
            <div key={u.input} className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">&quot;{u.input}&quot;</span>
              {u.suggestions.length > 0 ? (
                <>
                  <span>Did you mean</span>
                  {u.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => replaceUnrecognized(u.input, s)}
                      className="px-2 py-0.5 rounded-md bg-white border border-amber-300 font-semibold hover:bg-amber-100 cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </>
              ) : (
                <span>is not in our ingredient list yet.</span>
              )}
              <button
                type="button"
                onClick={() => removeUnrecognized(u.input)}
                className="ml-auto text-amber-700 underline cursor-pointer"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">{error}</div>
      )}

      {loading ? (
        <LoadingSpinner message="Matching your ingredients against recipes..." />
      ) : result ? (
        result.results.length === 0 ? (
          <EmptyState
            icon={ChefHat}
            title="No matching recipes yet"
            description={
              maxMissing < 3
                ? 'Try allowing more missing items, switching off diet filters, or adding a few more ingredients.'
                : 'Add a few more ingredients to unlock recipes.'
            }
            actionLabel={maxMissing < 3 ? 'Allow up to 3 missing items' : undefined}
            onAction={
              maxMissing < 3
                ? () => {
                    setMaxMissing(3);
                    runSearch({ maxMissing: 3 });
                  }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-9 space-y-8">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold">
                  {result.ready_count} ready to cook
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 font-bold">
                  {result.almost_count} need a few items
                </span>
                <span className="text-slate-400">
                  Checked {result.total_evaluated} recipes using: {result.pantry.join(', ')}
                </span>
              </div>

              {readyResults.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Cook now
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {readyResults.map((r) => (
                      <CookableRecipeCard key={r.recipe.id} result={r} onViewRecipe={viewRecipe} />
                    ))}
                  </div>
                </section>
              )}

              {almostResults.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <ShoppingBasket className="w-5 h-5 text-amber-500" /> Almost there
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {almostResults.map((r) => (
                      <CookableRecipeCard
                        key={r.recipe.id}
                        result={r}
                        onViewRecipe={viewRecipe}
                        onAddMissing={markAsBought}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="xl:col-span-3">
              {result.shopping_list?.length > 0 && (
                <div className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-xs xl:sticky xl:top-24 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShoppingBasket className="w-4 h-4 text-amber-500" /> Shopping list
                  </h3>
                  <p className="text-[11px] text-slate-500">Buying these unlocks the &quot;Almost there&quot; recipes.</p>
                  <ul className="space-y-2">
                    {result.shopping_list.map((item) => (
                      <li key={item.food_id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-700">{item.name}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-slate-400">{item.unlocks} recipe{item.unlocks > 1 ? 's' : ''}</span>
                          <button
                            type="button"
                            onClick={() => markAsBought([item.name])}
                            className="p-1 rounded-md text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                            title={`I have ${item.name}`}
                            aria-label={`Add ${item.name}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>
        )
      ) : (
        !error && (
          <EmptyState
            icon={Sparkles}
            title="Start with what you have"
            description="Add a couple of ingredients like tomato and papaya, then press Find Recipes."
          />
        )
      )}
    </div>
  );
};

export default WhatCanICook;
