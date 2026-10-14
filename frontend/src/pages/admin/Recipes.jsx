import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { adminService } from '../../services';
import { getErrorMessage } from '../../services/api';
import { useRecipes } from '../../lib/queries';
import { DIET_TYPES, MEAL_TYPES } from '../../utils/constants';
import { RecipeImage, resolveImageUrl } from '../../components/food/visuals';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Dialog,
  ErrorState,
  Input,
  ListSkeleton,
  PageHeader,
  SearchBar,
  Select,
  Textarea,
  useToast,
} from '../../components/ui';

const EMPTY = {
  name: '',
  description: '',
  meal_type: 'Lunch',
  diet_type: 'Vegetarian',
  preparation_time: 15,
  cooking_time: 20,
  servings: 2,
  calories: 350,
  protein: 12,
  carbohydrates: 45,
  fat: 10,
  fiber: 5,
  image_url: '',
  instructions: '',
  ingredients: [{ name: '', quantity: '', is_optional: false }],
};

const DIET_OPTIONS = DIET_TYPES.filter((d) => d.value !== 'None');

export const Recipes = () => {
  const toast = useToast();
  const client = useQueryClient();
  const fileRef = useRef(null);
  const [search, setSearch] = useState('');
  const [meal, setMeal] = useState('All');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [target, setTarget] = useState(null);

  const { data = [], isLoading, isError, error, refetch } = useRecipes({});
  const catalog = useQuery({ queryKey: ['admin', 'ingredients'], queryFn: adminService.ingredients });

  const refresh = () => {
    client.invalidateQueries({ queryKey: ['recipes'] });
    client.invalidateQueries({ queryKey: ['recipe'] });
    client.invalidateQueries({ queryKey: ['suggest'] });
    client.invalidateQueries({ queryKey: ['admin'] });
  };

  const save = useMutation({
    mutationFn: (payload) => (editing ? adminService.updateRecipe(editing.id, payload) : adminService.createRecipe(payload)),
    onSuccess: () => {
      refresh();
      setOpen(false);
      toast.success(editing ? 'Recipe updated.' : 'Recipe created.');
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: adminService.deleteRecipe,
    onSuccess: () => {
      refresh();
      setTarget(null);
      toast.success('Recipe deleted.');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
      setTarget(null);
    },
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.filter((r) => (!query || r.name.toLowerCase().includes(query)) && (meal === 'All' || r.meal_type === meal));
  }, [data, search, meal]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (recipe) => {
    setEditing(recipe);
    setForm({
      name: recipe.name,
      description: recipe.description || '',
      meal_type: recipe.meal_type,
      diet_type: recipe.diet_type,
      preparation_time: recipe.preparation_time,
      cooking_time: recipe.cooking_time,
      servings: recipe.servings,
      calories: recipe.calories,
      protein: recipe.protein,
      carbohydrates: recipe.carbohydrates,
      fat: recipe.fat,
      fiber: recipe.fiber,
      image_url: recipe.image_url || '',
      instructions: recipe.instructions || '',
      ingredients: recipe.ingredient_items?.length
        ? recipe.ingredient_items.map((i) => ({ name: i.name, quantity: i.quantity || '', is_optional: i.is_optional }))
        : [{ name: '', quantity: '', is_optional: false }],
    });
    setFormError(null);
    setOpen(true);
  };

  const setField = (field) => (event) => setForm((c) => ({ ...c, [field]: event.target.value }));
  const setIngredient = (index, patch) =>
    setForm((c) => ({ ...c, ingredients: c.ingredients.map((row, i) => (i === index ? { ...row, ...patch } : row)) }));

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await adminService.uploadImage(file);
      setForm((c) => ({ ...c, image_url: result.image_url }));
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    setFormError(null);
    const rows = form.ingredients.filter((row) => row.name.trim());
    if (rows.length === 0) {
      setFormError('Add at least one ingredient.');
      return;
    }
    save.mutate({
      name: form.name.trim(),
      description: form.description.trim() || null,
      meal_type: form.meal_type,
      diet_type: form.diet_type,
      preparation_time: Number(form.preparation_time) || 0,
      cooking_time: Number(form.cooking_time) || 0,
      servings: Number(form.servings) || 1,
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      carbohydrates: Number(form.carbohydrates) || 0,
      fat: Number(form.fat) || 0,
      fiber: Number(form.fiber) || 0,
      image_url: form.image_url || null,
      instructions: form.instructions
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join('\n'),
      ingredient_items: rows.map((row) => ({
        name: row.name.trim(),
        quantity: row.quantity.trim() || null,
        is_optional: row.is_optional,
      })),
    });
  };

  return (
    <div>
      <PageHeader
        title="Recipes"
        emoji="📖"
        description="Every recipe is linked to catalog ingredients, so pantry matching and allergen labels stay accurate."
        actions={
          <Button icon={Plus} onClick={openCreate}>
            New recipe
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <SearchBar value={search} onChange={setSearch} placeholder="Search recipes" className="flex-1" />
        <select
          value={meal}
          onChange={(e) => setMeal(e.target.value)}
          aria-label="Filter by meal type"
          className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-fg focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
        >
          <option value="All">All meal types</option>
          {MEAL_TYPES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <p className="border-b border-line px-5 py-3 text-sm text-muted">
            Showing {filtered.length} of {data.length}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-subtle">
                <tr>
                  <th className="px-5 py-3 font-semibold">Recipe</th>
                  <th className="px-5 py-3 font-semibold">Meal</th>
                  <th className="px-5 py-3 font-semibold">Diet</th>
                  <th className="px-5 py-3 font-semibold">Energy</th>
                  <th className="px-5 py-3 font-semibold">Time</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((recipe) => (
                  <tr key={recipe.id}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-14 shrink-0 overflow-hidden rounded-lg">
                          <RecipeImage recipe={recipe} emojiSize="text-xl" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-fg">{recipe.name}</p>
                          <p className="text-subtle">{recipe.ingredient_items?.length || 0} ingredients</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted">{recipe.meal_type}</td>
                    <td className="px-5 py-3">
                      <Badge tone="brand">{recipe.diet_type}</Badge>
                    </td>
                    <td className="px-5 py-3 text-muted">{Math.round(recipe.calories)} kcal</td>
                    <td className="px-5 py-3 text-muted">{recipe.preparation_time + recipe.cooking_time} min</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" icon={Pencil} onClick={() => openEdit(recipe)} aria-label={`Edit ${recipe.name}`}>
                          Edit
                        </Button>
                        <Button variant="dangerSoft" size="sm" icon={Trash2} onClick={() => setTarget(recipe)} aria-label={`Delete ${recipe.name}`} />
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-muted">
                      No recipes match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit recipe' : 'New recipe'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="recipe-form" loading={save.isPending}>
              {editing ? 'Save changes' : 'Create recipe'}
            </Button>
          </>
        }
      >
        <form id="recipe-form" onSubmit={submit} className="space-y-5">
          {formError && (
            <div className="rounded-xl bg-danger-soft p-3 text-sm font-medium text-danger" role="alert">
              {formError}
            </div>
          )}

          <Input label="Name" value={form.name} onChange={setField('name')} required />
          <Textarea label="Short description" rows={2} value={form.description} onChange={setField('description')} />

          <div className="flex items-center gap-4">
            <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-line">
              {form.image_url ? (
                <img src={resolveImageUrl(form.image_url)} alt="Recipe" className="h-full w-full object-cover" />
              ) : (
                <RecipeImage recipe={{ name: form.name, meal_type: form.meal_type }} emojiSize="text-3xl" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={ImagePlus} loading={uploading} onClick={() => fileRef.current?.click()}>
                Upload photo
              </Button>
              {form.image_url && (
                <Button variant="ghost" icon={X} onClick={() => setForm((c) => ({ ...c, image_url: '' }))}>
                  Remove
                </Button>
              )}
              <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Meal type" value={form.meal_type} onChange={setField('meal_type')} options={MEAL_TYPES} />
            <Select
              label="Diet type"
              value={form.diet_type}
              onChange={setField('diet_type')}
              options={DIET_OPTIONS}
              hint="Pick the strictest group it fits: Vegan, Vegetarian, Eggetarian or Non-Vegetarian."
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input label="Prep (min)" type="number" min="0" value={form.preparation_time} onChange={setField('preparation_time')} />
            <Input label="Cook (min)" type="number" min="0" value={form.cooking_time} onChange={setField('cooking_time')} />
            <Input label="Servings" type="number" min="1" value={form.servings} onChange={setField('servings')} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Input label="Calories" type="number" min="0" value={form.calories} onChange={setField('calories')} />
            <Input label="Protein (g)" type="number" min="0" step="0.1" value={form.protein} onChange={setField('protein')} />
            <Input label="Carbs (g)" type="number" min="0" step="0.1" value={form.carbohydrates} onChange={setField('carbohydrates')} />
            <Input label="Fat (g)" type="number" min="0" step="0.1" value={form.fat} onChange={setField('fat')} />
            <Input label="Fibre (g)" type="number" min="0" step="0.1" value={form.fiber} onChange={setField('fiber')} />
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold text-fg">Ingredients</p>
            <p className="mb-3 text-xs text-subtle">
              Pick from the catalog (local names work). Unknown names are added to the catalog automatically. Allergen labels are worked out from the ingredients.
            </p>
            <datalist id="catalog-ingredients">
              {(catalog.data || []).map((item) => (
                <option key={item.id} value={item.name} />
              ))}
            </datalist>
            <div className="space-y-2">
              {form.ingredients.map((row, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2">
                  <input
                    list="catalog-ingredients"
                    value={row.name}
                    onChange={(e) => setIngredient(index, { name: e.target.value })}
                    placeholder="Ingredient"
                    aria-label={`Ingredient ${index + 1}`}
                    className="min-w-0 flex-1 basis-40 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                  />
                  <input
                    value={row.quantity}
                    onChange={(e) => setIngredient(index, { quantity: e.target.value })}
                    placeholder="Quantity"
                    aria-label={`Quantity ${index + 1}`}
                    className="w-32 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                  />
                  <label className="flex items-center gap-1.5 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={row.is_optional}
                      onChange={(e) => setIngredient(index, { is_optional: e.target.checked })}
                      className="accent-[var(--brand)]"
                    />
                    Optional
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm((c) => ({ ...c, ingredients: c.ingredients.filter((_, i) => i !== index) }))}
                    aria-label={`Remove ingredient ${index + 1}`}
                    className="rounded-lg p-2 text-subtle hover:bg-danger-soft hover:text-danger"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={Plus}
              className="mt-2"
              onClick={() => setForm((c) => ({ ...c, ingredients: [...c.ingredients, { name: '', quantity: '', is_optional: false }] }))}
            >
              Add ingredient
            </Button>
          </div>

          <Textarea
            label="Method"
            hint="One step per line. Steps that mention minutes get a timer in cooking mode."
            rows={6}
            value={form.instructions}
            onChange={setField('instructions')}
            required
          />
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        onConfirm={() => remove.mutate(target.id)}
        title="Delete this recipe?"
        message={`${target?.name} will be removed from the library and from any meal plans that include it.`}
        confirmLabel="Delete recipe"
        danger
        loading={remove.isPending}
      />
    </div>
  );
};

export default Recipes;
