import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart3, History as HistoryIcon, Plus, Save, Settings, Target, UserRound } from 'lucide-react';
import {
  useHistory,
  useHistoryFeedback,
  usePreferences,
  useProfile,
  useSavePreferences,
  useSaveProfile,
} from '../../lib/queries';
import { RecipeImage } from '../../components/food/visuals';
import { RatingButtons } from '../../components/food/RecipeCard';
import { getErrorMessage } from '../../services/api';
import { relativeTime } from '../../lib/dates';
import {
  ACTIVITY_LEVELS,
  ALLERGIES_LIST,
  DIET_TYPES,
  GENDERS,
  HEALTH_CONDITIONS_LIST,
  INTOLERANCES_LIST,
  NUTRITION_GOALS,
} from '../../utils/constants';
import InsightsTab from './InsightsTab';
import SettingsTab from './SettingsTab';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  HealthNote,
  Input,
  ListSkeleton,
  PageHeader,
  Segmented,
  Select,
  Tabs,
  useToast,
} from '../../components/ui';

const bmiInfo = (height, weight) => {
  const h = Number(height) / 100;
  const w = Number(weight);
  if (!h || !w) return null;
  const value = w / (h * h);
  const label = value < 18.5 ? 'Underweight' : value < 25 ? 'Healthy range' : value < 30 ? 'Overweight' : 'Obese';
  return { value: value.toFixed(1), label };
};

