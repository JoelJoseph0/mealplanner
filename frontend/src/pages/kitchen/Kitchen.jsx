import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChefHat, CalendarDays, Check, Plus, Refrigerator, ScanLine, ShoppingCart, Timer, Trash2, X } from 'lucide-react';
import {
  useAddShopping,
  useAddToPantry,
  useCheckoutShopping,
  useClearPantry,
  useClearShopping,
  usePantry,
  useRemovePantryItem,
  useRemoveShopping,
  useShopping,
  useShoppingFromPlan,
  useUpdatePantryItem,
  useUpdateShopping,
} from '../../lib/queries';
import { daysUntil, mondayOf, toISODate } from '../../lib/dates';
import { getErrorMessage } from '../../services/api';
import { QUICK_PICK_INGREDIENTS } from '../../utils/constants';
import IngredientPicker from '../../components/pantry/IngredientPicker';
import { IngredientIcon, ingredientEmoji } from '../../components/food/visuals';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  GridSkeleton,
  PageHeader,
  Tabs,
  useToast,
} from '../../components/ui';

const expiryLabel = (iso) => {
  const days = daysUntil(iso);
  if (days === null) return null;
  if (days < 0) return { text: 'Expired', tone: 'danger' };
  if (days === 0) return { text: 'Expires today', tone: 'danger' };
  if (days === 1) return { text: 'Expires tomorrow', tone: 'warn' };
  if (days <= 3) return { text: `Expires in ${days} days`, tone: 'warn' };
  return { text: `Expires in ${days} days`, tone: 'neutral' };
};

const Suggestions = ({ list, onPick }) =>
  list?.length ? (
    <div className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-fg">
      {list.map((entry) => (
        <div key={entry.input} className="flex flex-wrap items-center gap-2 py-0.5">
          <span>
            Could not find <strong>{entry.input}</strong>.
          </span>
          {entry.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPick(s)}
              className="rounded-full bg-surface px-2.5 py-0.5 text-sm font-semibold text-brand hover:bg-brand-soft"
            >
              Add {s}
            </button>
          ))}
        </div>
      ))}
    </div>
  ) : null;

const PantryTile = ({ item, onSave, onRemove }) => {
  const [quantity, setQuantity] = useState(item.quantity || '');
  const expiry = expiryLabel(item.expiry_date);

  return (
    <li className="card-hover group flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <IngredientIcon name={item.name} category={item.category} size="lg" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-base font-bold text-fg">{item.name}</p>
          {expiry ? <Badge tone={expiry.tone}>{expiry.text}</Badge> : <span className="text-xs text-subtle">{item.category}</span>}
        </div>
        <button
          type="button"
          onClick={() => onRemove(item)}
          aria-label={`Remove ${item.name}`}
          className="rounded-xl p-2 text-subtle opacity-60 transition-all hover:bg-danger-soft hover:text-danger group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          onBlur={() => (item.quantity || '') !== quantity.trim() && onSave(item, { quantity: quantity.trim() })}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          placeholder="Qty, e.g. 4 or 500 g"
          aria-label={`Quantity of ${item.name}`}
          className="w-full rounded-xl border border-transparent bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-subtle transition-colors hover:border-line focus:border-brand focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brand/15"
        />
        <input
          type="date"
          value={item.expiry_date || ''}
          onChange={(e) => onSave(item, e.target.value ? { expiry_date: e.target.value } : { clear_expiry: true })}
          aria-label={`Expiry date of ${item.name}`}
          className="w-full rounded-xl border border-transparent bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-subtle transition-colors hover:border-line focus:border-brand focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brand/15"
        />
      </div>
    </li>
  );
};

