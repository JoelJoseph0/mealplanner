export const formatCalories = (cal) => {
  if (cal === undefined || cal === null) return '0 kcal';
  return `${Math.round(cal)} kcal`;
};

export const formatGrams = (grams) => {
  if (grams === undefined || grams === null) return '0g';
  return `${Number(grams).toFixed(1)}g`;
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const then = new Date(dateString).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(dateString);
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Detects the user's local timezone automatically based on client device/country.
 */
export const getUserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

/**
 * Detects the user's preferred locale.
 */
export const getUserLocale = () => {
  try {
    return navigator.language || 'en-US';
  } catch {
    return 'en-US';
  }
};

/**
 * Computes 7 days for weekly planner relative to the user's local timezone and weekOffset.
 * Starts from Monday of the week.
 * Dates, names, and formats automatically update according to any user's country/locale.
 */
export const getLocalizedWeekDays = (weekOffset = 0, locale = undefined) => {
  const userLocale = locale || getUserLocale();
  const now = new Date();
  
  // Day of week: 0 is Sun, 1 is Mon, ..., 6 is Sat
  const currentDayOfWeek = now.getDay();
  // Monday-based offset: Mon=0, Tue=1, ..., Sun=6
  const daysSinceMonday = (currentDayOfWeek + 6) % 7;

  // Monday of the target week in local time
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysSinceMonday + (weekOffset * 7)
  );
  monday.setHours(0, 0, 0, 0);

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return dayNames.map((dayName, idx) => {
    const dayDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx);
    
    const year = dayDate.getFullYear();
    const month = String(dayDate.getMonth() + 1).padStart(2, '0');
    const dayNum = String(dayDate.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${dayNum}`;

    // Localized short date (e.g. "Oct 5" or "5 Oct" according to country convention)
    const shortDate = dayDate.toLocaleDateString(userLocale, {
      month: 'short',
      day: 'numeric',
    });

    // Localized medium date with year (e.g. "Oct 5, 2026" or "5 Oct 2026")
    const mediumDate = dayDate.toLocaleDateString(userLocale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    // Full localized date (e.g. "Monday, October 5, 2026")
    const fullDate = dayDate.toLocaleDateString(userLocale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const isToday = (
      dayDate.getFullYear() === now.getFullYear() &&
      dayDate.getMonth() === now.getMonth() &&
      dayDate.getDate() === now.getDate()
    );

    return {
      dayName,
      shortDayName: dayName.substring(0, 3).toUpperCase(),
      dateObj: dayDate,
      isoDate,
      shortDate,
      mediumDate,
      fullDate,
      dayNumber: dayDate.getDate(),
      isToday,
    };
  });
};


export const calculateBMI = (heightCm, weightKg) => {
  if (!heightCm || !weightKg) return null;
  const heightM = heightCm / 100;
  const bmi = (weightKg / (heightM * heightM)).toFixed(1);
  let category = 'Normal';
  let color = 'text-emerald-600 bg-emerald-50';

  if (bmi < 18.5) {
    category = 'Underweight';
    color = 'text-amber-600 bg-amber-50';
  } else if (bmi >= 25 && bmi < 29.9) {
    category = 'Overweight';
    color = 'text-orange-600 bg-orange-50';
  } else if (bmi >= 30) {
    category = 'Obese';
    color = 'text-red-600 bg-red-50';
  }

  return { value: bmi, category, color };
};

export const getConfidenceBadge = (confidence) => {
  const score = typeof confidence === 'number' ? confidence : parseFloat(confidence) || 0;
  const percentage = score > 1 ? score : score * 100;
  const formatted = percentage.toFixed(1);

  if (percentage >= 85) {
    return {
      text: `${formatted}%`,
      percentage,
      isLow: false,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      barColor: 'bg-emerald-500',
      label: 'High Confidence',
    };
  }
  if (percentage >= 70) {
    return {
      text: `${formatted}%`,
      percentage,
      isLow: false,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      barColor: 'bg-amber-500',
      label: 'Moderate Confidence',
    };
  }
  return {
    text: `${formatted}%`,
    percentage,
    isLow: true,
    color: 'text-red-700 bg-red-50 border-red-200',
    barColor: 'bg-red-500',
    label: 'Low Confidence',
  };
};

export const calculateMacroPercentages = (protein = 0, carbs = 0, fat = 0) => {
  const pCal = protein * 4;
  const cCal = carbs * 4;
  const fCal = fat * 9;
  const total = pCal + cCal + fCal;

  if (total === 0) return { protein: 30, carbs: 45, fat: 25 };

  return {
    protein: Math.round((pCal / total) * 100),
    carbs: Math.round((cCal / total) * 100),
    fat: Math.round((fCal / total) * 100),
  };
};

export const FALLBACK_FOOD_IMAGES = {
  idli: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80',
  dosa: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80',
  chapati: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80',
  roti: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80',
  biryani: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
  rice: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=800&auto=format&fit=crop&q=80',
  fish: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=80',
  smoothie: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800&auto=format&fit=crop&q=80',
  apple: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800&auto=format&fit=crop&q=80',
  egg: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80',
  puttu: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80',
  kadala: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80',
  salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80',
  chickpea: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80',
  oatmeal: 'https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=800&auto=format&fit=crop&q=80',
  oats: 'https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=800&auto=format&fit=crop&q=80',
  salmon: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&auto=format&fit=crop&q=80',
  chicken: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
  curry: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80',
  sambar: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80',
  appam: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&auto=format&fit=crop&q=80',
  avial: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80',
  banana: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800&auto=format&fit=crop&q=80',
  toast: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80',
  breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&auto=format&fit=crop&q=80',
  lunch: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
  snack: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800&auto=format&fit=crop&q=80',
  dinner: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&auto=format&fit=crop&q=80',
  default: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
};

export const getFoodImage = (item) => {
  if (!item) return FALLBACK_FOOD_IMAGES.default;
  if (typeof item === 'string' && item.startsWith('http')) return item;
  if (item.image && typeof item.image === 'string' && item.image.trim()) return item.image;
  if (item.image_url && typeof item.image_url === 'string' && item.image_url.trim()) return item.image_url;

  const name = (item.title || item.name || item.food_name || '').toLowerCase();
  for (const [key, url] of Object.entries(FALLBACK_FOOD_IMAGES)) {
    if (name.includes(key)) return url;
  }

  const mealType = (item.meal_type || '').toLowerCase();
  if (mealType.includes('breakfast')) return FALLBACK_FOOD_IMAGES.breakfast;
  if (mealType.includes('lunch')) return FALLBACK_FOOD_IMAGES.lunch;
  if (mealType.includes('snack')) return FALLBACK_FOOD_IMAGES.snack;
  if (mealType.includes('dinner')) return FALLBACK_FOOD_IMAGES.dinner;

  return FALLBACK_FOOD_IMAGES.default;
};
