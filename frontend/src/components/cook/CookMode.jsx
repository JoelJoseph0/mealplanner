import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Eye,
  Lightbulb,
  Loader2,
  MessageCircle,
  ShieldAlert,
  ShoppingBasket,
  Sparkles,
  Timer,
  Wrench,
  X,
} from 'lucide-react';
import { useCookingGuide } from '../../lib/useCookingGuide';
import ChefChat from '../assistant/ChefChat';
import { Badge, Button, Meter } from '../ui';

const findMinutes = (text) => {
  const match = String(text).match(/(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:minutes?|mins?)\b/i);
  return match ? Number(match[2] || match[1]) : null;
};

const toStep = (text, index) => ({
  title: `Step ${index + 1}`,
  do: text,
  minutes: findMinutes(text),
  look_for: null,
  tip: null,
  watch_out: null,
});

const TONES = {
  brand: 'border-brand/25 bg-brand-soft text-brand',
  saffron: 'border-saffron/40 bg-saffron-soft text-warn',
  danger: 'border-danger/25 bg-danger-soft text-danger',
};

const Callout = ({ icon: Icon, tone, label, children }) => (
  <div className={`flex items-start gap-3 rounded-2xl border p-4 ${TONES[tone]}`}>
    <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
      <p className="mt-0.5 text-base text-fg">{children}</p>
    </div>
  </div>
);

