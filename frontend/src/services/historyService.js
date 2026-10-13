import api from './api';
import { mockMealHistory } from '../utils/mockData';

export const historyService = {
  getHistory: async (params = {}) => {
    try {
      const response = await api.get('/history', { params });
      const data = response.data?.data ?? response.data;
      const list = Array.isArray(data) ? data : (data?.data || []);

      return list.map((item) => {
        const recipe = item.recipe || null;
        const food = item.food || null;
        return {
          id: item.id,
          date: item.consumed_at ? item.consumed_at.split('T')[0] : new Date().toISOString().split('T')[0],
          meal_type: item.meal_type || 'Meal',
          recipe_id: item.recipe_id ?? recipe?.id ?? null,
          food_name: recipe?.name || food?.name || item.food_name || 'Logged Meal',
          calories: recipe?.calories ?? food?.nutrition?.calories ?? item.calories ?? null,
          protein: recipe?.protein ?? food?.nutrition?.protein ?? item.protein ?? null,
          carbohydrates: recipe?.carbohydrates ?? food?.nutrition?.carbohydrates ?? item.carbohydrates ?? null,
          fat: recipe?.fat ?? food?.nutrition?.fat ?? item.fat ?? null,
          confidence: item.confidence ?? null,
          feedback: item.feedback === 'positive' ? 'Good' : item.feedback === 'negative' ? 'Not Suitable' : (item.feedback || null),
          image: recipe?.image_url || food?.image_url || item.image || null,
          notes: item.notes || null,
        };
      });
    } catch (error) {
      if (error.isNetworkError) {
        let list = [...mockMealHistory];
        if (params.meal_type && params.meal_type !== 'All') {
          list = list.filter((item) => item.meal_type.toLowerCase() === params.meal_type.toLowerCase());
        }
        if (params.search) {
          const q = params.search.toLowerCase();
          list = list.filter((item) => item.food_name.toLowerCase().includes(q));
        }
        return list;
      }
      throw error;
    }
  },

  logMeal: async (mealData) => {
    try {
      const response = await api.post('/history', mealData);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error.isNetworkError) {
        return {
          id: Date.now(),
          ...mealData,
          message: 'Meal logged successfully',
        };
      }
      throw error;
    }
  },

  submitFeedback: async (feedbackPayload) => {
    try {
      const response = await api.post('/history/feedback', {
        history_id: feedbackPayload.meal_id || feedbackPayload.history_id,
        meal_id: feedbackPayload.meal_id || feedbackPayload.history_id,
        feedback: feedbackPayload.feedback,
        rating: feedbackPayload.rating || (feedbackPayload.feedback === 'Good' ? 5 : 2),
      });
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error.isNetworkError) {
        return {
          status: 'success',
          message: 'Feedback recorded successfully',
          meal_id: feedbackPayload.meal_id,
          feedback: feedbackPayload.feedback,
        };
      }
      throw error;
    }
  },
};

export default historyService;
