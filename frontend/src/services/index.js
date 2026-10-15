import api, { unwrap } from './api';

const asList = (data) => (Array.isArray(data) ? data : []);

export const authService = {
  login: async (credentials) => unwrap(await api.post('/auth/login', credentials)),
  register: async (payload) => unwrap(await api.post('/auth/register', payload)),
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      return null;
    }
    return null;
  },
};

const ACTIVITY_LABELS = {
  sedentary: 'Sedentary',
  light: 'Lightly Active',
  moderate: 'Moderately Active',
  active: 'Very Active',
  very_active: 'Extra Active',
};

const flattenProfile = (user) => {
  if (!user) return user;
  const dietary = user.dietary_profile || {};
  const gender = user.gender ? String(user.gender) : '';
  const activity = user.activity_level ?? dietary.activity_level;
  return {
    ...user,
    gender: gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : '',
    height: user.height ?? dietary.height ?? '',
    weight: user.weight ?? dietary.weight ?? '',
    activity_level: ACTIVITY_LABELS[String(activity || '').toLowerCase()] || activity || 'Moderately Active',
  };
};

export const userService = {
  getProfile: async () => flattenProfile(unwrap(await api.get('/users/profile'))),
  updateProfile: async (payload) => flattenProfile(unwrap(await api.put('/users/profile', payload))),
  getPreferences: async () => {
    const data = unwrap(await api.get('/users/preferences'));
    return { ...data, avoid_foods: data.avoided_foods ?? [] };
  },
  updatePreferences: async ({ avoid_foods: avoidFoods, ...rest }) =>
    unwrap(await api.put('/users/preferences', { ...rest, avoided_foods: rest.avoided_foods ?? avoidFoods ?? [] })),
  changePassword: async (currentPassword, newPassword) =>
    unwrap(await api.post('/users/change-password', { current_password: currentPassword, new_password: newPassword })),
  getReminders: async () => unwrap(await api.get('/users/reminders')),
  saveReminders: async (settings) => unwrap(await api.put('/users/reminders', settings)),
};

export const pantryService = {
  list: async () => asList(unwrap(await api.get('/pantry'))),
  add: async ({ names = [], items = [] }) => unwrap(await api.post('/pantry', { names, items })),
  update: async (id, changes) => unwrap(await api.put(`/pantry/${id}`, changes)),
  remove: async (id) => unwrap(await api.delete(`/pantry/${id}`)),
  clear: async () => unwrap(await api.delete('/pantry')),
  consume: async (recipeId, foodIds) => unwrap(await api.post('/pantry/consume', { recipe_id: recipeId, food_ids: foodIds })),
  suggest: async ({ ingredients, mealType, maxMissing = 2, assumeStaples = true, applyProfile = true, limit = 60 } = {}) =>
    unwrap(
      await api.post('/pantry/suggest', {
        ingredients: ingredients && ingredients.length ? ingredients : null,
        meal_type: mealType && mealType !== 'All' ? mealType : null,
        max_missing: maxMissing,
        assume_staples: assumeStaples,
        apply_profile: applyProfile,
        limit,
      })
    ),
};

export const ingredientService = {
  search: async (search, limit = 8) => asList(unwrap(await api.get('/ingredients', { params: { search, limit } }))),
  categories: async () => asList(unwrap(await api.get('/ingredients/categories'))),
};

export const shoppingService = {
  list: async () => asList(unwrap(await api.get('/shopping'))),
  add: async (names, quantity) => unwrap(await api.post('/shopping', { names, quantity })),
  fromRecipe: async (recipeId) => unwrap(await api.post('/shopping/from-recipe', { recipe_id: recipeId })),
  fromPlan: async (startDate, days = 7) =>
    unwrap(await api.post('/shopping/from-plan', { start_date: startDate, days })),
  update: async (id, changes) => unwrap(await api.put(`/shopping/${id}`, changes)),
  remove: async (id) => unwrap(await api.delete(`/shopping/${id}`)),
  clear: async (checkedOnly = false) => unwrap(await api.delete('/shopping', { params: { checked_only: checkedOnly } })),
  checkout: async () => unwrap(await api.post('/shopping/checkout')),
};

export const recipeService = {
  list: async (params = {}) => asList(unwrap(await api.get('/recipes', { params: { limit: 300, ...params } }))),
  get: async (id) => unwrap(await api.get(`/recipes/${id}`)),
  ratings: async () => unwrap(await api.get('/recipes/ratings')) || {},
  rate: async (id, feedback) => unwrap(await api.put(`/recipes/${id}/rating`, { feedback })),
};

