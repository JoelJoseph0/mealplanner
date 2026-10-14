import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChefHat, History as HistoryIcon, Plus, Save, Target, UserRound } from 'lucide-react';
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
import { ACTIVITY_LEVELS, ALLERGIES_LIST, DIET_TYPES, GENDERS } from '../../utils/constants';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Input,
  ListSkeleton,
  PageHeader,
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
      });
    }
  }, [prefs]);

  if (isLoading || !form) return <ListSkeleton rows={4} />;
  if (isError) return <ErrorState message="Could not load your preferences." onRetry={refetch} />;

  const toggleAllergy = (name) =>
    setForm((c) => ({ ...c, allergies: c.allergies.includes(name) ? c.allergies.filter((a) => a !== name) : [...c.allergies, name] }));
  const setNumber = (field) => (event) => setForm((c) => ({ ...c, [field]: event.target.value }));
  const allergyOptions = [...ALLERGIES_LIST, ...form.allergies.filter((a) => !ALLERGIES_LIST.includes(a))];

  const submit = async (event) => {
    event.preventDefault();
    try {
      await savePrefs.mutateAsync({
        diet_type: form.diet_type,
        allergies: form.allergies,
        preferred_foods: form.preferred_foods,
        avoid_foods: form.avoid_foods,
        daily_calories: Number(form.daily_calories),
        protein_target: Number(form.protein_target),
        carbohydrate_target: Number(form.carbohydrate_target),
        fat_target: Number(form.fat_target),
      });
      toast.success('Preferences saved. Recipes and plans will follow them from now on.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
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
        <p className="mb-4 mt-0.5 text-sm text-muted">Meal plans are sized to these. Saving your profile recalculates them from your body metrics.</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Input label="Calories (kcal)" type="number" min="500" value={form.daily_calories} onChange={setNumber('daily_calories')} />
          <Input label="Protein (g)" type="number" min="0" value={form.protein_target} onChange={setNumber('protein_target')} />
          <Input label="Carbs (g)" type="number" min="0" value={form.carbohydrate_target} onChange={setNumber('carbohydrate_target')} />
          <Input label="Fat (g)" type="number" min="0" value={form.fat_target} onChange={setNumber('fat_target')} />
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

const HistoryTab = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: items = [], isLoading, isError, refetch } = useHistory();
  const feedback = useHistoryFeedback();

  if (isLoading) return <ListSkeleton rows={5} />;
  if (isError) return <ErrorState message="Could not load your meal history." onRetry={refetch} />;
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ChefHat}
        title="No meals logged yet"
        description="Press I cooked this on a recipe, or tick a meal in your plan, and it will show up here."
        action={<Button to="/cook">Find something to cook</Button>}
      />
    );
  }

  const rate = (item, value) =>
    feedback.mutate(
      { id: item.id, feedback: value },
      { onError: (error) => toast.error(getErrorMessage(error)) }
    );

  return (
    <ul className="space-y-3">
      {items.map((item) => {
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
              <p className="truncate font-semibold text-fg">{name}</p>
              <p className="text-sm text-muted">
                {item.meal_type} · {relativeTime(item.consumed_at)}
                {recipe?.calories != null && ` · ${Math.round(recipe.calories)} kcal`}
              </p>
            </div>
            <RatingButtons
              value={item.feedback === 'neutral' ? null : item.feedback}
              onChange={(value) => rate(item, value || 'neutral')}
            />
          </li>
        );
      })}
    </ul>
  );
};

export const Me = () => {
  const [params, setParams] = useSearchParams();
  const tab = ['profile', 'diet', 'history'].includes(params.get('tab')) ? params.get('tab') : 'profile';

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
          { id: 'history', label: 'Meal history', icon: HistoryIcon },
        ]}
      />
      {tab === 'profile' && <ProfileTab />}
      {tab === 'diet' && <DietTab />}
      {tab === 'history' && <HistoryTab />}
    </div>
  );
};

export default Me;
