const pad = (n) => String(n).padStart(2, '0');

export const toISODate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const parseISODate = (value) => {
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const todayISO = () => toISODate(new Date());

export const mondayOf = (date = new Date()) => {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - offset);
  return copy;
};

export const addDays = (date, days) => {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + days);
  return copy;
};

export const weekDays = (startDate) =>
  Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startDate, i);
    return {
      iso: toISODate(date),
      date,
      weekday: date.toLocaleDateString(undefined, { weekday: 'short' }),
      day: date.getDate(),
      month: date.toLocaleDateString(undefined, { month: 'short' }),
    };
  });

export const formatLong = (iso) =>
  parseISODate(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

export const formatShort = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' && value.length <= 10 ? parseISODate(value) : new Date(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const relativeTime = (value) => {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatShort(value);
};

export const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const daysUntil = (iso) => {
  if (!iso) return null;
  const today = parseISODate(todayISO());
  return Math.round((parseISODate(iso) - today) / 86400000);
};
