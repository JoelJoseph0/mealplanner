import api from './api';

const ACTIVITY_LABELS = {
  sedentary: 'Sedentary',
  light: 'Lightly Active',
  moderate: 'Moderately Active',
  active: 'Very Active',
  very_active: 'Extra Active',
};

const toActivityLabel = (value) => {
  if (!value) return 'Moderately Active';
  return ACTIVITY_LABELS[String(value).toLowerCase()] || value;
};

const toGenderLabel = (value) => {
  if (!value) return '';
  const text = String(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const flattenProfile = (user) => {
  if (!user) return user;
  const dietary = user.dietary_profile || {};
  return {
    ...user,
    gender: toGenderLabel(user.gender),
    height: user.height ?? dietary.height ?? '',
    weight: user.weight ?? dietary.weight ?? '',
    activity_level: toActivityLabel(user.activity_level ?? dietary.activity_level),
  };
};

export const userService = {
  getProfile: async () => {
    try {
      const response = await api.get('/users/profile');
      return flattenProfile(response.data?.data ?? response.data);
    } catch (error) {
      if (error.isNetworkError) {
        return {
          id: 1,
          full_name: 'Abhijith',
          email: 'abhijith@example.com',
          age: 23,
          gender: 'Male',
          height: 175,
          weight: 70,
          activity_level: 'Moderately Active',
        };
      }
      throw error;
    }
  },

  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/users/profile', profileData);
      return flattenProfile(response.data?.data ?? response.data);
    } catch (error) {
      if (error.isNetworkError) {
        return {
          message: 'Profile updated successfully',
          ...profileData,
        };
      }
      throw error;
    }
  },

  getPreferences: async () => {
    try {
      const response = await api.get('/users/preferences');
      const data = response.data?.data ?? response.data;
      return data ? { ...data, avoid_foods: data.avoided_foods ?? data.avoid_foods ?? [] } : data;
    } catch (error) {
      if (error.isNetworkError) {
        return {
          diet_type: 'Non-Vegetarian',
          allergies: ['Peanut'],
          preferred_foods: ['Grilled Salmon', 'Brown Rice', 'Greek Salad', 'Chicken Tikka'],
          avoid_foods: ['Excessive Sugar', 'Deep-fried snacks', 'Palm Oil'],
          daily_calories: 2200,
          protein_target: 130,
          carbohydrate_target: 250,
          fat_target: 65,
        };
      }
      throw error;
    }
  },

  updatePreferences: async (preferencesData) => {
    try {
      const { avoid_foods: avoidFoods, ...rest } = preferencesData;
      const payload = { ...rest, avoided_foods: rest.avoided_foods ?? avoidFoods ?? [] };
      const response = await api.put('/users/preferences', payload);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error.isNetworkError) {
        return {
          message: 'Dietary preferences updated successfully',
          ...preferencesData,
        };
      }
      throw error;
    }
  },
};

export default userService;
