import { useEffect, useRef, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import pantryService from '../../services/pantryService';

const normalize = (text) => text.trim().replace(/\s+/g, ' ');

export const IngredientPicker = ({
  value = [],
  onChange,
  placeholder = 'Type an ingredient, e.g. tomato, papaya, egg...',
  quickPicks = [],
  autoFocus = false,
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
        const results = await pantryService.searchIngredients(term, 8);
        if (!cancelled) {
          setSuggestions(results);
          setHighlight(0);
          setOpen(true);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const handleClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
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
        if (!next.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
          next.push(name);
        }
      });
    onChange(next);
    setQuery('');
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeItem = (name) => {
    onChange(value.filter((item) => item !== name));
  };

  const visibleSuggestions = suggestions.filter((s) => !selectedLower.includes(s.name.toLowerCase()));

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(visibleSuggestions.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      if (open && visibleSuggestions[highlight]) {
        addItems([visibleSuggestions[highlight].name]);
      } else if (normalize(query)) {
        addItems(query.split(','));
      }
    } else if (event.key === 'Backspace' && !query && value.length) {
      removeItem(value[value.length - 1]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const remainingQuickPicks = quickPicks.filter((q) => !selectedLower.includes(q.toLowerCase()));

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="relative">
        <div
          className="flex flex-wrap items-center gap-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-colors cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold"
            >
              {item}
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeItem(item);
                }}
                className="p-0.5 rounded-md text-emerald-600 hover:bg-emerald-100 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            value={query}
            autoFocus={autoFocus}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => visibleSuggestions.length && setOpen(true)}
            placeholder={value.length ? 'Add more...' : placeholder}
            aria-label="Ingredient search"
            className="flex-1 min-w-[160px] bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none py-1"
          />
          {normalize(query) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addItems(query.split(','));
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          )}
        </div>

        {open && visibleSuggestions.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-30 mt-1.5 w-full max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-lg py-1"
          >
            {visibleSuggestions.map((item, idx) => (
              <li key={item.id} role="option" aria-selected={idx === highlight}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => addItems([item.name])}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-sm cursor-pointer ${
                    idx === highlight ? 'bg-emerald-50 text-emerald-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-semibold">
                    {item.name}
                    {item.matched_alias && (
                      <span className="ml-1.5 text-xs font-normal text-slate-400">({item.matched_alias})</span>
                    )}
                  </span>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {item.is_staple ? 'Staple' : item.category}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {remainingQuickPicks.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick add:</span>
          {remainingQuickPicks.map((pick) => (
            <button
              key={pick}
              type="button"
              onClick={() => addItems([pick])}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:border-emerald-300 hover:text-emerald-700 cursor-pointer transition-colors"
            >
              <Plus className="w-3 h-3" /> {pick}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default IngredientPicker;
