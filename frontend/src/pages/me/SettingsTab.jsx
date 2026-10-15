import { useEffect, useState } from 'react';
import { Bell, BellOff, KeyRound, Lock, ShieldCheck, Trash2 } from 'lucide-react';
import { useChangePassword, useDeleteScan, useReminders, useSaveReminders, useScanHistory } from '../../lib/queries';
import { getErrorMessage } from '../../services/api';
import { resolveImageUrl } from '../../components/food/visuals';
import { relativeTime } from '../../lib/dates';
import { MEAL_SLOTS } from '../../utils/constants';
import { notificationPermission, requestNotificationPermission } from '../../lib/reminders';
import { Badge, Button, Card, Checkbox, ConfirmDialog, Input, ListSkeleton, Select, useToast } from '../../components/ui';

const LEAD_OPTIONS = [
  { value: 0, label: 'At meal time' },
  { value: 10, label: '10 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
];

const RemindersCard = () => {
  const toast = useToast();
  const { data, isLoading } = useReminders();
  const save = useSaveReminders();
  const [form, setForm] = useState(null);
  const [permission, setPermission] = useState(notificationPermission());

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (isLoading || !form) return <ListSkeleton rows={3} />;

  const setSlot = (slot, changes) =>
    setForm((current) => ({ ...current, slots: { ...current.slots, [slot]: { ...current.slots[slot], ...changes } } }));

  const submit = async () => {
    try {
      if (form.enabled && permission === 'default') {
        setPermission(await requestNotificationPermission());
      }
      await save.mutateAsync(form);
      toast.success(form.enabled ? 'Reminders saved' : 'Reminders turned off');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-fg">
            <Bell className="h-5 w-5 text-brand" aria-hidden="true" /> Meal reminders
          </h2>
          <p className="mt-0.5 text-sm text-muted">A nudge before each planned meal, and a reminder when today has no plan.</p>
        </div>
        <Button
          variant={form.enabled ? 'soft' : 'secondary'}
          icon={form.enabled ? Bell : BellOff}
          aria-pressed={form.enabled}
          onClick={() => setForm((c) => ({ ...c, enabled: !c.enabled }))}
        >
          {form.enabled ? 'On' : 'Off'}
        </Button>
      </div>

      {form.enabled && (
        <div className="mt-5 space-y-5 animate-fade-in">
          {permission === 'denied' && (
            <p className="rounded-xl bg-warn-soft p-3 text-sm text-fg">
              Your browser is blocking notifications for this site, so reminders will only show inside the app. You can allow them in your browser settings.
            </p>
          )}
          {permission === 'unsupported' && (
            <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">This browser does not support notifications. Reminders will show inside the app.</p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Remind me"
              value={form.lead_minutes}
              onChange={(e) => setForm((c) => ({ ...c, lead_minutes: Number(e.target.value) }))}
              options={LEAD_OPTIONS}
            />
            <div className="flex items-end">
              <Checkbox
                label="Remind me to plan the day"
                description="At 8 am if today has no plan yet"
                checked={form.plan_reminder}
                onChange={(value) => setForm((c) => ({ ...c, plan_reminder: value }))}
                className="w-full"
              />
            </div>
          </div>

          <ul className="divide-y divide-line rounded-2xl border border-line">
            {MEAL_SLOTS.map((slot) => {
              const value = form.slots[slot] || { enabled: true, time: '12:00' };
              return (
                <li key={slot} className="flex items-center gap-3 p-3">
                  <input
                    type="checkbox"
                    id={`reminder-${slot}`}
                    checked={value.enabled}
                    onChange={(e) => setSlot(slot, { enabled: e.target.checked })}
                    className="h-4 w-4 accent-[var(--brand)]"
                  />
                  <label htmlFor={`reminder-${slot}`} className="flex-1 text-sm font-semibold text-fg">
                    {slot}
                  </label>
                  <input
                    type="time"
                    value={value.time}
                    disabled={!value.enabled}
                    onChange={(e) => setSlot(slot, { time: e.target.value })}
                    aria-label={`${slot} time`}
                    className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-fg disabled:opacity-50"
                  />
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-subtle">You will be reminded about the meal planned for each enabled slot. Skipped or eaten meals are not reminded.</p>
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <Button onClick={submit} loading={save.isPending}>
          Save reminders
        </Button>
      </div>
    </Card>
  );
};

const PasswordCard = () => {
  const toast = useToast();
  const change = useChangePassword();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});

  const set = (field) => (event) => setForm((c) => ({ ...c, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.current) nextErrors.current = 'Enter your current password';
    if (form.next.length < 6) nextErrors.next = 'Use at least 6 characters';
    else if (!/[a-zA-Z]/.test(form.next) || !/\d/.test(form.next)) nextErrors.next = 'Use at least one letter and one number';
    if (form.next !== form.confirm) nextErrors.confirm = 'Passwords do not match';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      await change.mutateAsync({ current: form.current, next: form.next });
      setForm({ current: '', next: '', confirm: '' });
      toast.success('Password changed');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Card as="form" onSubmit={submit} noValidate>
      <h2 className="flex items-center gap-2 text-xl font-semibold text-fg">
        <KeyRound className="h-5 w-5 text-brand" aria-hidden="true" /> Change password
      </h2>
      <div className="mt-4 space-y-4">
        <Input label="Current password" type="password" autoComplete="current-password" icon={Lock} value={form.current} onChange={set('current')} error={errors.current} />
        <Input label="New password" type="password" autoComplete="new-password" icon={Lock} value={form.next} onChange={set('next')} error={errors.next} hint="At least 6 characters, with a letter and a number." />
        <Input label="Confirm new password" type="password" autoComplete="new-password" icon={Lock} value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
      </div>
      <div className="mt-5 flex justify-end">
        <Button type="submit" loading={change.isPending}>
          Update password
        </Button>
      </div>
    </Card>
  );
};

const PrivacyCard = () => {
  const toast = useToast();
  const { data: scans = [], isLoading } = useScanHistory();
  const remove = useDeleteScan();
  const [confirm, setConfirm] = useState(false);

  const drop = (id) =>
    remove.mutate(id, {
      onSuccess: () => {
        setConfirm(false);
        toast.success(id === 'all' ? 'All scans deleted' : 'Scan deleted');
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });

  return (
    <Card>
      <h2 className="flex items-center gap-2 text-xl font-semibold text-fg">
        <ShieldCheck className="h-5 w-5 text-brand" aria-hidden="true" /> Your scans and photos
      </h2>
      <p className="mt-0.5 text-sm text-muted">
        Photos you scan are kept only to show your scan history, and are removed automatically after 30 days. You can delete them sooner here.
      </p>

      {isLoading ? (
        <div className="mt-4">
          <ListSkeleton rows={2} />
        </div>
      ) : scans.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-surface-2 p-4 text-sm text-muted">You have no saved scans.</p>
      ) : (
        <>
          <ul className="mt-4 max-h-80 divide-y divide-line overflow-y-auto rounded-2xl border border-line">
            {scans.map((scan) => (
              <li key={scan.id} className="flex items-center gap-3 p-3">
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                  {scan.image_url ? (
                    <img src={resolveImageUrl(scan.image_url)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs text-subtle">Removed</span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-fg">{scan.food_name}</p>
                  <p className="text-xs text-subtle">{relativeTime(scan.created_at)}</p>
                </div>
                <Badge tone={scan.confidence >= 0.7 ? 'brand' : 'warn'}>{Math.round(scan.confidence * 100)}%</Badge>
                <button
                  type="button"
                  onClick={() => drop(scan.id)}
                  aria-label={`Delete scan of ${scan.food_name}`}
                  className="rounded-xl p-2 text-subtle hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end">
            <Button variant="dangerSoft" icon={Trash2} onClick={() => setConfirm(true)}>
              Delete all scans
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => drop('all')}
        title="Delete all scans?"
        message={`This permanently removes ${scans.length} scan${scans.length === 1 ? '' : 's'} and their photos.`}
        confirmLabel="Delete all"
        danger
        loading={remove.isPending}
      />
    </Card>
  );
};

export const SettingsTab = () => (
  <div className="grid gap-6 lg:grid-cols-2">
    <div className="space-y-6">
      <RemindersCard />
    </div>
    <div className="space-y-6">
      <PasswordCard />
      <PrivacyCard />
    </div>
  </div>
);

export default SettingsTab;
