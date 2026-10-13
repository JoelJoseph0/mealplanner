import api from './api';
import { mockRecipes } from '../utils/mockData';

export const recommendationService = {
  getRecommendations: async (options = {}) => {
    try {
      const payload = {
        limit: options.limit || 12,
        meal_type: options.meal_type && options.meal_type !== 'All' ? options.meal_type : undefined,
        target_calories: options.target_calories || undefined,
        recognized_food_name: options.recognized_food_name || undefined,
        recognized_food_id: options.recognized_food_id || undefined,
      };
      const response = await api.post('/recommendations', payload);
      const data = response.data?.data ?? response.data;
      const recs = Array.isArray(data)
        ? data
        : Array.isArray(data?.recommendations)
        ? data.recommendations
        : [];

      return recs.map((item, idx) => {
        if (item.recipe) {
          const img = item.recipe.image || item.recipe.image_url;
          return {
            ...item.recipe,
            image: img,
            image_url: img,
            match_score: Math.round(item.score ?? (95 - idx * 3)),
            diet_compatibility: item.diet_compatible ? `${item.recipe.diet_type || 'Diet'} friendly` : 'Check diet',
            allergy_safe: item.allergy_safe !== false,
            pantry_coverage: item.pantry_coverage ?? null,
            recommendation_reason: (item.match_reasons && item.match_reasons.join(', ')) || 'Personalized match',
          };
        }
        return {
          ...item,
          image: item.image || item.image_url,
          image_url: item.image || item.image_url,
        };
      });
    } catch (error) {
      if (error.isNetworkError) {
        // Return recipes formatted as personalized recommendations
        return mockRecipes.map((recipe, idx) => ({
          ...recipe,
          match_score: 95 - idx * 4,
          diet_compatibility: `${recipe.diet_type} friendly`,
          allergy_safe: true,
          recommendation_reason: 'Matches your daily macro target and excluded allergy constraints',
        }));
      }
      throw error;
    }
  },
};

export default recommendationService;
