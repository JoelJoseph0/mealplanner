import { useState, useEffect } from 'react';
import { Carrot, Plus, Edit2, Trash2 } from 'lucide-react';
import foodService from '../../services/foodService';
import adminService from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import { INGREDIENT_CATEGORIES } from '../../utils/constants';
import SearchBar from '../../components/common/SearchBar';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const EMPTY_FORM = {
  name: '',
  category: 'Vegetables',
  description: '',
  aliases: '',
  substitutes: '',
  is_staple: false,
};

const toList = (text) =>
  text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const Ingredients = () => {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const fetchIngredients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await foodService.getAllFoods({ limit: 500 });
      setIngredients(data || []);
    } catch {
      setError('Unable to load the ingredient catalog from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  const openAddModal = () => {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditing(item);
    setFormData({
      name: item.name,
      category: item.category || 'Others',
      description: item.description || '',
      aliases: (item.aliases || []).join(', '),
      substitutes: (item.substitutes || []).join(', '),
      is_staple: Boolean(item.is_staple),
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      description: formData.description || null,
      aliases: toList(formData.aliases),
      substitutes: toList(formData.substitutes),
      is_staple: formData.is_staple,
    };
    try {
      if (editing) {
        const updated = await adminService.updateFood(editing.id, payload);
        setIngredients((list) => list.map((f) => (f.id === editing.id ? { ...f, ...updated } : f)));
      } else {
        const created = await adminService.addFood(payload);
        setIngredients((list) => [...list, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setIsModalOpen(false);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await adminService.deleteFood(toDelete.id);
      setIngredients((list) => list.filter((f) => f.id !== toDelete.id));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setToDelete(null);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage message="Loading ingredient catalog..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchIngredients} />;
  }

  const query = searchQuery.toLowerCase();
  const filtered = ingredients.filter((f) => {
    const matchesSearch =
      f.name?.toLowerCase().includes(query) ||
      (f.aliases || []).some((a) => a.toLowerCase().includes(query));
    const matchesCategory = selectedCategory === 'All' || f.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Catalog Management</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">Ingredient Catalog</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Ingredients users can add to their pantry. Aliases let people type local names (e.g. thakkali for tomato);
            substitutes are suggested when a recipe item is missing; kitchen basics are never counted as missing.
          </p>
        </div>
        <Button variant="primary" size="sm" icon={Plus} onClick={openAddModal}>
          Add Ingredient
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by name or alias..."
          className="flex-1"
        />
        <div className="w-full sm:w-64">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full text-xs font-semibold px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Categories</option>
            {INGREDIENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 text-xs text-slate-500 font-semibold">
          Showing {filtered.length} of {ingredients.length} ingredients
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Ingredient</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Substitutes</th>
                <th className="px-6 py-4">Per 100g</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Carrot className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          {f.name}
                          {f.is_staple && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold uppercase">
                              Basic
                            </span>
                          )}
                        </span>
                        {f.aliases?.length > 0 && (
                          <span className="text-slate-400 text-[11px] line-clamp-1 max-w-xs">
                            Also: {f.aliases.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700">{f.category}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{(f.substitutes || []).join(', ') || '-'}</td>
                  <td className="px-6 py-4 text-emerald-700 font-bold">
                    {f.nutrition ? `${f.nutrition.calories} kcal` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(f)}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Ingredient"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setToDelete(f)}
                        className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Ingredient"
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

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editing ? 'Edit Ingredient' : 'Add Ingredient'}
        >
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">{formError}</div>
            )}
            <Input
              label="Ingredient Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Tomato"
              required
            />
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={INGREDIENT_CATEGORIES}
              placeholder=""
              required
            />
            <Input
              label="Aliases (comma separated)"
              value={formData.aliases}
              onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
              placeholder="e.g. tomatoes, thakkali, tamatar"
            />
            <Input
              label="Substitutes (comma separated ingredient names)"
              value={formData.substitutes}
              onChange={(e) => setFormData({ ...formData, substitutes: e.target.value })}
              placeholder="e.g. Lime"
            />
            <label className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={formData.is_staple}
                onChange={(e) => setFormData({ ...formData, is_staple: e.target.checked })}
                className="mt-0.5 accent-emerald-600"
              />
              <span>
                <span className="font-bold text-slate-700 block">Kitchen basic</span>
                <span className="text-slate-500">Assume every user has it (salt, oil, water, common spices).</span>
              </span>
            </label>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Optional notes about the ingredient..."
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary" size="sm" loading={saving}>
                {editing ? 'Save Changes' : 'Create Ingredient'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Ingredient"
        message={`Remove "${toDelete?.name}" from the catalog? It will also disappear from recipes and pantries that use it.`}
      />
    </div>
  );
};

export default Ingredients;
