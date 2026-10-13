import api from './api';
import { mockUsers } from '../utils/mockData';

export const adminService = {
  getDashboard: async () => {
    const response = await api.get('/admin/dashboard');
    const data = response.data?.data ?? response.data;
    const statistics = data?.statistics || {};
    return {
      stats: {
        total_users: statistics.total_users ?? 0,
        active_users: statistics.active_users ?? 0,
        total_foods: statistics.total_foods ?? 0,
        total_recipes: statistics.total_recipes ?? 0,
        total_recognitions: statistics.total_recognitions ?? 0,
        total_meal_plans: statistics.total_meal_plans ?? 0,
        total_pantry_items: statistics.total_pantry_items ?? 0,
        users_with_pantry: statistics.users_with_pantry ?? 0,
        avg_recognition_confidence: statistics.avg_recognition_confidence ?? 0,
      },
      top_recognized_foods: data?.top_recognized_foods || [],
      top_pantry_ingredients: data?.top_pantry_ingredients || [],
      recent_activity: data?.recent_activity || [],
      model: data?.model || null,
    };
  },

  getUsers: async () => {
    try {
      const response = await api.get('/admin/users');
      const data = response.data?.data ?? response.data;
      return Array.isArray(data) ? data : (data?.data || []);
    } catch (error) {
      if (error.isNetworkError) {
        return mockUsers;
      }
      throw error;
    }
  },

  deleteUser: async (userId) => {
    try {
      const response = await api.delete(`/admin/users/${userId}`);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error.isNetworkError) {
        return { message: `User ${userId} deleted successfully` };
      }
      throw error;
    }
  },

  addFood: async (foodData) => {
    try {
      const response = await api.post('/admin/foods', foodData);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error.isNetworkError) {
        return { id: Date.now(), ...foodData, message: 'Food item added successfully' };
      }
      throw error;
    }
  },

  updateFood: async (foodId, foodData) => {
    try {
      const response = await api.put(`/admin/foods/${foodId}`, foodData);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error.isNetworkError) {
        return { id: foodId, ...foodData, message: 'Food item updated' };
      }
      throw error;
    }
  },

  deleteFood: async (foodId) => {
    try {
      const response = await api.delete(`/admin/foods/${foodId}`);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error.isNetworkError) {
        return { message: `Food ${foodId} deleted` };
      }
      throw error;
    }
  },

  addRecipe: async (recipeData) => {
    try {
      const response = await api.post('/admin/recipes', recipeData);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error.isNetworkError) {
        return { id: Date.now(), ...recipeData, message: 'Recipe added successfully' };
      }
      throw error;
    }
  },

  updateRecipe: async (recipeId, recipeData) => {
    try {
      const response = await api.put(`/admin/recipes/${recipeId}`, recipeData);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error.isNetworkError) {
        return { id: recipeId, ...recipeData, message: 'Recipe updated' };
      }
      throw error;
    }
  },

  deleteRecipe: async (recipeId) => {
    try {
      const response = await api.delete(`/admin/recipes/${recipeId}`);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error.isNetworkError) {
        return { message: `Recipe ${recipeId} deleted` };
      }
      throw error;
    }
  },

  addNutrition: async (nutritionData) => {
    try {
      const response = await api.post('/admin/nutrition', nutritionData);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error.isNetworkError) {
        return { id: Date.now(), ...nutritionData, message: 'Nutrition record created' };
      }
      throw error;
    }
  },

  updateNutrition: async (nutritionId, nutritionData) => {
    try {
      const response = await api.put(`/admin/nutrition/${nutritionId}`, nutritionData);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error.isNetworkError) {
        return { id: nutritionId, ...nutritionData, message: 'Nutrition record updated' };
      }
      throw error;
    }
  },

  deleteNutrition: async (nutritionId) => {
    try {
      const response = await api.delete(`/admin/nutrition/${nutritionId}`);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error.isNetworkError) {
        return { message: `Nutrition record ${nutritionId} deleted` };
      }
      throw error;
    }
  },

  getReports: async () => {
    const response = await api.get('/admin/reports');
    return response.data?.data ?? response.data;
  },
};

export default adminService;