const Intro = ({ recipe, ai, phase, partial, personal, checked, onToggle, onStart }) => {
  const meta = ai || partial.meta;
  const prep = meta?.prep?.length ? meta.prep : null;
  const equipment = meta?.equipment || [];
  const writing = phase === 'writing' || phase === 'loading';
  const conflicts = personal?.allergen_conflicts || [];
  const missing = personal?.missing_ingredients || [];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-5 py-6">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Before you start</p>
      <h2 className="mt-1 text-3xl font-semibold text-fg sm:text-4xl">{recipe.name}</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
        {meta?.difficulty && <Badge tone="brand">{meta.difficulty}</Badge>}
        <span>{(recipe.preparation_time || 0) + (recipe.cooking_time || 0)} min</span>
        <span aria-hidden="true">·</span>
        <span>Serves {recipe.servings}</span>
      </div>

      <div className="mt-6 space-y-3">
        {conflicts.length > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-4" role="alert">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
            <div>
              <p className="font-semibold text-fg">Check this against your allergies</p>
              <p className="text-sm text-muted">This recipe appears to contain: {conflicts.join(', ')}.</p>
            </div>
          </div>
        )}
        {missing.length > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-saffron/40 bg-saffron-soft p-4">
            <ShoppingBasket className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden="true" />
            <div>
              <p className="font-semibold text-fg">You are missing {missing.length} ingredient{missing.length === 1 ? '' : 's'}</p>
              <p className="text-sm text-muted">{missing.join(', ')}</p>
            </div>
          </div>
        )}
      </div>

      <section className="mt-6">
        <h3 className="font-display text-xl font-semibold text-fg">Get everything ready</h3>
        {prep ? (
          <ul className="mt-3 space-y-2">
            {prep.map((task, index) => (
              <li key={task}>
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-colors hover:bg-surface-2">
                  <input
                    type="checkbox"
                    checked={Boolean(checked[index])}
                    onChange={() => onToggle(index)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand)]"
                  />
                  <span className={`text-base ${checked[index] ? 'text-subtle line-through' : 'text-fg'}`}>{task}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-3 space-y-2">
            {(recipe.ingredients || []).map((line) => (
              <li key={line} className="rounded-2xl border border-line bg-surface p-3.5 text-base text-fg">
                {line}
              </li>
            ))}
          </ul>
        )}
      </section>

      {equipment.length > 0 && (
        <section className="mt-6">
          <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-fg">
            <Wrench className="h-5 w-5 text-brand" aria-hidden="true" /> You will need
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {equipment.map((item) => (
              <span key={item} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-fg">
                {item}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 rounded-2xl bg-surface-2/70 p-4 text-sm text-muted">
        {phase === 'ready' && (
          <p className="flex items-center gap-2 font-semibold text-brand">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Detailed guide ready
          </p>
        )}
        {writing && (
          <p className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-brand" aria-hidden="true" />
            Chef Assistant is writing a detailed guide{partial.steps.length > 0 ? ` (${partial.steps.length} steps so far)` : ''}. You can start now with the basic steps.
          </p>
        )}
        {phase === 'basic' && <p>Using the recipe's own steps.</p>}
        {(phase === 'unavailable' || phase === 'error') && (
          <p>Chef Assistant is not available right now ({partial.reason || 'unknown reason'}). Using the recipe's own steps.</p>
        )}
      </div>

      <div className="mt-6">
        <Button size="lg" full iconRight={ChevronRight} onClick={onStart}>
          Start cooking
        </Button>
      </div>
    </div>
  );
};

export const CookMode = ({ recipe, steps: basicSteps, onClose, onFinish }) => {
  const { phase, guide, personal, partial } = useCookingGuide(recipe.id, { generate: true });
  const [index, setIndex] = useState(-1);
  const [checked, setChecked] = useState({});
  const [useAi, setUseAi] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const timerRef = useRef(null);
  const indexRef = useRef(index);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const aiSteps = guide?.steps?.length ? guide.steps : null;
  const basic = useMemo(() => basicSteps.map(toStep), [basicSteps]);
  const steps = useAi && aiSteps ? aiSteps : basic;
  const step = index >= 0 ? steps[index] : null;
  const last = index === steps.length - 1;

  useEffect(() => {
    if (aiSteps && indexRef.current === -1) setUseAi(true);
  }, [aiSteps]);

  const switchToGuide = () => {
    if (!aiSteps) return;
    const progress = indexRef.current <= 0 || basic.length < 2 ? 0 : indexRef.current / (basic.length - 1);
    setIndex(Math.min(aiSteps.length - 1, Math.round(progress * (aiSteps.length - 1))));
    setUseAi(true);
  };

  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current);
    setRemaining(null);
  }, []);

  useEffect(() => {
    let lock = null;
    const acquire = async () => {
      try {
        if (navigator.wakeLock) lock = await navigator.wakeLock.request('screen');
      } catch {
        lock = null;
      }
    };
    acquire();
    return () => {
      clearInterval(timerRef.current);
      lock?.release?.().catch(() => {});
    };
  }, []);

  const go = useCallback(
    (next) => {
      stopTimer();
      setIndex(next);
    },
    [stopTimer]
  );

  useEffect(() => {
    const handleKey = (event) => {
      if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) return;
      if (event.key === 'Escape') {
        if (chatOpen) setChatOpen(false);
        else onClose();
      }
      if (chatOpen) return;
      if (event.key === 'ArrowRight') go(Math.min(indexRef.current + 1, steps.length - 1));
      if (event.key === 'ArrowLeft') go(Math.max(indexRef.current - 1, -1));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [chatOpen, go, onClose, steps.length]);

  const startTimer = (minutes) => {
    clearInterval(timerRef.current);
    setRemaining(minutes * 60);
    timerRef.current = setInterval(() => {
      setRemaining((current) => {
        if (current === null) return null;
        if (current <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  };

  const clock = remaining === null ? null : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
  const showSwitch = aiSteps && !useAi && index >= 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg" role="dialog" aria-modal="true" aria-label={`Cooking ${recipe.name}`}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">{recipe.name}</p>
          <p className="text-xs text-subtle">{index === -1 ? 'Get ready' : `Step ${index + 1} of ${steps.length}`}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="soft" size="sm" icon={MessageCircle} onClick={() => setChatOpen(true)}>
            Ask the chef
          </Button>
          <button type="button" onClick={onClose} aria-label="Exit cooking mode" className="rounded-xl p-2 text-muted hover:bg-surface-2">
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>
      <div className="px-4 pt-3">
        <Meter value={index + 1} max={steps.length + 1} />
      </div>

      {showSwitch && (
        <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-brand-soft px-4 py-2.5 text-sm">
          <span className="flex items-center gap-2 font-semibold text-brand">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> The detailed guide is ready
          </span>
          <Button size="sm" onClick={switchToGuide}>
            Switch to it
          </Button>
        </div>
      )}

      {index === -1 ? (
        <Intro
          recipe={recipe}
          ai={guide}
          phase={phase}
          partial={partial}
          personal={personal}
          checked={checked}
          onToggle={(i) => setChecked((c) => ({ ...c, [i]: !c[i] }))}
          onStart={() => go(0)}
        />
      ) : (
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 overflow-y-auto px-6 py-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">{step.title}</p>
            <p className="mt-2 font-display text-3xl font-medium leading-snug text-fg sm:text-4xl sm:leading-tight">{step.do}</p>
          </div>

          {step.minutes && (
            <div className="flex flex-wrap items-center gap-3">
              {clock === null ? (
                <Button variant="soft" size="lg" icon={Timer} onClick={() => startTimer(step.minutes)}>
                  Start {step.minutes} min timer
                </Button>
              ) : (
                <div
                  className={`flex items-center gap-3 rounded-2xl px-5 py-3 text-3xl font-bold tabular-nums ${
                    remaining === 0 ? 'bg-brand text-brand-fg' : 'bg-surface-2 text-fg'
                  }`}
                  role="timer"
                >
                  <Timer className="h-7 w-7" aria-hidden="true" />
                  {remaining === 0 ? 'Time is up' : clock}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            {step.look_for && (
              <Callout icon={Eye} tone="brand" label="You will know it is ready when">
                {step.look_for}
              </Callout>
            )}
            {step.tip && (
              <Callout icon={Lightbulb} tone="saffron" label="Tip">
                {step.tip}
              </Callout>
            )}
            {step.watch_out && (
              <Callout icon={AlertTriangle} tone="danger" label="Watch out">
                {step.watch_out}
              </Callout>
            )}
            {last && useAi && guide?.serving_tip && (
              <Callout icon={ChefHat} tone="brand" label="To serve">
                {guide.serving_tip}
              </Callout>
            )}
            {last && useAi && (guide?.tips || []).length > 0 && (
              <Callout icon={Lightbulb} tone="saffron" label="Good to know">
                {guide.tips.join(' ')}
              </Callout>
            )}
          </div>
        </div>
      )}

      {index >= 0 && (
        <div className="flex items-center gap-3 border-t border-line px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="secondary" size="lg" icon={ChevronLeft} onClick={() => go(index - 1)}>
            Back
          </Button>
          {last ? (
            <Button size="lg" icon={Check} className="flex-1" onClick={onFinish}>
              Done, I cooked it
            </Button>
          ) : (
            <Button size="lg" iconRight={ChevronRight} className="flex-1" onClick={() => go(index + 1)}>
              Next step
            </Button>
          )}
        </div>
      )}

      {chatOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-label="Ask the chef">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close chat" onClick={() => setChatOpen(false)} />
          <div className="relative flex h-[78vh] w-full max-w-xl flex-col rounded-t-3xl bg-bg p-4 shadow-lift animate-sheet-up sm:h-[34rem] sm:rounded-3xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-fg">
                <ChefHat className="h-5 w-5 text-brand" aria-hidden="true" /> Ask the chef
              </h3>
              <button type="button" onClick={() => setChatOpen(false)} aria-label="Close" className="rounded-xl p-2 text-muted hover:bg-surface-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ChefChat recipe={recipe} currentStep={index >= 0 ? index : null} className="flex-1" autoFocus />
          </div>
        </div>
      )}
    </div>
  );
};

export default CookMode;
