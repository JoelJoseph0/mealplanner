import api from './api';
import { mockFoods } from '../utils/mockData';

export const nutritionService = {
  getNutrition: async (foodId) => {
    try {
      const response = await api.get(`/nutrition/${foodId}`);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error.isNetworkError) {
        const food = mockFoods.find((f) => f.id === Number(foodId)) || mockFoods[0];
        return {
          food_id: food.id,
          food_name: food.name,
          category: food.category,
          serving_size: food.serving_size,
          calories: food.calories,
          protein: food.protein,
          carbohydrates: food.carbohydrates,
          fat: food.fat,
          fiber: food.fiber,
          sugar: food.sugar,
          micronutrients: {
            sodium_mg: 480,
            potassium_mg: 350,
            calcium_percent: 8,
            iron_percent: 15,
            vitamin_c_percent: 12,
          },
        };
      }
      throw error;
    }
  },
};

export default nutritionService;
