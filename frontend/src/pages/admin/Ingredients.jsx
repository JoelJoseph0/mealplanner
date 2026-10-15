import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderCog, Pencil, Plus, Trash2 } from 'lucide-react';
import { adminService } from '../../services';
import { getErrorMessage } from '../../services/api';
import { INGREDIENT_CATEGORIES } from '../../utils/constants';
import { IngredientIcon } from '../../components/food/visuals';
import CategoryManager from '../../components/admin/CategoryManager';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  Dialog,
  ErrorState,
  Input,
  ListSkeleton,
  PageHeader,
  SearchBar,
  Select,
  useToast,
} from '../../components/ui';

const EMPTY = {
  name: '',
  category: 'Vegetables',
  aliases: '',
  substitutes: '',
  is_staple: false,
  serving_size: '100g',
  calories: 0,
  protein: 0,
  carbohydrates: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
};

const toList = (text) =>
  text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const NUTRIENTS = [
  ['calories', 'Calories (kcal)'],
  ['protein', 'Protein (g)'],
  ['carbohydrates', 'Carbs (g)'],
  ['fat', 'Fat (g)'],
  ['fiber', 'Fibre (g)'],
  ['sugar', 'Sugar (g)'],
];

export const Ingredients = () => {
  const toast = useToast();
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [managing, setManaging] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [target, setTarget] = useState(null);

  const { data = [], isLoading, isError, error, refetch } = useQuery({ queryKey: ['admin', 'ingredients'], queryFn: adminService.ingredients });

  const refresh = () => {
    client.invalidateQueries({ queryKey: ['admin'] });
    client.invalidateQueries({ queryKey: ['suggest'] });
  };

  const save = useMutation({
    mutationFn: (payload) => (editing ? adminService.updateIngredient(editing.id, payload) : adminService.createIngredient(payload)),
    onSuccess: () => {
      refresh();
      setOpen(false);
      toast.success(editing ? 'Ingredient updated.' : 'Ingredient created.');
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: adminService.deleteIngredient,
    onSuccess: () => {
      refresh();
      setTarget(null);
      toast.success('Ingredient deleted.');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
      setTarget(null);
    },
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.filter((item) => {
      const matches = !query || item.name.toLowerCase().includes(query) || (item.aliases || []).some((a) => a.toLowerCase().includes(query));
      return matches && (category === 'All' || item.category === category);
    });
  }, [data, search, category]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (item) => {
    const n = item.nutrition || {};
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      aliases: (item.aliases || []).join(', '),
      substitutes: (item.substitutes || []).join(', '),
      is_staple: Boolean(item.is_staple),
      serving_size: n.serving_size || '100g',
      calories: n.calories ?? 0,
      protein: n.protein ?? 0,
      carbohydrates: n.carbohydrates ?? 0,
      fat: n.fat ?? 0,
      fiber: n.fiber ?? 0,
      sugar: n.sugar ?? 0,
    });
    setFormError(null);
    setOpen(true);
  };

  const submit = (event) => {
    event.preventDefault();
    setFormError(null);
    save.mutate({
      name: form.name.trim(),
      category: form.category,
      aliases: toList(form.aliases),
      substitutes: toList(form.substitutes),
      is_staple: form.is_staple,
      nutrition: {
        serving_size: form.serving_size || '100g',
        calories: Number(form.calories) || 0,
        protein: Number(form.protein) || 0,
        carbohydrates: Number(form.carbohydrates) || 0,
        fat: Number(form.fat) || 0,
        fiber: Number(form.fiber) || 0,
        sugar: Number(form.sugar) || 0,
      },
    });
  };

  const setField = (field) => (event) => setForm((c) => ({ ...c, [field]: event.target.value }));
  const categoryOptions = [...new Set([...INGREDIENT_CATEGORIES, ...data.map((f) => f.category).filter(Boolean)])].sort();

  return (
    <div>
      <PageHeader
        title="Ingredients"
        emoji="🥬"
        description="The catalog users add to their kitchen, with local names, swaps and nutrition per serving."
        actions={
          <>
            <Button variant="secondary" icon={FolderCog} onClick={() => setManaging(true)}>
              Categories
            </Button>
            <Button icon={Plus} onClick={openCreate}>
              Add ingredient
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or local name" className="flex-1" />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
          className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-fg focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
        >
          <option value="All">All categories</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
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
                  <th className="px-5 py-3 font-semibold">Ingredient</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Swaps</th>
                  <th className="px-5 py-3 font-semibold">Nutrition</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <IngredientIcon name={item.name} category={item.category} size="sm" />
                        <div>
                          <p className="flex items-center gap-2 font-semibold text-fg">
                            {item.name}
                            {item.is_staple && <Badge>Basic</Badge>}
                          </p>
                          {item.aliases?.length > 0 && <p className="max-w-xs truncate text-subtle">Also: {item.aliases.join(', ')}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted">{item.category}</td>
                    <td className="px-5 py-3 text-muted">{(item.substitutes || []).join(', ') || '-'}</td>
                    <td className="px-5 py-3 text-muted">
                      {item.nutrition ? `${item.nutrition.calories} kcal · ${item.nutrition.protein}g protein` : 'Missing'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" icon={Pencil} onClick={() => openEdit(item)} aria-label={`Edit ${item.name}`}>
                          Edit
                        </Button>
                        <Button variant="dangerSoft" size="sm" icon={Trash2} onClick={() => setTarget(item)} aria-label={`Delete ${item.name}`} />
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-muted">
                      No ingredients match.
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
        title={editing ? `Edit ${editing.name}` : 'Add ingredient'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="ingredient-form" loading={save.isPending}>
              {editing ? 'Save changes' : 'Create ingredient'}
            </Button>
          </>
        }
      >
        <form id="ingredient-form" onSubmit={submit} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-danger-soft p-3 text-sm font-medium text-danger" role="alert">
              {formError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" value={form.name} onChange={setField('name')} required />
            <Select label="Category" value={form.category} onChange={setField('category')} options={categoryOptions} />
          </div>
          <Input label="Other names" hint="Comma separated, e.g. tomatoes, thakkali, tamatar" value={form.aliases} onChange={setField('aliases')} />
          <Input label="Substitutes" hint="Comma separated ingredient names that can replace it" value={form.substitutes} onChange={setField('substitutes')} />
          <Checkbox
            label="Kitchen basic"
            description="Assume every user has it (salt, oil, water, everyday spices)."
            checked={form.is_staple}
            onChange={(checked) => setForm((c) => ({ ...c, is_staple: checked }))}
          />
          <div>
            <p className="mb-2 text-sm font-semibold text-fg">Nutrition</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Input label="Per serving" value={form.serving_size} onChange={setField('serving_size')} />
              {NUTRIENTS.map(([key, label]) => (
                <Input key={key} label={label} type="number" min="0" step="0.1" value={form[key]} onChange={setField(key)} />
              ))}
            </div>
          </div>
        </form>
      </Dialog>

      <CategoryManager open={managing} onClose={() => setManaging(false)} />

      <ConfirmDialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        onConfirm={() => remove.mutate(target.id)}
        title="Delete this ingredient?"
        message={`${target?.name} will also be removed from recipes, pantries and shopping lists that use it.`}
        confirmLabel="Delete ingredient"
        danger
        loading={remove.isPending}
      />
    </div>
  );
};

export default Ingredients;
