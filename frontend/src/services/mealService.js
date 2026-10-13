import api from './api';
import { mockRecipes, mockFoods } from '../utils/mockData';
import { getUserTimeZone } from '../utils/helpers';

const getLocalCalendarDate = (dateObj = new Date()) => {
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const mealService = {
  getDailyPlan: async (date) => {
    try {
      const clientDate = date || getLocalCalendarDate();
      const tz = getUserTimeZone();
      const response = await api.get('/meal-plans/daily', {
        params: {
          target_date: clientDate,
          date: clientDate,
          timezone: tz,
        },
      });
      const data = response.data?.data ?? response.data;

      let meals = [];
      if (Array.isArray(data.meals_list)) {
        meals = data.meals_list.map((item) => ({
          id: item.id,
          meal_type: item.meal_type,
          meal_time: item.meal_time || '12:00 PM',
          food_name: item.food_name || item.recipe?.name || item.meal_type,
          recipe_id: item.recipe_id || item.recipe?.id,
          image: item.image || item.recipe?.image_url,
          calories: Math.round(item.calories ?? item.recipe?.calories ?? 0),
          protein: Math.round(item.protein ?? item.recipe?.protein ?? 0),
          carbohydrates: Math.round(item.carbohydrates ?? item.recipe?.carbohydrates ?? 0),
          fat: Math.round(item.fat ?? item.recipe?.fat ?? 0),
          completed: Boolean(item.completed),
          recipe: item.recipe,
        }));
      } else if (Array.isArray(data.meals)) {
        meals = data.meals;
      } else if (data.meals && typeof data.meals === 'object') {
        meals = Object.entries(data.meals)
          .filter(([_, item]) => item !== null)
          .map(([slot, item]) => ({
            id: item.id || slot,
            meal_type: item.meal_type || slot.charAt(0).toUpperCase() + slot.slice(1),
            meal_time: item.meal_time || (slot === 'breakfast' ? '08:30 AM' : slot === 'lunch' ? '01:30 PM' : '08:00 PM'),
            food_name: item.food_name || item.recipe?.name || slot,
            recipe_id: item.recipe_id || item.recipe?.id,
            image: item.image || item.recipe?.image_url,
            calories: Math.round(item.calories ?? item.recipe?.calories ?? 0),
            protein: Math.round(item.protein ?? item.recipe?.protein ?? 0),
            carbohydrates: Math.round(item.carbohydrates ?? item.recipe?.carbohydrates ?? 0),
            fat: Math.round(item.fat ?? item.recipe?.fat ?? 0),
            completed: Boolean(item.completed),
            recipe: item.recipe,
          }));
      }

      return {
        date: data.date || clientDate,
        totals: data.totals || { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 },
        target: data.target || { calories: 2000, protein: 75, carbohydrates: 250, fat: 65 },
        meals,
      };
    } catch (error) {
      if (error.isNetworkError) {
        return {
          date: date || getLocalCalendarDate(),
          totals: {
            calories: 1980,
            protein: 115,
            carbohydrates: 215,
            fat: 62,
            fiber: 28,
          },
          target: {
            calories: 2000,
            protein: 75,
            carbohydrates: 250,
            fat: 65,
          },
          meals: [
            {
              id: 'm1',
              meal_type: 'Breakfast',
              meal_time: '08:30 AM',
              food_name: 'Traditional Steamed Idli with Coconut Chutney',
              recipe_id: 1,
              calories: 260,
              protein: 8.5,
              carbohydrates: 50,
              fat: 2.5,
              completed: true,
            },
            {
              id: 'm2',
              meal_type: 'Morning Snack',
              meal_time: '11:00 AM',
              food_name: 'Nutrient Green Apple & Banana Smoothie',
              recipe_id: 9,
              calories: 210,
              protein: 4,
              carbohydrates: 44,
              fat: 3.5,
              completed: true,
            },
            {
              id: 'm3',
              meal_type: 'Lunch',
              meal_time: '01:30 PM',
              food_name: 'Whole Wheat Chapati with Vegetable Curry',
              recipe_id: 15,
              calories: 420,
              protein: 12,
              carbohydrates: 72,
              fat: 8.5,
              completed: false,
            },
            {
              id: 'm4',
              meal_type: 'Evening Snack',
              meal_time: '05:00 PM',
              food_name: 'Steamed Sprouted Moong Salad',
              recipe_id: 11,
              calories: 160,
              protein: 10,
              carbohydrates: 26,
              fat: 1.5,
              completed: false,
            },
            {
              id: 'm5',
              meal_type: 'Dinner',
              meal_time: '08:00 PM',
              food_name: 'Comforting Moong Dal Khichdi with Roasted Papad',
              recipe_id: 30,
              calories: 380,
              protein: 14,
              carbohydrates: 64,
              fat: 7,
              completed: false,
            },
          ],
        };
      }
      throw error;
    }
  },

  getWeeklyPlan: async (weekOffset = 0, startDate = null) => {
    try {
      const params = {
        timezone: getUserTimeZone(),
      };
      if (startDate) {
        params.start_date = startDate;
      }
      const response = await api.get('/meal-plans/weekly', { params });
      const data = response.data?.data ?? response.data;

      let days = [];
      if (Array.isArray(data.days)) {
        days = data.days;
      } else if (data.days && typeof data.days === 'object') {
        const availableKeys = Object.keys(data.days);
        // Order keys according to Monday -> Sunday sequence
        const orderedKeys = DAY_ORDER.filter((day) => availableKeys.includes(day));
        const finalKeys = orderedKeys.length === availableKeys.length ? orderedKeys : availableKeys;

        days = finalKeys.map((dayName) => {
          const dayPlan = data.days[dayName];
          let dayMeals = [];

          if (Array.isArray(dayPlan?.meals_list)) {
            dayMeals = dayPlan.meals_list.map((item) => ({
              id: item.id,
              meal_type: item.meal_type,
              food_name: item.food_name || item.recipe?.name,
              recipe_id: item.recipe_id || item.recipe?.id,
              calories: Math.round(item.calories ?? item.recipe?.calories ?? 0),
              protein: Math.round(item.protein ?? item.recipe?.protein ?? 0),
              carbohydrates: Math.round(item.carbohydrates ?? item.recipe?.carbohydrates ?? 0),
              fat: Math.round(item.fat ?? item.recipe?.fat ?? 0),
              image: item.image || item.recipe?.image_url,
              recipe: item.recipe,
            }));
          } else if (dayPlan?.meals && typeof dayPlan.meals === 'object') {
            dayMeals = Object.entries(dayPlan.meals)
              .filter(([_, item]) => item !== null)
              .map(([slot, item]) => ({
                id: item.id || `${dayName}-${slot}`,
                meal_type: item.meal_type || slot.charAt(0).toUpperCase() + slot.slice(1),
                food_name: item.food_name || item.recipe?.name || slot,
                recipe_id: item.recipe_id || item.recipe?.id,
                calories: Math.round(item.calories ?? item.recipe?.calories ?? 0),
                protein: Math.round(item.protein ?? item.recipe?.protein ?? 0),
                carbohydrates: Math.round(item.carbohydrates ?? item.recipe?.carbohydrates ?? 0),
                fat: Math.round(item.fat ?? item.recipe?.fat ?? 0),
                image: item.image || item.recipe?.image_url,
                recipe: item.recipe,
              }));
          }

          const dayTotals = dayPlan?.totals || { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0 };

          return {
            day: dayName,
            date: dayPlan?.date || dayName,
            total_calories: Math.round(dayTotals.calories || 0),
            totals: dayTotals,
            meals: dayMeals,
          };
        });
      }

      const wt = data.weekly_totals || {};
      const calculatedWeeklyTotals = {
        average_daily_calories: Math.round(wt.average_daily_calories ?? (data.weekly_average_calories || 0)),
        average_protein: Math.round(wt.average_protein ?? 0),
        average_carbs: Math.round(wt.average_carbs ?? 0),
        average_fat: Math.round(wt.average_fat ?? 0),
        average_fiber: Math.round(wt.average_fiber ?? 0),
        total_calories: Math.round(wt.total_calories ?? 0),
        total_protein: Math.round(wt.total_protein ?? 0),
        total_carbs: Math.round(wt.total_carbs ?? 0),
        total_fat: Math.round(wt.total_fat ?? 0),
      };

      return {
        week_offset: weekOffset,
        start_date: data.start_date,
        end_date: data.end_date,
        weekly_totals: calculatedWeeklyTotals,
        days,
      };
    } catch (error) {
      if (error.isNetworkError) {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const mealsConfig = [
          { type: 'Breakfast', food: 'Traditional Steamed Idli with Coconut Chutney', cal: 260, p: 8.5, c: 50, f: 2.5, recipeId: 1 },
          { type: 'Morning Snack', food: 'Nutrient Green Apple & Banana Smoothie', cal: 210, p: 4, c: 44, f: 3.5, recipeId: 9 },
          { type: 'Lunch', food: 'Whole Wheat Chapati with Vegetable Curry', cal: 420, p: 12, c: 72, f: 8.5, recipeId: 15 },
          { type: 'Evening Snack', food: 'Steamed Sprouted Moong Salad', cal: 160, p: 10, c: 26, f: 1.5, recipeId: 11 },
          { type: 'Dinner', food: 'Comforting Moong Dal Khichdi with Roasted Papad', cal: 380, p: 14, c: 64, f: 7, recipeId: 30 },
        ];

        return {
          week_offset: weekOffset,
          weekly_totals: {
            average_daily_calories: 1430,
            average_protein: 48,
            average_carbs: 256,
            average_fat: 23,
          },
          days: days.map((day, dIdx) => ({
            day,
            date: `Day ${dIdx + 1}`,
            total_calories: 1430,
            totals: { calories: 1430, protein: 48.5, carbohydrates: 256, fat: 23.5, fiber: 28 },
            meals: mealsConfig.map((m, mIdx) => ({
              id: `w-${dIdx}-${mIdx}`,
              meal_type: m.type,
              food_name: m.food,
              recipe_id: m.recipeId,
              calories: m.cal,
              protein: m.p,
              carbohydrates: m.c,
              fat: m.f,
            })),
          })),
        };
      }
      throw error;
    }
  },

  generateMealPlan: async (options = {}) => {
    try {
      const response = await api.post('/meal-plans/generate', {
        plan_date: options.date || options.plan_date,
        timezone: getUserTimeZone(),
        force_regenerate: true,
        use_pantry: Boolean(options.usePantry),
      });
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error.isNetworkError) {
        return {
          message: 'Meal plan successfully generated for your dietary goals!',
          timestamp: new Date().toISOString(),
        };
      }
      throw error;
    }
  },

  generateWeeklyPlan: async (options = {}) => {
    try {
      const response = await api.post('/meal-plans/generate-week', {
        start_date: options.startDate || options.start_date,
        timezone: getUserTimeZone(),
        force_regenerate: true,
        use_pantry: Boolean(options.usePantry),
      });
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error.isNetworkError) {
        return {
          message: 'Weekly meal plan successfully generated!',
          timestamp: new Date().toISOString(),
        };
      }
      throw error;
    }
  },
};

export default mealService;
