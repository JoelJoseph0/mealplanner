import api from './api';

const unwrap = (response) => response.data?.data ?? response.data;

export const pantryService = {
  getPantry: async () => {
    const response = await api.get('/pantry');
    const data = unwrap(response);
    return Array.isArray(data) ? data : [];
  },

  addItems: async ({ names = [], items = [] } = {}) => {
    const response = await api.post('/pantry', { names, items });
    return unwrap(response);
  },

  updateItem: async (itemId, changes) => {
    const response = await api.put(`/pantry/${itemId}`, changes);
    return unwrap(response);
  },

  removeItem: async (itemId) => {
    const response = await api.delete(`/pantry/${itemId}`);
    return unwrap(response);
  },

  clearPantry: async () => {
    const response = await api.delete('/pantry');
    return unwrap(response);
  },

  suggestRecipes: async (options = {}) => {
    const payload = {
      ingredients: options.ingredients && options.ingredients.length ? options.ingredients : null,
      use_saved_pantry: Boolean(options.useSavedPantry),
      meal_type: options.mealType && options.mealType !== 'All' ? options.mealType : null,
      max_missing: options.maxMissing ?? 2,
      assume_staples: options.assumeStaples ?? true,
      apply_profile: options.applyProfile ?? true,
      limit: options.limit || 30,
    };
    const response = await api.post('/pantry/suggest', payload);
    return unwrap(response);
  },

  searchIngredients: async (search, limit = 8) => {
    const response = await api.get('/ingredients', { params: { search, limit } });
    const data = unwrap(response);
    return Array.isArray(data) ? data : [];
  },

  getCategories: async () => {
    const response = await api.get('/ingredients/categories');
    const data = unwrap(response);
    return Array.isArray(data) ? data : [];
  },
};

export default pantryService;
