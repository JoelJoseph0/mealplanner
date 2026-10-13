import { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit2, Trash2, Search, Filter, Clock } from 'lucide-react';
import recipeService from '../../services/recipeService';
import adminService from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import { DIET_TYPES, MEAL_TYPES, ALLERGIES_LIST } from '../../utils/constants';
import SearchBar from '../../components/common/SearchBar';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

export const Recipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMealType, setFilterMealType] = useState('All');
  const [filterDietType, setFilterDietType] = useState('All');

  // Modal Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
    meal_type: 'Breakfast',
    diet_type: 'Vegetarian',
    calories: 350,
    protein: 15,
    carbohydrates: 45,
    fat: 10,
    prep_time: '15 mins',
    cook_time: '20 mins',
    servings: 2,
    allergies: [],
    ingredients: '',
    instructions: '',
  });

  const [recipeToDelete, setRecipeToDelete] = useState(null);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const toMinutes = (value, fallback) => {
    const match = String(value ?? '').match(/\d+/);
    return match ? Number(match[0]) : fallback;
  };

  const fetchRecipes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await recipeService.getRecipes({ limit: 300 });
      setRecipes(data || []);
    } catch (err) {
      setError('Failed to fetch recipes list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const openAddModal = () => {
    setEditingRecipe(null);
    setFormError(null);
    setFormData({
      title: '',
      description: '',
      image: '',
      meal_type: 'Breakfast',
      diet_type: 'Vegetarian',
      calories: 350,
      protein: 15,
      carbohydrates: 45,
      fat: 10,
      prep_time: '15 mins',
      cook_time: '20 mins',
      servings: 2,
      allergies: [],
      ingredients: '1 cup Rolled Oats\n1 cup Almond Milk\nFresh berries',
      instructions: '1. Heat almond milk in a pot.\n2. Add oats and simmer for 6 minutes.\n3. Serve warm with berries.',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (rec) => {
    setEditingRecipe(rec);
    setFormError(null);
    setFormData({
      title: rec.title || rec.name,
      description: rec.description || '',
      image: rec.image_url || rec.image || '',
      meal_type: rec.meal_type || 'Lunch',
      diet_type: rec.diet_type || 'Vegetarian',
      calories: rec.calories || 0,
      protein: rec.protein || 0,
      carbohydrates: rec.carbohydrates || 0,
      fat: rec.fat || 0,
      prep_time: rec.preparation_time != null ? `${rec.preparation_time} mins` : rec.prep_time || '15 mins',
      cook_time: rec.cooking_time != null ? `${rec.cooking_time} mins` : rec.cook_time || '20 mins',
      servings: rec.servings || 2,
      allergies: rec.allergy_information || rec.allergies || [],
      ingredients: Array.isArray(rec.ingredients) ? rec.ingredients.join('\n') : rec.ingredients || '',
      instructions: Array.isArray(rec.instructions) ? rec.instructions.join('\n') : rec.instructions || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    const payload = {
      name: formData.title.trim(),
      description: formData.description || null,
      image_url: formData.image ? formData.image.trim() : null,
      meal_type: formData.meal_type,
      diet_type: formData.diet_type,
      calories: Number(formData.calories) || 0,
      protein: Number(formData.protein) || 0,
      carbohydrates: Number(formData.carbohydrates) || 0,
      fat: Number(formData.fat) || 0,
      preparation_time: toMinutes(formData.prep_time, 15),
      cooking_time: toMinutes(formData.cook_time, 20),
      servings: Number(formData.servings) || 1,
      allergy_information: formData.allergies || [],
      ingredients: formData.ingredients.split('\n').map((l) => l.trim()).filter(Boolean),
      instructions: formData.instructions
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .join('\n'),
    };

    try {
      if (editingRecipe) {
        const updated = await adminService.updateRecipe(editingRecipe.id, payload);
        setRecipes(recipes.map((r) => (r.id === editingRecipe.id ? { ...r, ...updated } : r)));
      } else {
        const created = await adminService.addRecipe(payload);
        setRecipes([...recipes, created]);
      }
      setIsModalOpen(false);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!recipeToDelete) return;
    try {
      await adminService.deleteRecipe(recipeToDelete.id);
      setRecipes(recipes.filter((r) => r.id !== recipeToDelete.id));
      setRecipeToDelete(null);
    } catch (err) {
      setError(getErrorMessage(err));
      setRecipeToDelete(null);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage message="Fetching recipe catalog entries..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchRecipes} />;
  }

  const filtered = recipes.filter((rec) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      rec.title?.toLowerCase().includes(q) ||
      rec.name?.toLowerCase().includes(q) ||
      rec.description?.toLowerCase().includes(q);

    const matchesMeal = filterMealType === 'All' || rec.meal_type === filterMealType;
    const matchesDiet = filterDietType === 'All' || rec.diet_type === filterDietType;

    return matchesQuery && matchesMeal && matchesDiet;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Recipe Database
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Recipes Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Add, update, or remove meal recommendations connected to detected dishes.
          </p>
        </div>

        <Button variant="primary" size="sm" icon={Plus} onClick={openAddModal}>
          Create New Recipe
        </Button>
      </div>

      {/* Filters and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search recipes..."
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={filterMealType}
            onChange={(e) => setFilterMealType(e.target.value)}
            className="w-full text-xs font-semibold px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Meal Types</option>
            {MEAL_TYPES.map((mt) => (
              <option key={mt} value={mt}>
                {mt}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={filterDietType}
            onChange={(e) => setFilterDietType(e.target.value)}
            className="w-full text-xs font-semibold px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Diet Types</option>
            {DIET_TYPES.map((dt) => (
              <option key={dt.value} value={dt.value}>
                {dt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Recipes Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4">Recipe</th>
                <th className="px-5 py-4">Meal Type</th>
                <th className="px-5 py-4">Diet Type</th>
                <th className="px-5 py-4">Calories</th>
                <th className="px-5 py-4">Time</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                        {r.image ? (
                          <img
                            src={r.image}
                            alt={r.title || r.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <BookOpen className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block text-sm">
                          {r.title || r.name}
                        </span>
                        <span className="text-slate-400 text-[11px] line-clamp-1 max-w-xs">
                          {r.description}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                      {r.meal_type}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700">
                      {r.diet_type}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-800">{r.calories} kcal</td>
                  <td className="px-5 py-4 text-slate-500 font-medium">
                    {(r.preparation_time || 0) + (r.cooking_time || 0)} min
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(r)}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Recipe"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecipeToDelete(r)}
                        className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Recipe"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Recipe Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingRecipe ? 'Edit Recipe Record' : 'Create New Health Recipe'}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {formError}
              </div>
            )}
            <Input
              label="Recipe Title / Name"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Avocado Toast with Poached Egg"
              required
            />

            <Input
              label="Image URL"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="https://images.unsplash.com/..."
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Meal Type"
                value={formData.meal_type}
                onChange={(e) => setFormData({ ...formData, meal_type: e.target.value })}
                options={MEAL_TYPES}
                placeholder=""
                required
              />

              <Select
                label="Diet Type"
                value={formData.diet_type}
                onChange={(e) => setFormData({ ...formData, diet_type: e.target.value })}
                options={DIET_TYPES}
                placeholder=""
                required
              />
            </div>

            <div className="grid grid-cols-4 gap-3">
              <Input
                label="Calories (kcal)"
                type="number"
                value={formData.calories}
                onChange={(e) => setFormData({ ...formData, calories: Number(e.target.value) })}
                required
              />
              <Input
                label="Protein (g)"
                type="number"
                value={formData.protein}
                onChange={(e) => setFormData({ ...formData, protein: Number(e.target.value) })}
                required
              />
              <Input
                label="Carbs (g)"
                type="number"
                value={formData.carbohydrates}
                onChange={(e) => setFormData({ ...formData, carbohydrates: Number(e.target.value) })}
                required
              />
              <Input
                label="Fat (g)"
                type="number"
                value={formData.fat}
                onChange={(e) => setFormData({ ...formData, fat: Number(e.target.value) })}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Prep Time"
                value={formData.prep_time}
                onChange={(e) => setFormData({ ...formData, prep_time: e.target.value })}
                placeholder="e.g. 15 mins"
              />
              <Input
                label="Cook Time"
                value={formData.cook_time}
                onChange={(e) => setFormData({ ...formData, cook_time: e.target.value })}
                placeholder="e.g. 20 mins"
              />
              <Input
                label="Servings"
                type="number"
                value={formData.servings}
                onChange={(e) => setFormData({ ...formData, servings: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Ingredients (One per line: name - quantity)
              </label>
              <textarea
                value={formData.ingredients}
                onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                rows={5}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Tomato - 3 medium&#10;Onion - 1 large&#10;Coriander Leaves - 2 tbsp (optional)"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Each line is matched to the ingredient catalog so pantry search works. Mark extras with (optional).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Step-by-Step Instructions (One step per line)
              </label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="1. Toast sourdough until crisp.&#10;2. Mash ripe avocado with sea salt.&#10;3. Top with poached egg."
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={saving}>
                {editingRecipe ? 'Update Recipe' : 'Add Recipe'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(recipeToDelete)}
        onClose={() => setRecipeToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Recipe Entry"
        message={`Are you sure you want to permanently delete "${recipeToDelete?.title || recipeToDelete?.name}"?`}
      />
    </div>
  );
};

export default Recipes;
