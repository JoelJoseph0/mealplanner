import { useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ChefHat, Pencil, Refrigerator, SlidersHorizontal } from 'lucide-react';
import {
  usePantry,
  useRateRecipe,
  useRatings,
  useRecipes,
  useShoppingFromRecipe,
  useSuggestions,
} from '../../lib/queries';
import { getErrorMessage } from '../../services/api';
import { QUICK_PICK_INGREDIENTS } from '../../utils/constants';
import IngredientPicker from '../../components/pantry/IngredientPicker';
import RecipeCard from '../../components/food/RecipeCard';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  GridSkeleton,
  HealthNote,
  PageHeader,
  SearchBar,
  Segmented,
  Tabs,
  useToast,
} from '../../components/ui';

const MEAL_FILTERS = [
  { label: 'All', value: 'All' },
  { label: 'Breakfast', value: 'Breakfast' },
  { label: 'Lunch', value: 'Lunch' },
  { label: 'Dinner', value: 'Dinner' },
  { label: 'Snacks', value: 'Snack' },
];

const SORTS = [
  { value: 'best', label: 'Best match' },
  { value: 'fastest', label: 'Quickest' },
  { value: 'lightest', label: 'Lightest' },
];

const DIETS = ['All', 'Vegetarian', 'Vegan', 'Eggetarian', 'Non-Vegetarian'];

const totalTime = (recipe) => (recipe.preparation_time || 0) + (recipe.cooking_time || 0);

const sortResults = (list, sort, getRecipe) => {
  const copy = [...list];
  if (sort === 'fastest') copy.sort((a, b) => totalTime(getRecipe(a)) - totalTime(getRecipe(b)));
  if (sort === 'lightest') copy.sort((a, b) => getRecipe(a).calories - getRecipe(b).calories);
  return copy;
};

