import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
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
            <table className="w-full min-w-[40rem] text-left text-sm">
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
                    <td className="px-5 py-3.5 text-right">
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
