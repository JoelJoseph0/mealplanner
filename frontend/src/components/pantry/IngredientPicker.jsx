import { useEffect, useRef, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { ingredientService } from '../../services';
import { ingredientEmoji } from '../food/visuals';

const normalize = (text) => text.trim().replace(/\s+/g, ' ');

export const IngredientPicker = ({
  value = [],
  onChange,
  placeholder = 'Type an ingredient, e.g. tomato, papaya, egg',
  quickPicks = [],
  autoFocus = false,
  onSubmit,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [highlight, setHighlight] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const selectedLower = value.map((v) => v.toLowerCase());

  useEffect(() => {
    const term = normalize(query);
    if (!term) {
      setSuggestions([]);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const results = await ingredientService.search(term, 8);
        if (!cancelled) {
          setSuggestions(results);
          setHighlight(0);
          setOpen(true);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }, 160);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const handleClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const addItems = (names) => {
    const next = [...value];
    names
      .map(normalize)
      .filter(Boolean)
      .forEach((name) => {
        if (!next.some((existing) => existing.toLowerCase() === name.toLowerCase())) next.push(name);
      });
    onChange(next);
    setQuery('');
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeItem = (name) => onChange(value.filter((item) => item !== name));
  const visible = suggestions.filter((s) => !selectedLower.includes(s.name.toLowerCase()));

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(visible.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      if (open && visible[highlight]) addItems([visible[highlight].name]);
      else if (normalize(query)) addItems(query.split(','));
      else if (event.key === 'Enter' && value.length && onSubmit) onSubmit();
    } else if (event.key === 'Backspace' && !query && value.length) {
      removeItem(value[value.length - 1]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const remainingQuick = quickPicks.filter((q) => !selectedLower.includes(q.toLowerCase()));

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="relative">
        <div
          className="flex min-h-[3.25rem] w-full cursor-text flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25"
          onClick={() => inputRef.current?.focus()}
        >
          <Search className="h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
          {value.map((item) => (
            <span key={item} className="inline-flex items-center gap-1 rounded-lg bg-brand-soft py-1 pl-2.5 pr-1 text-sm font-semibold text-brand">
              {item}
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeItem(item);
                }}
                className="rounded-md p-0.5 hover:bg-black/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            value={query}
            autoFocus={autoFocus}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => visible.length && setOpen(true)}
            placeholder={value.length ? 'Add more' : placeholder}
            aria-label="Search ingredients"
            className="min-w-[10rem] flex-1 bg-transparent py-1 text-sm text-fg placeholder:text-subtle focus:outline-none"
          />
          {normalize(query) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addItems(query.split(','));
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-soft px-2.5 py-1 text-sm font-semibold text-brand"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          )}
        </div>

        {open && visible.length > 0 && (
          <ul role="listbox" className="absolute z-30 mt-1.5 max-h-72 w-full overflow-y-auto rounded-2xl border border-line bg-surface py-1 shadow-card">
            {visible.map((item, idx) => (
              <li key={item.id} role="option" aria-selected={idx === highlight}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => addItems([item.name])}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${idx === highlight ? 'bg-brand-soft text-fg' : 'text-fg hover:bg-surface-2'}`}
                >
                  <span className="text-xl" aria-hidden="true">
                    {ingredientEmoji(item.name, item.category)}
                  </span>
                  <span className="flex-1 font-semibold">
                    {item.name}
                    {item.matched_alias && <span className="ml-1.5 font-normal text-subtle">({item.matched_alias})</span>}
                  </span>
                  <span className="text-xs text-subtle">{item.is_staple ? 'Basic' : item.category}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {remainingQuick.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-subtle">Quick add</span>
          {remainingQuick.map((pick) => (
            <button
              key={pick}
              type="button"
              onClick={() => addItems([pick])}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-muted transition-colors hover:border-brand hover:text-brand"
            >
              <span aria-hidden="true">{ingredientEmoji(pick)}</span>
              {pick}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default IngredientPicker;
