import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ChefHat, Package, Plus, Timer, Trash2 } from 'lucide-react';
import pantryService from '../../services/pantryService';
import { getErrorMessage } from '../../services/api';
import { UserContext } from '../../context/UserContext';
import IngredientPicker from '../../components/pantry/IngredientPicker';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { QUICK_PICK_INGREDIENTS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';

const PantryRow = ({ item, onSave, onRemove }) => {
  const [quantity, setQuantity] = useState(item.quantity || '');
  const [expiry, setExpiry] = useState(item.expiry_date || '');

  useEffect(() => {
    setQuantity(item.quantity || '');
    setExpiry(item.expiry_date || '');
  }, [item.quantity, item.expiry_date]);

  const commitQuantity = () => {
    if ((item.quantity || '') !== quantity.trim()) {
      onSave(item, { quantity: quantity.trim() });
    }
  };

  const commitExpiry = (value) => {
    setExpiry(value);
    onSave(item, value ? { expiry_date: value } : { clear_expiry: true });
  };

  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">{item.name}</span>
          {item.is_staple && (
            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold uppercase">Basic</span>
          )}
          {item.expires_soon && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 text-[10px] font-bold uppercase">
              <Timer className="w-3 h-3" /> Use soon
            </span>
          )}
        </div>
        {item.expiry_date && (
          <span className="text-[11px] text-slate-400">Best before {formatDate(item.expiry_date)}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          onBlur={commitQuantity}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          placeholder="Qty (e.g. 1 kg)"
          aria-label={`Quantity of ${item.name}`}
          className="w-32 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <input
          type="date"
          value={expiry}
          onChange={(e) => commitExpiry(e.target.value)}
          aria-label={`Expiry date of ${item.name}`}
          className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="button"
          onClick={() => onRemove(item)}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
          title={`Remove ${item.name}`}
          aria-label={`Remove ${item.name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
};

export const Pantry = () => {
  const navigate = useNavigate();
  const userContext = useContext(UserContext);
  const showToast = userContext?.showToast;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toAdd, setToAdd] = useState([]);
  const [adding, setAdding] = useState(false);
  const [unrecognized, setUnrecognized] = useState([]);
  const [confirmClear, setConfirmClear] = useState(false);

  const loadPantry = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await pantryService.getPantry());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPantry();
  }, []);

  const grouped = useMemo(() => {
    const groups = {};
    items.forEach((item) => {
      const key = item.category || 'Others';
      groups[key] = groups[key] || [];
      groups[key].push(item);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const expiringSoon = items.filter((i) => i.expires_soon);

  const handleAdd = async (names = toAdd) => {
    if (!names.length) return;
    setAdding(true);
    try {
      const result = await pantryService.addItems({ names });
      setUnrecognized(result.unrecognized || []);
      const saved = (result.added?.length || 0) + (result.updated?.length || 0);
      if (saved) showToast?.(`${saved} ingredient(s) saved to your pantry`);
      setToAdd((current) => current.filter((n) => (result.unrecognized || []).some((u) => u.input === n)));
      setItems(await pantryService.getPantry());
    } catch (err) {
      showToast?.(getErrorMessage(err), 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleSave = async (item, changes) => {
    try {
      const updated = await pantryService.updateItem(item.id, changes);
      setItems((current) => current.map((i) => (i.id === item.id ? updated : i)));
    } catch (err) {
      showToast?.(getErrorMessage(err), 'error');
    }
  };

  const handleRemove = async (item) => {
    try {
      await pantryService.removeItem(item.id);
      setItems((current) => current.filter((i) => i.id !== item.id));
    } catch (err) {
      showToast?.(getErrorMessage(err), 'error');
    }
  };

  const handleClear = async () => {
    try {
      await pantryService.clearPantry();
      setItems([]);
      setConfirmClear(false);
      showToast?.('Pantry cleared');
    } catch (err) {
      showToast?.(getErrorMessage(err), 'error');
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage message="Opening your pantry..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadPantry} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
            <Package className="w-3.5 h-3.5" /> Kitchen Stock
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">My Pantry</h1>
          <p className="text-sm text-slate-500 mt-1">
            Keep track of the ingredients you have. Recipes, recommendations and meal plans use this list.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={Camera} onClick={() => navigate('/food-upload')}>
            Scan Ingredient
          </Button>
          <Button variant="primary" size="sm" icon={ChefHat} onClick={() => navigate('/cook')} disabled={!items.length}>
            What Can I Cook?
          </Button>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Add ingredients</h2>
        <IngredientPicker value={toAdd} onChange={setToAdd} quickPicks={QUICK_PICK_INGREDIENTS} />
        <Button variant="primary" icon={Plus} onClick={() => handleAdd()} disabled={!toAdd.length} loading={adding}>
          Add {toAdd.length ? `${toAdd.length} ` : ''}to Pantry
        </Button>
        {unrecognized.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
            {unrecognized.map((u) => (
              <div key={u.input} className="flex flex-wrap items-center gap-2">
                <span>
                  Could not find <strong>&quot;{u.input}&quot;</strong>.
                </span>
                {u.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setToAdd((current) => current.filter((n) => n !== u.input));
                      handleAdd([s]);
                    }}
                    className="px-2 py-0.5 rounded-md bg-white border border-amber-300 font-semibold hover:bg-amber-100 cursor-pointer"
                  >
                    Add {s}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {expiringSoon.length > 0 && (
        <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm text-orange-900">
            <span className="font-bold flex items-center gap-1.5">
              <Timer className="w-4 h-4" /> Use these soon
            </span>
            <span className="text-xs">{expiringSoon.map((i) => i.name).join(', ')}</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={ChefHat}
            onClick={() => navigate('/cook', { state: { ingredients: expiringSoon.map((i) => i.name) } })}
          >
            Recipes using them
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Your pantry is empty"
          description="Add what you have in stock, like tomato, onion or papaya, and we will find recipes you can cook."
        />
      ) : (
        <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
            <span className="text-sm font-bold text-slate-900">
              {items.length} ingredient{items.length === 1 ? '' : 's'} in stock
            </span>
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer"
            >
              Clear pantry
            </button>
          </div>
          <div className="px-5 sm:px-6 divide-y divide-slate-100">
            {grouped.map(([category, list]) => (
              <section key={category} className="py-3">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{category}</h3>
                <ul className="divide-y divide-slate-50">
                  {list.map((item) => (
                    <PantryRow key={item.id} item={item} onSave={handleSave} onRemove={handleRemove} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={handleClear}
        title="Clear Pantry"
        message="Remove every ingredient from your pantry? You can add them again any time."
        confirmText="Clear"
      />
    </div>
  );
};

export default Pantry;