const ProfileTab = () => {
  const toast = useToast();
  const { data: profile, isLoading, isError, refetch } = useProfile();
  const saveProfile = useSaveProfile();
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        age: profile.age || '',
        gender: profile.gender || 'Male',
        height: profile.height || '',
        weight: profile.weight || '',
        activity_level: profile.activity_level || 'Moderately Active',
      });
    }
  }, [profile]);

  if (isLoading || !form) return <ListSkeleton rows={4} />;
  if (isError) return <ErrorState message="Could not load your profile." onRetry={refetch} />;

  const set = (field) => (event) => setForm((c) => ({ ...c, [field]: event.target.value }));
  const bmi = bmiInfo(form.height, form.weight);

  const submit = async (event) => {
    event.preventDefault();
    try {
      await saveProfile.mutateAsync({
        full_name: form.full_name.trim(),
        age: form.age ? Number(form.age) : null,
        gender: form.gender,
        height: form.height ? Number(form.height) : null,
        weight: form.weight ? Number(form.weight) : null,
        activity_level: form.activity_level,
      });
      toast.success('Profile saved. Your calorie and macro targets were recalculated.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
      <Card className="space-y-4 lg:col-span-2">
        <h2 className="text-xl font-semibold text-fg">About you</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" value={form.full_name} onChange={set('full_name')} required />
          <Input label="Email" value={profile.email} disabled readOnly />
          <Input label="Age" type="number" min="1" max="120" value={form.age} onChange={set('age')} />
          <Select label="Gender" value={form.gender} onChange={set('gender')} options={GENDERS} />
          <Input label="Height (cm)" type="number" min="50" max="250" value={form.height} onChange={set('height')} />
          <Input label="Weight (kg)" type="number" min="20" max="300" value={form.weight} onChange={set('weight')} />
        </div>
        <Select
          label="Activity level"
          value={form.activity_level}
          onChange={set('activity_level')}
          options={ACTIVITY_LEVELS.map((a) => ({ value: a.value, label: a.label }))}
          hint="Used to calculate your daily calories."
        />
        <div className="flex justify-end">
          <Button type="submit" icon={Save} loading={saveProfile.isPending}>
            Save and recalculate targets
          </Button>
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="hero-gradient relative overflow-hidden border-0 text-white">
          <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
          <span className="absolute -right-2 -top-2 text-6xl opacity-90" aria-hidden="true">💪</span>
          <h3 className="relative font-bold text-white/90">Body mass index</h3>
          {bmi ? (
            <>
              <p className="relative mt-2 font-display text-5xl font-semibold">{bmi.value}</p>
              <span className="relative mt-2 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold ring-1 ring-inset ring-white/25">
                {bmi.label}
              </span>
            </>
          ) : (
            <p className="relative mt-2 text-sm text-white/85">Add your height and weight to see it.</p>
          )}
        </Card>
        <Card>
          <h3 className="font-bold text-fg">Daily targets</h3>
          <p className="mt-1 text-sm text-muted">
            Saving your details recalculates these. You can fine-tune them in the Diet and targets tab.
          </p>
        </Card>
      </div>
    </form>
  );
};

const TagInput = ({ label, hint, values, onChange, placeholder }) => {
  const [text, setText] = useState('');
  const add = () => {
    const value = text.trim();
    if (value && !values.some((v) => v.toLowerCase() === value.toLowerCase())) onChange([...values, value]);
    setText('');
  };
  return (
    <div>
      <p className="text-sm font-semibold text-fg">{label}</p>
      {hint && <p className="text-xs text-subtle">{hint}</p>}
      <div className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          aria-label={label}
          className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
        />
        <Button variant="secondary" icon={Plus} onClick={add} disabled={!text.trim()}>
          Add
        </Button>
      </div>
      {values.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {values.map((value) => (
            <Chip key={value} active onRemove={() => onChange(values.filter((v) => v !== value))}>
              {value}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
};

const normalizeAllergies = (saved = []) => {
  const result = [];
  saved.forEach((raw) => {
    const value = String(raw).trim();
    if (!value) return;
    const lower = value.toLowerCase();
    const match = ALLERGIES_LIST.find((item) => {
      const option = item.toLowerCase();
      return option === lower || `${option}s` === lower || option === `${lower}s`;
    });
    const label = match || value;
    if (!result.includes(label)) result.push(label);
  });
  return result;
};

const DietTab = () => {
  const toast = useToast();
  const { data: prefs, isLoading, isError, refetch } = usePreferences();
  const savePrefs = useSavePreferences();
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (prefs) {
      setForm({
        diet_type: prefs.diet_type || 'None',
        allergies: normalizeAllergies(prefs.allergies),
        preferred_foods: prefs.preferred_foods || [],
        avoid_foods: prefs.avoid_foods || [],
        daily_calories: prefs.daily_calories || 2000,
        protein_target: prefs.protein_target || 75,
        carbohydrate_target: prefs.carbohydrate_target || 250,
        fat_target: prefs.fat_target || 65,
        goal: prefs.goal || 'maintain',
        intolerances: prefs.intolerances || [],
        health_conditions: prefs.health_conditions || [],
      });
    }
  }, [prefs]);

  if (isLoading || !form) return <ListSkeleton rows={4} />;
  if (isError) return <ErrorState message="Could not load your preferences." onRetry={refetch} />;

  const toggleIn = (field, name) =>
    setForm((c) => ({ ...c, [field]: c[field].includes(name) ? c[field].filter((a) => a !== name) : [...c[field], name] }));
  const toggleAllergy = (name) => toggleIn('allergies', name);
  const goalChanged = form.goal !== (prefs.goal || 'maintain');
  const intoleranceOptions = [...INTOLERANCES_LIST, ...form.intolerances.filter((a) => !INTOLERANCES_LIST.includes(a))];
  const conditionOptions = [...HEALTH_CONDITIONS_LIST, ...form.health_conditions.filter((a) => !HEALTH_CONDITIONS_LIST.includes(a))];
  const setNumber = (field) => (event) => setForm((c) => ({ ...c, [field]: event.target.value }));
  const allergyOptions = [...ALLERGIES_LIST, ...form.allergies.filter((a) => !ALLERGIES_LIST.includes(a))];

  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        diet_type: form.diet_type,
        allergies: form.allergies,
        preferred_foods: form.preferred_foods,
        avoid_foods: form.avoid_foods,
        intolerances: form.intolerances,
        health_conditions: form.health_conditions,
        goal: form.goal,
      };
      if (!goalChanged) {
        Object.assign(payload, {
          daily_calories: Number(form.daily_calories),
          protein_target: Number(form.protein_target),
          carbohydrate_target: Number(form.carbohydrate_target),
          fat_target: Number(form.fat_target),
        });
      }
      await savePrefs.mutateAsync(payload);
      toast.success(
        goalChanged
          ? 'Goal saved. Your daily targets were recalculated for it.'
          : 'Preferences saved. Recipes and plans will follow them from now on.'
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <h2 className="text-xl font-semibold text-fg">Your goal</h2>
        <p className="mt-0.5 text-sm text-muted">Sets your calorie and protein targets, and which meals rank higher.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {NUTRITION_GOALS.map((goal) => {
            const active = form.goal === goal.value;
            return (
              <button
                key={goal.value}
                type="button"
                aria-pressed={active}
                onClick={() => setForm((c) => ({ ...c, goal: goal.value }))}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  active ? 'border-brand bg-brand-soft shadow-glow' : 'border-line hover:-translate-y-0.5 hover:bg-surface-2'
                }`}
              >
                <span className="text-2xl" aria-hidden="true">{goal.emoji}</span>
                <span className={`mt-2 block font-semibold ${active ? 'text-brand' : 'text-fg'}`}>{goal.label}</span>
                <span className="mt-0.5 block text-xs text-muted">{goal.hint}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-fg">Diet type</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {DIET_TYPES.map((diet) => {
            const active = form.diet_type === diet.value;
            return (
              <button
                key={diet.value}
                type="button"
                aria-pressed={active}
                onClick={() => setForm((c) => ({ ...c, diet_type: diet.value }))}
                className={`rounded-xl border p-3.5 text-left text-sm font-semibold transition-colors ${
                  active ? 'border-brand bg-brand-soft text-brand' : 'border-line text-fg hover:bg-surface-2'
                }`}
              >
                {diet.label}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-fg">Allergies</h2>
        <p className="mb-4 mt-0.5 text-sm text-muted">Recipes containing these are never recommended or planned.</p>
        <div className="flex flex-wrap gap-2">
          {allergyOptions.map((name) => (
            <Chip key={name} active={form.allergies.includes(name)} onClick={() => toggleAllergy(name)}>
              {name}
            </Chip>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold text-fg">Intolerances</h2>
          <p className="mb-4 mt-0.5 text-sm text-muted">Foods that commonly contain these are left out, for example milk and paneer for lactose.</p>
          <div className="flex flex-wrap gap-2">
            {intoleranceOptions.map((name) => (
              <Chip key={name} active={form.intolerances.includes(name)} onClick={() => toggleIn('intolerances', name)}>
                {name}
              </Chip>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold text-fg">Health conditions</h2>
          <p className="mb-4 mt-0.5 text-sm text-muted">Optional. We do not change your plan for these, but we will remind you to check it with a professional.</p>
          <div className="flex flex-wrap gap-2">
            {conditionOptions.map((name) => (
              <Chip key={name} active={form.health_conditions.includes(name)} onClick={() => toggleIn('health_conditions', name)}>
                {name}
              </Chip>
            ))}
          </div>
        </Card>
      </div>

      <HealthNote conditions={form.health_conditions} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <TagInput
            label="Foods you love"
            hint="Recipes with these rank higher."
            values={form.preferred_foods}
            onChange={(values) => setForm((c) => ({ ...c, preferred_foods: values }))}
            placeholder="e.g. paneer"
          />
        </Card>
        <Card>
          <TagInput
            label="Foods to avoid"
            hint="Recipes with these are hidden."
            values={form.avoid_foods}
            onChange={(values) => setForm((c) => ({ ...c, avoid_foods: values }))}
            placeholder="e.g. mushroom"
          />
        </Card>
      </div>

      <Card>
        <h2 className="flex items-center gap-2 text-xl font-semibold text-fg">
          <Target className="h-5 w-5 text-brand" aria-hidden="true" /> Daily targets
        </h2>
        <p className="mb-4 mt-0.5 text-sm text-muted">
          {goalChanged
            ? 'These will be recalculated for your new goal when you save.'
            : 'Meal plans are sized to these. Saving your profile or changing your goal recalculates them from your body metrics.'}
        </p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Input label="Calories (kcal)" type="number" min="500" disabled={goalChanged} value={form.daily_calories} onChange={setNumber('daily_calories')} />
          <Input label="Protein (g)" type="number" min="0" disabled={goalChanged} value={form.protein_target} onChange={setNumber('protein_target')} />
          <Input label="Carbs (g)" type="number" min="0" disabled={goalChanged} value={form.carbohydrate_target} onChange={setNumber('carbohydrate_target')} />
          <Input label="Fat (g)" type="number" min="0" disabled={goalChanged} value={form.fat_target} onChange={setNumber('fat_target')} />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" icon={Save} loading={savePrefs.isPending}>
          Save preferences
        </Button>
      </div>
    </form>
  );
};

const HISTORY_FILTERS = [
  { value: '', label: 'Cooked and skipped' },
  { value: 'cooked', label: 'Cooked' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'viewed', label: 'Viewed' },
];

const ACTION_BADGE = {
  cooked: { tone: 'brand', label: 'Cooked' },
  skipped: { tone: 'warn', label: 'Skipped' },
  viewed: { tone: 'info', label: 'Viewed' },
};

const EMPTY_HISTORY = {
  viewed: { emoji: '👀', title: 'No recipes viewed yet' },
  skipped: { emoji: '⏭️', title: 'Nothing skipped' },
};

const HistoryTab = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [filter, setFilter] = useState('');
  const { data: items = [], isLoading, isError, refetch } = useHistory(filter);
  const feedback = useHistoryFeedback();

  const header = (
    <div className="mb-4 overflow-x-auto no-scrollbar">
      <Segmented options={HISTORY_FILTERS} value={filter} onChange={setFilter} />
    </div>
  );

  if (isError) return <ErrorState message="Could not load your meal history." onRetry={refetch} />;
  if (isLoading || items.length === 0) {
    const empty = EMPTY_HISTORY[filter] || { emoji: '🍽️', title: 'No meals logged yet' };
    return (
      <>
        {header}
        {isLoading ? (
          <ListSkeleton rows={5} />
        ) : (
          <EmptyState
            emoji={empty.emoji}
            title={empty.title}
            description="Press I cooked this on a recipe, or tick or skip a meal in your plan, and it will show up here."
            action={<Button to="/cook">Find something to cook</Button>}
          />
        )}
      </>
    );
  }

  const rate = (item, value) =>
    feedback.mutate(
      { id: item.id, feedback: value },
      { onError: (error) => toast.error(getErrorMessage(error)) }
    );

  return (
    <>
      {header}
      <ul className="space-y-3">
      {items.map((item) => {
        const badge = ACTION_BADGE[item.action] || ACTION_BADGE.cooked;
        const recipe = item.recipe;
        const name = recipe?.name || item.food?.name || 'Logged meal';
        return (
          <li key={item.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-3 shadow-card sm:p-4">
            <button
              type="button"
              onClick={() => item.recipe_id && navigate(`/recipes/${item.recipe_id}`)}
              className="h-16 w-16 shrink-0 overflow-hidden rounded-xl"
              aria-label={`Open ${name}`}
            >
              <RecipeImage recipe={recipe || { name, meal_type: item.meal_type }} emojiSize="text-3xl" />
            </button>
            <div className="min-w-0 flex-1 basis-48">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold text-fg">{name}</p>
                <Badge tone={badge.tone}>{badge.label}</Badge>
              </div>
              <p className="text-sm text-muted">
                {item.meal_type} · {relativeTime(item.consumed_at)}
                {recipe?.calories != null && ` · ${Math.round(recipe.calories)} kcal`}
              </p>
            </div>
            {item.action !== 'viewed' && (
              <RatingButtons
                value={item.feedback === 'neutral' ? null : item.feedback}
                onChange={(value) => rate(item, value || 'neutral')}
              />
            )}
          </li>
        );
      })}
      </ul>
    </>
  );
};

export const Me = () => {
  const [params, setParams] = useSearchParams();
  const tab = ['profile', 'diet', 'history', 'insights', 'settings'].includes(params.get('tab')) ? params.get('tab') : 'profile';

  return (
    <div>
      <PageHeader title="Me" emoji="🙂" description="Your details, how you eat, and what you have cooked." />
      <Tabs
        value={tab}
        onChange={(id) => setParams(id === 'profile' ? {} : { tab: id })}
        className="mb-6"
        tabs={[
          { id: 'profile', label: 'Profile', icon: UserRound },
          { id: 'diet', label: 'Diet and targets', icon: Target },
          { id: 'insights', label: 'Insights', icon: BarChart3 },
          { id: 'history', label: 'Meal history', icon: HistoryIcon },
          { id: 'settings', label: 'Reminders and privacy', icon: Settings },
        ]}
      />
      {tab === 'profile' && <ProfileTab />}
      {tab === 'diet' && <DietTab />}
      {tab === 'insights' && <InsightsTab />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
};

export default Me;
