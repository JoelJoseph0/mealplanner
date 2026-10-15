import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, X } from 'lucide-react';
import { useDay, useReminders } from '../lib/queries';
import { todayISO } from '../lib/dates';
import { dueReminders, notificationPermission } from '../lib/reminders';

const STORAGE_KEY = 'reminders_fired';

const loadFired = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const today = todayISO();
    return new Set(saved.filter((key) => key.startsWith(today)));
  } catch {
    return new Set();
  }
};

const saveFired = (fired) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...fired]));
  } catch {
    return;
  }
};

export const ReminderManager = () => {
  const navigate = useNavigate();
  const { data: settings } = useReminders();
  const enabled = Boolean(settings?.enabled);
  const today = todayISO();
  const { data: day } = useDay(today);
  const [active, setActive] = useState(null);
  const firedRef = useRef(loadFired());

  useEffect(() => {
    if (!enabled || !day) return undefined;

    const check = () => {
      const due = dueReminders({ settings, day: { ...day, date: day.date || today }, fired: firedRef.current });
      if (!due.length) return;
      const reminder = due[0];
      due.forEach((item) => firedRef.current.add(item.key));
      saveFired(firedRef.current);
      setActive(reminder);
      if (notificationPermission() === 'granted') {
        try {
          const note = new window.Notification(reminder.title, { body: reminder.body, icon: '/favicon.svg', tag: reminder.key });
          note.onclick = () => {
            window.focus();
            navigate(reminder.url);
            note.close();
          };
        } catch {
          return;
        }
      }
    };

    check();
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, [enabled, settings, day, today, navigate]);

  if (!active) return null;

  return (
    <div className="fixed inset-x-3 top-3 z-[70] flex justify-center lg:inset-x-auto lg:right-6 lg:top-6" role="alert">
      <div className="glass flex w-full max-w-sm items-start gap-3 rounded-3xl border border-line p-4 shadow-lift animate-sheet-up">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-saffron to-accent text-white shadow-card">
          <BellRing className="h-5 w-5" aria-hidden="true" />
        </span>
        <button
          type="button"
          onClick={() => {
            navigate(active.url);
            setActive(null);
          }}
          className="min-w-0 flex-1 text-left"
        >
          <p className="font-semibold text-fg">{active.title}</p>
          <p className="truncate text-sm text-muted">{active.body}</p>
        </button>
        <button type="button" onClick={() => setActive(null)} aria-label="Dismiss reminder" className="rounded-lg p-1 text-subtle hover:text-fg">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ReminderManager;
