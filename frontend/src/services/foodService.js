import api from './api';
import { mockFoods } from '../utils/mockData';

export const foodService = {
  getAllFoods: async (params = {}) => {
    try {
      const response = await api.get('/foods', { params });
      const data = response.data?.data ?? response.data;
      return Array.isArray(data) ? data : (data?.data || []);
    } catch (error) {
      if (error.isNetworkError) {
        let list = [...mockFoods];
        if (params.category && params.category !== 'All') {
          list = list.filter((f) => f.category === params.category);
        }
        if (params.search) {
          const q = params.search.toLowerCase();
          list = list.filter((f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q));
        }
        return list;
      }
      throw error;
    }
  },

  getFoodById: async (id) => {
    try {
      const response = await api.get(`/foods/${id}`);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error.isNetworkError) {
        return mockFoods.find((f) => f.id === Number(id)) || mockFoods[0];
      }
      throw error;
    }
  },
};

export default foodService;