export const planService = {
  daily: async (date) => unwrap(await api.get('/meal-plans/daily', { params: { target_date: date } })),
  weekly: async (startDate) => unwrap(await api.get('/meal-plans/weekly', { params: { start_date: startDate } })),
  generateDay: async (date, { usePantry = false, force = true } = {}) =>
    unwrap(await api.post('/meal-plans/generate', { plan_date: date, force_regenerate: force, use_pantry: usePantry })),
  generateWeek: async (startDate, { usePantry = false, force = true } = {}) =>
    unwrap(await api.post('/meal-plans/generate-week', { start_date: startDate, force_regenerate: force, use_pantry: usePantry })),
  swap: async (planId, usePantry = false) => unwrap(await api.post(`/meal-plans/${planId}/swap`, { use_pantry: usePantry })),
  lock: async (planId, locked) => unwrap(await api.put(`/meal-plans/${planId}/lock`, { locked })),
  complete: async (planId, completed) => unwrap(await api.put(`/meal-plans/${planId}/complete`, { completed })),
  skip: async (planId, skipped) => unwrap(await api.put(`/meal-plans/${planId}/skip`, { skipped })),
};

export const historyService = {
  list: async (params = {}) => asList(unwrap(await api.get('/history', { params: { limit: 100, ...params } }))),
  log: async (payload) => unwrap(await api.post('/history', payload)),
  feedback: async (historyId, feedback) =>
    unwrap(await api.post('/history/feedback', { history_id: historyId, feedback })),
  viewed: async (recipeId) => unwrap(await api.post('/history/viewed', { recipe_id: recipeId })),
  insights: async (days = 14) => unwrap(await api.get('/history/insights', { params: { days } })),
};

export const recognitionService = {
  predict: async (file, { addToPantry = false, onProgress } = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('add_to_pantry', addToPantry ? 'true' : 'false');
    return unwrap(
      await api.post('/recognition/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: onProgress,
        timeout: 60000,
      })
    );
  },
  history: async () => asList(unwrap(await api.get('/recognition/history'))),
  remove: async (id) => unwrap(await api.delete(`/recognition/${id}`)),
  clear: async () => unwrap(await api.delete('/recognition/history')),
};

export const nutritionService = {
  get: async (foodId) => unwrap(await api.get(`/nutrition/${foodId}`)),
};

export const adminService = {
  dashboard: async () => unwrap(await api.get('/admin/dashboard')),
  reports: async () => unwrap(await api.get('/admin/reports')),
  users: async () => asList(unwrap(await api.get('/admin/users', { params: { limit: 100 } }))),
  deleteUser: async (id) => unwrap(await api.delete(`/admin/users/${id}`)),
  updateUser: async (id, changes) => unwrap(await api.put(`/admin/users/${id}`, changes)),
  categories: async () => asList(unwrap(await api.get('/admin/categories'))),
  renameCategory: async (name, newName) => unwrap(await api.put('/admin/categories', { name, new_name: newName })),
  modelEvaluation: async () => unwrap(await api.get('/admin/model-evaluation')),
  ingredients: async () => asList(unwrap(await api.get('/foods', { params: { limit: 500 } }))),
  createIngredient: async (payload) => unwrap(await api.post('/admin/foods', payload)),
  updateIngredient: async (id, payload) => unwrap(await api.put(`/admin/foods/${id}`, payload)),
  deleteIngredient: async (id) => unwrap(await api.delete(`/admin/foods/${id}`)),
  createRecipe: async (payload) => unwrap(await api.post('/admin/recipes', payload)),
  updateRecipe: async (id, payload) => unwrap(await api.put(`/admin/recipes/${id}`, payload)),
  deleteRecipe: async (id) => unwrap(await api.delete(`/admin/recipes/${id}`)),
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return unwrap(await api.post('/admin/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }));
  },
};

export const assistantService = {
  status: async (warm = false) => unwrap(await api.get('/assistant/status', { params: { warm } })),
  guide: async (recipeId) => unwrap(await api.get(`/assistant/recipes/${recipeId}/guide`)),
  prime: async (recipeId) => unwrap(await api.post(`/assistant/recipes/${recipeId}/prime`)),
  clearGuide: async (recipeId) => unwrap(await api.delete(`/assistant/recipes/${recipeId}/guide`)),
};
