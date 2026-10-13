import api from './api';
import { mockRecipes } from '../utils/mockData';

export const recipeService = {
  getRecipes: async (params = {}) => {
    try {
      const response = await api.get('/recipes', { params });
      const data = response.data?.data ?? response.data;
      return Array.isArray(data) ? data : (data?.data || []);
    } catch (error) {
      if (error.isNetworkError) {
        let list = [...mockRecipes];
        if (params.meal_type) {
          list = list.filter((r) => r.meal_type.toLowerCase() === params.meal_type.toLowerCase());
        }
        if (params.diet_type && params.diet_type !== 'None') {
          list = list.filter((r) => r.diet_type.toLowerCase() === params.diet_type.toLowerCase());
        }
        if (params.search) {
          const q = params.search.toLowerCase();
          list = list.filter((r) => r.title.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
        }
        return list;
      }
      throw error;
    }
  },

  getRecipeById: async (recipeId) => {
    try {
      const response = await api.get(`/recipes/${recipeId}`);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error.isNetworkError) {
        const recipe = mockRecipes.find((r) => r.id === Number(recipeId)) || mockRecipes[0];
        return recipe;
      }
      throw error;
    }
  },
};

export default recipeService;
