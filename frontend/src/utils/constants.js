export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const DIET_TYPES = [
  { value: 'None', label: 'None / Any' },
  { value: 'Vegetarian', label: 'Vegetarian' },
  { value: 'Vegan', label: 'Vegan' },
  { value: 'Non-Vegetarian', label: 'Non-Vegetarian' },
  { value: 'Eggetarian', label: 'Eggetarian' },
];

export const ALLERGIES_LIST = [
  'Milk',
  'Egg',
  'Peanut',
  'Tree Nuts',
  'Fish',
  'Shellfish',
  'Soy',
  'Wheat',
  'Sesame',
  'Other',
];

export const MEAL_TYPES = [
  'Breakfast',
  'Morning Snack',
  'Lunch',
  'Evening Snack',
  'Dinner',
];

export const ACTIVITY_LEVELS = [
  { value: 'Sedentary', label: 'Sedentary (Little or no exercise)' },
  { value: 'Lightly Active', label: 'Lightly Active (Light exercise 1-3 days/week)' },
  { value: 'Moderately Active', label: 'Moderately Active (Moderate exercise 3-5 days/week)' },
  { value: 'Very Active', label: 'Very Active (Hard exercise 6-7 days/week)' },
  { value: 'Extra Active', label: 'Extra Active (Physical job or heavy training)' },
];

export const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

export const INGREDIENT_CATEGORIES = [
  'Vegetables',
  'Fruits',
  'Grains & Cereals',
  'Legumes & Pulses',
  'Dairy & Alternatives',
  'Poultry & Meat',
  'Seafood',
  'Eggs',
  'Spices & Seasonings',
  'Herbs',
  'Nuts & Seeds',
  'Oils & Fats',
  'Condiments & Sauces',
  'Bakery',
  'Others',
];

export const QUICK_PICK_INGREDIENTS = [
  'Tomato',
  'Onion',
  'Potato',
  'Egg',
  'Rice',
  'Papaya',
  'Banana',
  'Paneer',
  'Curd',
  'Spinach',
  'Coconut',
  'Lemon',
];

export const MAX_MISSING_OPTIONS = [
  { value: 0, label: 'Only recipes I can cook right now' },
  { value: 1, label: 'Missing at most 1 item' },
  { value: 2, label: 'Missing at most 2 items' },
  { value: 3, label: 'Missing at most 3 items' },
];

export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE_MB = 10;

export const NUTRITION_GOALS = [
  { value: 'maintain', label: 'Maintain weight', emoji: '⚖️', hint: 'Balanced meals at your usual energy needs.' },
  { value: 'lose', label: 'Lose weight', emoji: '🥗', hint: 'About 500 kcal less a day, with more protein and fibre.' },
  { value: 'gain', label: 'Gain weight', emoji: '🍚', hint: 'About 300 kcal more a day from energy-dense meals.' },
  { value: 'muscle', label: 'Build muscle', emoji: '💪', hint: 'A little more energy and noticeably more protein.' },
];

export const INTOLERANCES_LIST = ['Lactose', 'Gluten', 'Fructose', 'Histamine', 'Caffeine', 'FODMAP'];

export const HEALTH_CONDITIONS_LIST = [
  'Diabetes',
  'High blood pressure',
  'High cholesterol',
  'Heart disease',
  'Kidney disease',
  'Thyroid condition',
  'PCOS',
  'Pregnancy',
];

export const MEAL_SLOTS = ['Breakfast', 'Morning Snack', 'Lunch', 'Evening Snack', 'Dinner'];
