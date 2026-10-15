export const notificationPermission = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return window.Notification.permission;
};

export const requestNotificationPermission = async () => {
  if (notificationPermission() === 'unsupported') return 'unsupported';
  try {
    return await window.Notification.requestPermission();
  } catch {
    return notificationPermission();
  }
};

export const minutesOf = (time) => {
  const [hours, minutes] = String(time || '').split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

export const dueReminders = ({ settings, day, now = new Date(), fired = new Set() }) => {
  if (!settings?.enabled) return [];
  const current = now.getHours() * 60 + now.getMinutes();
  const due = [];

  if (day?.generated) {
    Object.entries(day.meals || {}).forEach(([slot, meal]) => {
      const slotSettings = settings.slots?.[slot];
      if (!meal || !slotSettings?.enabled || meal.completed || meal.skipped) return;
      const mealAt = minutesOf(slotSettings.time);
      if (mealAt == null) return;
      const fireAt = mealAt - (settings.lead_minutes || 0);
      const key = `${day.date}:${slot}`;
      if (current >= fireAt && current <= mealAt + 30 && !fired.has(key)) {
        due.push({
          key,
          title: settings.lead_minutes && current < mealAt ? `${slot} in ${mealAt - current} min` : `Time for ${slot.toLowerCase()}`,
          body: `${meal.food_name}, ${Math.round(meal.calories)} kcal`,
          url: `/recipes/${meal.recipe_id}`,
        });
      }
    });
  } else if (day && settings.plan_reminder) {
    const key = `${day.date || 'today'}:plan`;
    if (current >= 8 * 60 && current <= 21 * 60 && !fired.has(key)) {
      due.push({ key, title: 'No meal plan for today', body: 'Create a balanced plan in one tap.', url: '/plan' });
    }
  }
  return due;
};
