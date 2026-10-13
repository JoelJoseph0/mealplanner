import { useState, useEffect } from 'react';
import { Activity, Plus, Edit2, Trash2, Search, Flame } from 'lucide-react';
import foodService from '../../services/foodService';
import adminService from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import SearchBar from '../../components/common/SearchBar';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

export const Nutrition = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formError, setFormError] = useState(null);

  // Add / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    food_name: '',
    serving_size: '100g',
    calories: 200,
    protein: 15,
    carbohydrates: 20,
    fat: 5,
    fiber: 3,
    sugar: 2,
  });

  // Delete dialog
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchNutritionItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await foodService.getAllFoods({ limit: 500 });
      // Map food items to nutrition-focused list
      const nutritionList = (data || []).map((f) => ({
        id: f.nutrition?.id ?? null,
        food_id: f.id,
        food_name: f.name,
        serving_size: f.nutrition?.serving_size || '100g',
        calories: f.nutrition?.calories ?? 0,
        protein: f.nutrition?.protein ?? 0,
        carbohydrates: f.nutrition?.carbohydrates ?? 0,
        fat: f.nutrition?.fat ?? 0,
        fiber: f.nutrition?.fiber ?? 0,
        sugar: f.nutrition?.sugar ?? 0,
      }));
      setItems(nutritionList);
    } catch (err) {
      setError('Unable to load nutrition dataset.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNutritionItems();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setFormError(null);
    setFormData({
      food_name: '',
      serving_size: '100g',
      calories: 200,
      protein: 15,
      carbohydrates: 20,
      fat: 5,
      fiber: 3,
      sugar: 2,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormError(null);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError(null);
    const payload = {
      serving_size: formData.serving_size,
      calories: Number(formData.calories),
      protein: Number(formData.protein),
      carbohydrates: Number(formData.carbohydrates),
      fat: Number(formData.fat),
      fiber: Number(formData.fiber),
      sugar: Number(formData.sugar),
    };
    try {
      if (editingItem?.id) {
        await adminService.updateNutrition(editingItem.id, payload);
      } else {
        const target =
          editingItem ||
          items.find((it) => it.food_name.toLowerCase() === (formData.food_name || '').trim().toLowerCase());
        if (!target) {
          setFormError(`"${formData.food_name}" is not in the ingredient catalog. Add it on the Ingredients page first.`);
          return;
        }
        await adminService.addNutrition({ food_id: target.food_id, ...payload });
      }
      setIsModalOpen(false);
      await fetchNutritionItems();
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.id) {
        await adminService.deleteNutrition(itemToDelete.id);
      }
      setItemToDelete(null);
      await fetchNutritionItems();
    } catch (err) {
      setError(getErrorMessage(err));
      setItemToDelete(null);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage message="Loading nutritional database entries..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchNutritionItems} />;
  }

  const filteredItems = items.filter((it) =>
    it.food_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Nutrition Database
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Nutritional Values Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Maintain caloric standards, macronutrient splits, and fiber-sugar ratios for all ingredients.
          </p>
        </div>

        <Button variant="primary" size="sm" icon={Plus} onClick={openAddModal}>
          Add Nutrition Data
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search nutrition table by ingredient..."
        />
      </div>

      {/* Nutrition Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4">Ingredient</th>
                <th className="px-5 py-4">Serving</th>
                <th className="px-5 py-4">Calories</th>
                <th className="px-5 py-4">Protein</th>
                <th className="px-5 py-4">Carbs</th>
                <th className="px-5 py-4">Fat</th>
                <th className="px-5 py-4">Fiber</th>
                <th className="px-5 py-4">Sugar</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((it) => (
                <tr key={it.food_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-900">{it.food_name}</td>
                  <td className="px-5 py-4 text-slate-500">{it.serving_size}</td>
                  <td className="px-5 py-4 font-bold text-emerald-700">{it.calories} kcal</td>
                  <td className="px-5 py-4 font-semibold text-blue-700">{it.protein}g</td>
                  <td className="px-5 py-4 font-semibold text-amber-700">{it.carbohydrates}g</td>
                  <td className="px-5 py-4 font-semibold text-purple-700">{it.fat}g</td>
                  <td className="px-5 py-4 text-slate-600">{it.fiber}g</td>
                  <td className="px-5 py-4 text-slate-600">{it.sugar}g</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(it)}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Nutrition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemToDelete(it)}
                        className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Record"
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

      {/* Add / Edit Nutrition Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingItem ? 'Edit Nutrition Record' : 'Add New Nutrition Record'}
        >
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {formError}
              </div>
            )}
            <Input
              label="Ingredient Name"
              value={formData.food_name}
              onChange={(e) => setFormData({ ...formData, food_name: e.target.value })}
              placeholder="e.g. Rolled Oats"
              disabled={Boolean(editingItem)}
              required
            />

            <Input
              label="Serving Size"
              value={formData.serving_size}
              onChange={(e) => setFormData({ ...formData, serving_size: e.target.value })}
              placeholder="e.g. 100g or 1 cup"
              required
            />

            <div className="grid grid-cols-2 gap-3">
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
                label="Carbohydrates (g)"
                type="number"
                value={formData.carbohydrates}
                onChange={(e) => setFormData({ ...formData, carbohydrates: Number(e.target.value) })}
                required
              />

              <Input
                label="Total Fat (g)"
                type="number"
                value={formData.fat}
                onChange={(e) => setFormData({ ...formData, fat: Number(e.target.value) })}
                required
              />

              <Input
                label="Dietary Fiber (g)"
                type="number"
                value={formData.fiber}
                onChange={(e) => setFormData({ ...formData, fiber: Number(e.target.value) })}
                required
              />

              <Input
                label="Sugars (g)"
                type="number"
                value={formData.sugar}
                onChange={(e) => setFormData({ ...formData, sugar: Number(e.target.value) })}
                required
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                {editingItem ? 'Save Updates' : 'Save Nutrition Data'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Nutrition Entry"
        message={`Are you sure you want to delete nutrition records for "${itemToDelete?.food_name}"?`}
      />
    </div>
  );
};

export default Nutrition;