const PantryTab = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: items = [], isLoading, isError, refetch } = usePantry();
  const add = useAddToPantry();
  const update = useUpdatePantryItem();
  const remove = useRemovePantryItem();
  const clear = useClearPantry();
  const [draft, setDraft] = useState([]);
  const [unrecognized, setUnrecognized] = useState([]);
  const [confirmClear, setConfirmClear] = useState(false);

  const grouped = useMemo(() => {
    const groups = {};
    items.forEach((item) => {
      const key = item.category || 'Others';
      (groups[key] = groups[key] || []).push(item);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const expiring = items.filter((i) => i.expires_soon);

  const addNames = async (names) => {
    try {
      const result = await add.mutateAsync({ names });
      setUnrecognized(result.unrecognized || []);
      const saved = (result.added?.length || 0) + (result.updated?.length || 0);
      if (saved) toast.success(`${saved} ingredient${saved > 1 ? 's' : ''} added to your kitchen`);
      const missed = new Set((result.unrecognized || []).map((u) => u.input));
      setDraft((current) => current.filter((name) => missed.has(name)));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const save = async (item, changes) => {
    try {
      await update.mutateAsync({ id: item.id, changes });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (isError) return <ErrorState message="Could not load your kitchen." onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-semibold text-fg">Add ingredients</h2>
        <p className="mb-3 mt-0.5 text-sm text-muted">Type a name, or scan a photo with the camera.</p>
        <IngredientPicker value={draft} onChange={setDraft} quickPicks={QUICK_PICK_INGREDIENTS} onSubmit={() => addNames(draft)} />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button icon={Plus} disabled={draft.length === 0} loading={add.isPending} onClick={() => addNames(draft)}>
            Add {draft.length > 1 ? `${draft.length} items` : 'to kitchen'}
          </Button>
          <Button variant="secondary" icon={ScanLine} to="/scan">
            Scan with camera
          </Button>
        </div>
        <Suggestions list={unrecognized} onPick={(name) => addNames([name])} />
      </Card>

      {expiring.length > 0 && (
        <div className="flex flex-col gap-3 rounded-3xl border border-saffron/40 bg-gradient-to-r from-saffron-soft to-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm font-semibold text-fg">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-saffron text-white shadow-card">
              <Timer className="h-5 w-5" aria-hidden="true" />
            </span>
            Use soon: {expiring.map((i) => i.name).join(', ')}
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={ChefHat}
            onClick={() => navigate('/cook', { state: { ingredients: expiring.map((i) => i.name) } })}
          >
            Recipes using them
          </Button>
        </div>
      )}

      {isLoading ? (
        <GridSkeleton count={6} />
      ) : items.length === 0 ? (
        <EmptyState
          emoji="🥕"
          title="Your kitchen is empty"
          description="Add what you have, like tomato, onion or eggs, and we will find recipes you can cook."
        />
      ) : (
        <>
          <div className="hero-gradient relative flex flex-col gap-4 overflow-hidden rounded-3xl p-5 text-white shadow-lift sm:flex-row sm:items-center sm:justify-between">
            <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
            <div className="relative">
              <p className="font-display text-2xl font-semibold">
                {items.length} ingredient{items.length === 1 ? '' : 's'} in stock
              </p>
              <p className="text-sm text-white/80">Across {grouped.length} categor{grouped.length === 1 ? 'y' : 'ies'}. Let us turn them into a meal.</p>
            </div>
            <div className="relative flex gap-2">
              <Button variant="light" icon={ChefHat} to="/cook">
                What can I cook?
              </Button>
              <Button variant="glass" onClick={() => setConfirmClear(true)}>
                Clear all
              </Button>
            </div>
          </div>
          {grouped.map(([category, list]) => (
            <section key={category}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-subtle">
                <span className="text-lg" aria-hidden="true">{ingredientEmoji('', category)}</span>
                {category}
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{list.length}</span>
              </h3>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((item) => (
                  <PantryTile
                    key={item.id}
                    item={item}
                    onSave={save}
                    onRemove={(target) => remove.mutate(target.id, { onError: (e) => toast.error(getErrorMessage(e)) })}
                  />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => clear.mutate(undefined, { onSuccess: () => setConfirmClear(false) })}
        title="Clear your kitchen?"
        message="Every ingredient will be removed. You can add them again at any time."
        confirmLabel="Clear everything"
        danger
        loading={clear.isPending}
      />
    </div>
  );
};

const SOURCE_LABEL = { recipe: 'From recipe', plan: 'From meal plan', manual: 'Added by you' };

const ShoppingRow = ({ item, onToggle, onRemove }) => (
  <li className={`flex items-center gap-3 rounded-2xl border p-3 shadow-card transition-all ${item.is_checked ? 'border-brand/30 bg-brand-soft/40' : 'border-line bg-surface hover:border-brand/30'}`}>
    <button
      type="button"
      onClick={() => onToggle(item)}
      aria-pressed={item.is_checked}
      aria-label={`${item.is_checked ? 'Untick' : 'Tick'} ${item.name}`}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        item.is_checked ? 'border-brand bg-brand text-brand-fg' : 'border-line text-transparent hover:border-brand'
      }`}
    >
      <Check className="h-4 w-4" />
    </button>
    <IngredientIcon name={item.name} category={item.category} size="sm" />
    <div className="min-w-0 flex-1">
      <p className={`truncate font-semibold ${item.is_checked ? 'text-subtle line-through' : 'text-fg'}`}>{item.name}</p>
      <p className="truncate text-xs text-subtle">
        {SOURCE_LABEL[item.source] || item.source}
        {item.quantity ? ` · ${item.quantity}` : ''}
      </p>
    </div>
    <button
      type="button"
      onClick={() => onRemove(item)}
      aria-label={`Remove ${item.name}`}
      className="rounded-lg p-1.5 text-subtle hover:bg-danger-soft hover:text-danger"
    >
      <X className="h-4 w-4" />
    </button>
  </li>
);

const ShoppingTab = () => {
  const toast = useToast();
  const { data: items = [], isLoading, isError, refetch } = useShopping();
  const add = useAddShopping();
  const update = useUpdateShopping();
  const remove = useRemoveShopping();
  const clear = useClearShopping();
  const checkout = useCheckoutShopping();
  const fromPlan = useShoppingFromPlan();
  const [draft, setDraft] = useState([]);
  const [unrecognized, setUnrecognized] = useState([]);

  const open = items.filter((i) => !i.is_checked);
  const done = items.filter((i) => i.is_checked);
  const toggle = (item) => update.mutate({ id: item.id, changes: { is_checked: !item.is_checked } });
  const dropItem = (item) => remove.mutate(item.id);

  const addNames = async (names) => {
    try {
      const result = await add.mutateAsync({ names });
      setUnrecognized(result.unrecognized || []);
      setDraft([]);
      if (result.added) toast.success(`${result.added} item${result.added > 1 ? 's' : ''} added`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const addFromWeek = async () => {
    try {
      const result = await fromPlan.mutateAsync({ startDate: toISODate(mondayOf()), days: 7 });
      if (!result.meals_considered) toast.info('Create this week\'s meal plan first, then come back here.');
      else if (result.added) toast.success(`Added ${result.added} ingredient${result.added > 1 ? 's' : ''} for this week`);
      else toast.info('You already have everything this week\'s plan needs.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const buy = async () => {
    try {
      const result = await checkout.mutateAsync();
      toast.success(`${result.moved} item${result.moved > 1 ? 's' : ''} moved to your kitchen`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (isError) return <ErrorState message="Could not load your shopping list." onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-semibold text-fg">Add to your list</h2>
        <div className="mt-3">
          <IngredientPicker value={draft} onChange={setDraft} placeholder="What do you need to buy?" onSubmit={() => addNames(draft)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button icon={Plus} disabled={draft.length === 0} loading={add.isPending} onClick={() => addNames(draft)}>
            Add to list
          </Button>
          <Button variant="secondary" icon={CalendarDays} loading={fromPlan.isPending} onClick={addFromWeek}>
            Add what this week&apos;s plan needs
          </Button>
        </div>
        <Suggestions list={unrecognized} onPick={(name) => addNames([name])} />
      </Card>

      {isLoading ? (
        <GridSkeleton count={3} />
      ) : items.length === 0 ? (
        <EmptyState
          emoji="🛒"
          title="Your shopping list is empty"
          description="Add missing ingredients from any recipe, or pull in everything your weekly plan needs."
        />
      ) : (
        <>
          {open.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-subtle">🛒 To buy ({open.length})</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {open.map((item) => (
                  <ShoppingRow key={item.id} item={item} onToggle={toggle} onRemove={dropItem} />
                ))}
              </ul>
            </section>
          )}
          {done.length > 0 && (
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-subtle">🧺 In the basket ({done.length})</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => clear.mutate(true)}>
                    Clear
                  </Button>
                  <Button size="sm" icon={Refrigerator} loading={checkout.isPending} onClick={buy}>
                    Move to my kitchen
                  </Button>
                </div>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {done.map((item) => (
                  <ShoppingRow key={item.id} item={item} onToggle={toggle} onRemove={dropItem} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export const Kitchen = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'shopping' ? 'shopping' : 'pantry';
  const { data: shopping = [] } = useShopping();
  const openCount = shopping.filter((i) => !i.is_checked).length;

  return (
    <div>
      <PageHeader
        title="Kitchen"
        emoji="🧺"
        description="What you have in stock, and what you still need to buy."
        actions={
          <Button variant="secondary" icon={ScanLine} to="/scan">
            Scan an ingredient
          </Button>
        }
      />
      <Tabs
        value={tab}
        onChange={(id) => setParams(id === 'pantry' ? {} : { tab: id })}
        className="mb-6"
        tabs={[
          { id: 'pantry', label: 'My kitchen', icon: Refrigerator },
          { id: 'shopping', label: 'Shopping list', icon: ShoppingCart, count: openCount || undefined },
        ]}
      />
      {tab === 'pantry' ? <PantryTab /> : <ShoppingTab />}
    </div>
  );
};

export default Kitchen;
