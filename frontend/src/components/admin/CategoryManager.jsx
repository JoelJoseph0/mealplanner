import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, X } from 'lucide-react';
import { adminService } from '../../services';
import { getErrorMessage } from '../../services/api';
import { ingredientEmoji } from '../food/visuals';
import { Button, Dialog, ListSkeleton, useToast } from '../ui';

const CategoryRow = ({ category, names, onRename, busy }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(category.name);
  const target = value.trim();
  const merges = target && target !== category.name && names.includes(target);

  const save = () => {
    if (!target || target === category.name) {
      setEditing(false);
      return;
    }
    onRename(category.name, target, () => setEditing(false));
  };

  return (
    <li className="flex items-center gap-3 p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-xl" aria-hidden="true">
        {ingredientEmoji('', category.name)}
      </span>
      {editing ? (
        <div className="min-w-0 flex-1">
          <input
            value={value}
            autoFocus
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') setEditing(false);
            }}
            aria-label={`New name for ${category.name}`}
            list="category-names"
            className="w-full rounded-xl border border-brand bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-4 focus:ring-brand/15"
          />
          {merges && <p className="mt-1 text-xs text-warn">This will merge into the existing {target} category.</p>}
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-fg">{category.name}</p>
          <p className="text-xs text-subtle">
            {category.count} ingredient{category.count === 1 ? '' : 's'}
          </p>
        </div>
      )}
      {editing ? (
        <div className="flex gap-1">
          <button type="button" onClick={save} disabled={busy} aria-label="Save category name" className="rounded-xl p-2 text-brand hover:bg-brand-soft">
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setValue(category.name);
              setEditing(false);
            }}
            aria-label="Cancel"
            className="rounded-xl p-2 text-subtle hover:bg-surface-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setEditing(true)} aria-label={`Rename ${category.name}`} className="rounded-xl p-2 text-subtle hover:bg-surface-2 hover:text-fg">
          <Pencil className="h-4 w-4" />
        </button>
      )}
    </li>
  );
};

export const CategoryManager = ({ open, onClose }) => {
  const toast = useToast();
  const client = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['admin', 'categories'], queryFn: adminService.categories, enabled: open });
  const rename = useMutation({
    mutationFn: ({ name, newName }) => adminService.renameCategory(name, newName),
    onSuccess: (result) => {
      client.invalidateQueries({ queryKey: ['admin'] });
      toast.success(`Moved ${result.updated} ingredient${result.updated === 1 ? '' : 's'} to ${result.name}`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
  const names = data.map((c) => c.name);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Ingredient categories"
      description="Rename a category, or give it the name of another one to merge them."
      footer={<Button onClick={onClose}>Done</Button>}
    >
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : (
        <>
          <datalist id="category-names">
            {names.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {data.map((category) => (
              <CategoryRow
                key={category.name}
                category={category}
                names={names}
                busy={rename.isPending}
                onRename={(name, newName, done) => rename.mutate({ name, newName }, { onSuccess: done })}
              />
            ))}
          </ul>
        </>
      )}
    </Dialog>
  );
};

export default CategoryManager;