export const Cook = () => {
  const location = useLocation();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = ['ready', 'almost', 'all'].includes(params.get('tab')) ? params.get('tab') : 'ready';

  const initialTyped = location.state?.ingredients || (params.get('with') || '').split(',').map((s) => s.trim()).filter(Boolean);
  const [typed, setTyped] = useState(initialTyped);
  const [editing, setEditing] = useState(false);
  const [mealType, setMealType] = useState('All');
  const [maxMissing, setMaxMissing] = useState(2);
  const [applyProfile, setApplyProfile] = useState(true);
  const [sort, setSort] = useState('best');
  const [search, setSearch] = useState('');
  const [diet, setDiet] = useState('All');

  const { data: pantry = [], isLoading: pantryLoading } = usePantry();
  const usingTyped = typed.length > 0;
  const hasSource = usingTyped || pantry.length > 0;

  const suggestions = useSuggestions(
    { ingredients: usingTyped ? typed : null, mealType, maxMissing: 3, applyProfile, limit: 100 },
    hasSource && tab !== 'all'
  );
  const recipes = useRecipes({}, tab === 'all');
  const { data: ratings = {} } = useRatings();
  const rate = useRateRecipe();
  const addMissing = useShoppingFromRecipe();

  const results = useMemo(() => suggestions.data?.results || [], [suggestions.data]);
  const ready = useMemo(() => sortResults(results.filter((r) => r.status === 'ready'), sort, (r) => r.recipe), [results, sort]);
  const almost = useMemo(
    () => sortResults(results.filter((r) => r.status === 'almost' && r.missing.length <= maxMissing), sort, (r) => r.recipe),
    [results, sort, maxMissing]
  );

  const allRecipes = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = (recipes.data || []).filter((r) => {
      const matchesSearch =
        !query ||
        r.name.toLowerCase().includes(query) ||
        (r.ingredient_items || []).some((i) => i.name.toLowerCase().includes(query));
      const matchesDiet = diet === 'All' || r.diet_type === diet;
      const matchesMeal = mealType === 'All' || (r.meal_type || '').toLowerCase().includes(mealType.toLowerCase());
      return matchesSearch && matchesDiet && matchesMeal;
    });
    return sortResults(list, sort, (r) => r);
  }, [recipes.data, search, diet, mealType, sort]);

  const setTab = (id) => {
    const next = new URLSearchParams(params);
    if (id === 'ready') next.delete('tab');
    else next.set('tab', id);
    setParams(next, { replace: true });
  };

  const handleAddMissing = async (recipe) => {
    try {
      const result = await addMissing.mutateAsync(recipe.id);
      if (result.added) toast.success(`Added ${result.added} ingredient${result.added > 1 ? 's' : ''} to your shopping list`);
      else toast.info('Those ingredients are already on your list.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onRate = (id, feedback) => rate.mutate({ id, feedback });
  const unrecognized = suggestions.data?.unrecognized || [];

  const renderMatches = (list, emptyTitle, emptyText) => {
    if (suggestions.isLoading) return <GridSkeleton count={6} />;
    if (suggestions.isError) return <ErrorState message={getErrorMessage(suggestions.error)} onRetry={suggestions.refetch} />;
    if (list.length === 0) {
      return (
        <EmptyState
          icon={ChefHat}
          title={emptyTitle}
          description={emptyText}
          action={
            tab === 'ready' ? (
              <Button variant="secondary" onClick={() => setTab('almost')}>
                See almost-ready recipes
              </Button>
            ) : (
              <Button variant="secondary" to="/pantry">
                Add more ingredients
              </Button>
            )
          }
        />
      );
    }
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((item) => (
          <RecipeCard
            key={item.recipe.id}
            recipe={item.recipe}
            match={item}
            rating={ratings[item.recipe.id]}
            onRate={onRate}
            onAddMissing={handleAddMissing}
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Cook" emoji="🍳" description="Recipes matched against what is in your kitchen." />

      <Card className="mb-6">
        {usingTyped || editing ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-fg">Cooking with these ingredients</h2>
              {pantry.length > 0 && (
                <Button
                  variant="soft"
                  size="sm"
                  icon={Refrigerator}
                  onClick={() => {
                    setTyped([]);
                    setEditing(false);
                  }}
                >
                  Use my kitchen ({pantry.length})
                </Button>
              )}
            </div>
            <IngredientPicker value={typed} onChange={setTyped} quickPicks={QUICK_PICK_INGREDIENTS} autoFocus={editing} />
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-fg">Using your kitchen</h2>
              <p className="text-sm text-muted">
                {pantryLoading
                  ? 'Loading...'
                  : pantry.length > 0
                  ? `${pantry.length} ingredients: ${pantry.slice(0, 6).map((p) => p.name).join(', ')}${pantry.length > 6 ? '...' : ''}`
                  : 'Nothing in your kitchen yet. Add ingredients or type a few below.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(true)}>
                Try other ingredients
              </Button>
              <Button variant="soft" size="sm" to="/pantry">
                Edit kitchen
              </Button>
            </div>
          </div>
        )}
        {unrecognized.length > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-warn-soft p-3 text-sm text-fg">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
            <div>
              {unrecognized.map((u) => (
                <div key={u.input} className="flex flex-wrap items-center gap-2">
                  <span>
                    Not recognised: <strong>{u.input}</strong>.
                  </span>
                  {u.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTyped((current) => [...current.filter((c) => c !== u.input), s])}
                      className="rounded-full bg-surface px-2.5 py-0.5 text-sm font-semibold text-brand hover:bg-brand-soft"
                    >
                      Use {s}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'ready', label: 'Ready now', count: hasSource ? ready.length : undefined },
          { id: 'almost', label: 'Almost there', count: hasSource ? almost.length : undefined },
          { id: 'all', label: 'All recipes' },
        ]}
      />

      <div className="my-5 flex flex-wrap items-center gap-3">
        <Segmented options={MEAL_FILTERS} value={mealType} onChange={setMealType} size="sm" />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm font-medium text-muted">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            <span>Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-xl border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-fg focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {tab !== 'all' && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Chip active={applyProfile} onClick={() => setApplyProfile((v) => !v)}>
            Respect my diet and allergies
          </Chip>
          {tab === 'almost' &&
            [1, 2, 3].map((n) => (
              <Chip key={n} active={maxMissing === n} onClick={() => setMaxMissing(n)}>
                {n === 1 ? 'Missing 1' : `Up to ${n} missing`}
              </Chip>
            ))}
        </div>
      )}

      {tab === 'ready' &&
        (hasSource || pantryLoading ? (
          renderMatches(
            ready,
            'Nothing is fully ready yet',
            'Try the almost-ready tab, add a few more ingredients, or switch off the diet filter.'
          )
        ) : (
          <EmptyState
            icon={Refrigerator}
            title="Start with what you have"
            description="Add ingredients to your kitchen, or type a few above, to see what you can cook."
            action={<Button to="/pantry">Open my kitchen</Button>}
          />
        ))}

      {tab === 'almost' &&
        (hasSource ? (
          renderMatches(
            almost,
            'Nothing is close yet',
            'Allow more missing ingredients above, or add more items to your kitchen.'
          )
        ) : (
          <EmptyState icon={Refrigerator} title="Add some ingredients first" action={<Button to="/pantry">Open my kitchen</Button>} />
        ))}

      {tab === 'all' && (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <SearchBar value={search} onChange={setSearch} placeholder="Search recipes or ingredients" className="flex-1" />
            <div className="flex flex-wrap gap-2">
              {DIETS.map((d) => (
                <Chip key={d} active={diet === d} onClick={() => setDiet(d)}>
                  {d}
                </Chip>
              ))}
            </div>
          </div>
          {recipes.isLoading ? (
            <GridSkeleton count={6} />
          ) : recipes.isError ? (
            <ErrorState message={getErrorMessage(recipes.error)} onRetry={recipes.refetch} />
          ) : allRecipes.length === 0 ? (
            <EmptyState icon={ChefHat} title="No recipes match" description="Try a different search or filter." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {allRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} rating={ratings[recipe.id]} onRate={onRate} />
              ))}
            </div>
          )}
        </div>
      )}
      <HealthNote className="mt-8" compact />
    </div>
  );
};

export default Cook;
