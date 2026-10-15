import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Power, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react';
import { adminService } from '../../services';
import { getErrorMessage } from '../../services/api';
import { formatShort } from '../../lib/dates';
import { useAuth } from '../../hooks/useAuth';
import { Badge, Button, Card, ConfirmDialog, ErrorState, ListSkeleton, PageHeader, SearchBar, useToast } from '../../components/ui';

export const Users = () => {
  const toast = useToast();
  const client = useQueryClient();
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState(null);

  const { data = [], isLoading, isError, error, refetch } = useQuery({ queryKey: ['admin', 'users'], queryFn: adminService.users });
  const remove = useMutation({
    mutationFn: adminService.deleteUser,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['admin'] });
      toast.success('User removed.');
      setTarget(null);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
      setTarget(null);
    },
  });

  const update = useMutation({
    mutationFn: ({ id, changes }) => adminService.updateUser(id, changes),
    onSuccess: (_, { changes }) => {
      client.invalidateQueries({ queryKey: ['admin'] });
      if (changes.is_active === false) toast.success('Account disabled. They can no longer sign in.');
      else if (changes.is_active === true) toast.success('Account enabled.');
      else toast.success(changes.role === 'admin' ? 'User is now an administrator.' : 'Administrator access removed.');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.filter((u) => !query || u.full_name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query));
  }, [data, search]);

  return (
    <div>
      <PageHeader title="Users" emoji="👥" description={`${data.length} registered account${data.length === 1 ? '' : 's'}.`} />
      <SearchBar value={search} onChange={setSearch} placeholder="Search by name or email" className="mb-5 max-w-md" />

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-subtle">
                <tr>
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-fg">{u.full_name}</p>
                      <p className="text-subtle">{u.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={u.role === 'admin' ? 'info' : 'neutral'}>{u.role}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={u.is_active ? 'brand' : 'danger'}>{u.is_active ? 'Active' : 'Disabled'}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-muted">{formatShort(u.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={u.role === 'admin' ? ShieldOff : ShieldCheck}
                        disabled={u.id === me?.id || update.isPending}
                        onClick={() => update.mutate({ id: u.id, changes: { role: u.role === 'admin' ? 'user' : 'admin' } })}
                        aria-label={u.role === 'admin' ? `Remove admin access from ${u.full_name}` : `Make ${u.full_name} an admin`}
                      >
                        {u.role === 'admin' ? 'Make user' : 'Make admin'}
                      </Button>
                      <Button
                        variant={u.is_active ? 'secondary' : 'soft'}
                        size="sm"
                        icon={Power}
                        disabled={u.id === me?.id || update.isPending}
                        onClick={() => update.mutate({ id: u.id, changes: { is_active: !u.is_active } })}
                        aria-label={u.is_active ? `Disable ${u.full_name}` : `Enable ${u.full_name}`}
                      >
                        {u.is_active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="dangerSoft"
                        size="sm"
                        icon={Trash2}
                        disabled={u.id === me?.id}
                        onClick={() => setTarget(u)}
                        aria-label={`Delete ${u.full_name}`}
                      >
                        Delete
                      </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-muted">
                      No users match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        onConfirm={() => remove.mutate(target.id)}
        title="Delete this user?"
        message={`${target?.full_name} (${target?.email}) and all of their pantry, plans and history will be permanently removed.`}
        confirmLabel="Delete user"
        danger
        loading={remove.isPending}
      />
    </div>
  );
};

export default Users;
