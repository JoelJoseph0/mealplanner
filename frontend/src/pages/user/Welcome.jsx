import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { markOnboarded } from '../../lib/onboarding';
import { useAddToPantry, useSavePreferences, useSaveProfile } from '../../lib/queries';
import { getErrorMessage } from '../../services/api';
import { ACTIVITY_LEVELS, ALLERGIES_LIST, DIET_TYPES, GENDERS, QUICK_PICK_INGREDIENTS } from '../../utils/constants';
import IngredientPicker from '../../components/pantry/IngredientPicker';
import { Button, Card, Chip, Input, Meter, Select, useToast } from '../../components/ui';

const STEPS = ['Diet', 'About you', 'Kitchen'];

export const Welcome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const savePrefs = useSavePreferences();
  const saveProfile = useSaveProfile();
  const addToPantry = useAddToPantry();

  const [step, setStep] = useState(0);
  const [diet, setDiet] = useState('None');
  const [allergies, setAllergies] = useState([]);
  const [body, setBody] = useState({ age: '', gender: 'Male', height: '', weight: '', activity_level: 'Moderately Active' });
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  const finish = () => {
    markOnboarded(user.id);
    navigate('/dashboard', { replace: true });
  };

  const next = async () => {
    setSaving(true);
    try {
      if (step === 0) {
        await savePrefs.mutateAsync({ diet_type: diet, allergies });
      } else if (step === 1) {
        const payload = { gender: body.gender, activity_level: body.activity_level };
        if (body.age) payload.age = Number(body.age);
        if (body.height) payload.height = Number(body.height);
        if (body.weight) payload.weight = Number(body.weight);
        await saveProfile.mutateAsync(payload);
      } else {
        if (items.length) await addToPantry.mutateAsync({ names: items });
        toast.success(items.length ? 'Your kitchen is ready.' : 'You are all set.');
        finish();
        return;
      }
      setStep((current) => current + 1);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const setField = (field) => (event) => setBody((c) => ({ ...c, [field]: event.target.value }));

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="h-9 w-9 rounded-xl" />
            <span className="text-lg font-bold text-fg">Meal Planner</span>
          </div>
          <button type="button" onClick={finish} className="text-sm font-semibold text-muted hover:text-fg">
            Skip for now
          </button>
        </div>

        <div className="mb-6">
          <div className="mb-2 flex justify-between text-sm font-semibold">
            {STEPS.map((label, index) => (
              <span key={label} className={index <= step ? 'text-brand' : 'text-subtle'}>
                {index + 1}. {label}
              </span>
            ))}
          </div>
          <Meter value={step + 1} max={STEPS.length} />
        </div>

        <Card className="p-6 sm:p-8">
          {step === 0 && (
            <div>
              <h1 className="text-2xl font-bold text-fg">How do you eat?</h1>
              <p className="mt-1 text-muted">We only suggest recipes that fit. You can change this any time.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {DIET_TYPES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={diet === option.value}
                    onClick={() => setDiet(option.value)}
                    className={`rounded-xl border p-4 text-left font-semibold transition-colors ${
                      diet === option.value ? 'border-brand bg-brand-soft text-brand' : 'border-line text-fg hover:bg-surface-2'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <h2 className="mt-8 text-xl font-semibold text-fg">Any allergies?</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {ALLERGIES_LIST.filter((a) => a !== 'Other').map((name) => (
                  <Chip
                    key={name}
                    active={allergies.includes(name)}
                    onClick={() => setAllergies((c) => (c.includes(name) ? c.filter((a) => a !== name) : [...c, name]))}
                  >
                    {name}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold text-fg">A little about you</h1>
              <p className="mt-1 text-muted">Used only to estimate how many calories you need each day.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Input label="Age" type="number" min="1" max="120" value={body.age} onChange={setField('age')} />
                <Select label="Gender" value={body.gender} onChange={setField('gender')} options={GENDERS} />
                <Input label="Height (cm)" type="number" min="50" max="250" value={body.height} onChange={setField('height')} />
                <Input label="Weight (kg)" type="number" min="20" max="300" value={body.weight} onChange={setField('weight')} />
              </div>
              <div className="mt-4">
                <Select
                  label="Activity level"
                  value={body.activity_level}
                  onChange={setField('activity_level')}
                  options={ACTIVITY_LEVELS.map((a) => ({ value: a.value, label: a.label }))}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="text-2xl font-bold text-fg">What is in your kitchen?</h1>
              <p className="mt-1 text-muted">Add a few things you have right now. You can scan or add more later.</p>
              <div className="mt-6">
                <IngredientPicker value={items} onChange={setItems} quickPicks={QUICK_PICK_INGREDIENTS} autoFocus />
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" icon={ChevronLeft} onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || saving}>
              Back
            </Button>
            <Button size="lg" loading={saving} icon={step === STEPS.length - 1 ? Check : undefined} iconRight={step === STEPS.length - 1 ? undefined : ArrowRight} onClick={next}>
              {step === STEPS.length - 1 ? 'Finish' : 'Continue'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Welcome;
