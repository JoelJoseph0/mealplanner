import { describe, it, expect } from 'vitest';
import { dueReminders, minutesOf } from '../lib/reminders';

const settings = {
  enabled: true,
  lead_minutes: 15,
  plan_reminder: true,
  slots: {
    Breakfast: { enabled: true, time: '08:30' },
    Lunch: { enabled: true, time: '13:30' },
    Dinner: { enabled: false, time: '20:00' },
  },
};

const meal = (overrides = {}) => ({ food_name: 'Tomato Rice', calories: 380, recipe_id: 7, completed: false, skipped: false, ...overrides });

const day = (meals) => ({ date: '2026-10-14', generated: true, meals });

const at = (hours, minutes) => new Date(2026, 9, 14, hours, minutes);

describe('meal reminders', () => {
  it('parses clock times', () => {
    expect(minutesOf('13:30')).toBe(810);
    expect(minutesOf('bad')).toBeNull();
  });

  it('does nothing when reminders are off', () => {
    expect(dueReminders({ settings: { ...settings, enabled: false }, day: day({ Lunch: meal() }), now: at(13, 20) })).toEqual([]);
  });

  it('fires within the lead window before a planned meal', () => {
    expect(dueReminders({ settings, day: day({ Lunch: meal() }), now: at(13, 0) })).toEqual([]);
    const due = dueReminders({ settings, day: day({ Lunch: meal() }), now: at(13, 20) });
    expect(due).toHaveLength(1);
    expect(due[0].title).toBe('Lunch in 10 min');
    expect(due[0].url).toBe('/recipes/7');
  });

  it('skips eaten, skipped, disabled and already fired meals', () => {
    const now = at(20, 0);
    expect(dueReminders({ settings, day: day({ Dinner: meal() }), now })).toEqual([]);
    expect(dueReminders({ settings, day: day({ Lunch: meal({ completed: true }) }), now: at(13, 25) })).toEqual([]);
    expect(dueReminders({ settings, day: day({ Lunch: meal({ skipped: true }) }), now: at(13, 25) })).toEqual([]);
    expect(dueReminders({ settings, day: day({ Lunch: meal() }), now: at(13, 25), fired: new Set(['2026-10-14:Lunch']) })).toEqual([]);
  });

  it('stops reminding long after the meal time', () => {
    expect(dueReminders({ settings, day: day({ Breakfast: meal() }), now: at(10, 0) })).toEqual([]);
  });

  it('reminds to plan the day when there is no plan', () => {
    const empty = { date: '2026-10-14', generated: false, meals: {} };
    expect(dueReminders({ settings, day: empty, now: at(7, 0) })).toEqual([]);
    const due = dueReminders({ settings, day: empty, now: at(9, 0) });
    expect(due[0].url).toBe('/plan');
    expect(dueReminders({ settings: { ...settings, plan_reminder: false }, day: empty, now: at(9, 0) })).toEqual([]);
  });
});
