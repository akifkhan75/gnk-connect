import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FileClock } from 'lucide-react';
import type { AuditLogDto } from '@gnk/types';
import {
  Badge,
  Card,
  DataTable,
  Drawer,
  EmptyState,
  ErrorState,
  Input,
  KeyValue,
  PageHeader,
  Pagination,
  formatDateTime,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { RequirePerm } from '@/components/guards';

export function AuditPage() {
  return (
    <RequirePerm perm="audit:read">
      <Audit />
    </RequirePerm>
  );
}

function Audit() {
  const [f, setF] = useState({ action: '', entityId: '', page: 1 });
  const [open, setOpen] = useState<AuditLogDto | null>(null);
  const q = useQuery({
    queryKey: ['audit', f],
    queryFn: () =>
      api.audit({
        page: f.page,
        pageSize: 50,
        action: f.action || undefined,
        entityId: f.entityId || undefined,
      }),
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every sign-in, approval, payment, pricing and booking change, with who did it and from where."
      />
      <Card>
        <div className="grid gap-3 border-b p-4 sm:grid-cols-[240px_minmax(0,1fr)]">
          <Input
            placeholder="Action starts with, e.g. booking."
            value={f.action}
            onChange={(e) => setF({ ...f, action: e.target.value, page: 1 })}
          />
          <Input
            placeholder="Entity id (booking, partner, payment…)"
            value={f.entityId}
            onChange={(e) => setF({ ...f, entityId: e.target.value.trim(), page: 1 })}
          />
        </div>
        {q.error ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <>
            <DataTable
              dense
              rows={q.data?.items}
              loading={q.isLoading}
              rowKey={(a) => a.id}
              onRowClick={setOpen}
              empty={<EmptyState icon={<FileClock />} title="No entries" />}
              columns={[
                {
                  key: 't',
                  header: 'Time',
                  cell: (a) => (
                    <span className="whitespace-nowrap">{formatDateTime(a.createdAt)}</span>
                  ),
                },
                {
                  key: 'a',
                  header: 'Action',
                  cell: (a) => <span className="font-mono text-xs">{a.action}</span>,
                },
                {
                  key: 'w',
                  header: 'Who',
                  cell: (a) => (
                    <span className="flex items-center gap-2">
                      {a.actorRealm && (
                        <Badge tone={a.actorRealm === 'STAFF' ? 'gold' : 'primary'}>
                          {a.actorRealm === 'STAFF' ? 'Staff' : 'Partner'}
                        </Badge>
                      )}
                      <span className="truncate">{a.actorName ?? 'System'}</span>
                    </span>
                  ),
                },
                {
                  key: 'e',
                  header: 'Entity',
                  hideBelow: 'md',
                  cell: (a) => (
                    <span className="text-xs text-muted-foreground">
                      {a.entityType} · {a.entityId.slice(0, 8)}…
                    </span>
                  ),
                },
                {
                  key: 'i',
                  header: 'IP',
                  hideBelow: 'lg',
                  cell: (a) => <span className="tabular text-xs">{a.ip}</span>,
                },
              ]}
            />
            {q.data && (
              <Pagination
                page={f.page}
                pageSize={50}
                total={q.data.total}
                onChange={(page) => setF({ ...f, page })}
              />
            )}
          </>
        )}
      </Card>
      <Drawer
        open={!!open}
        onOpenChange={(o) => !o && setOpen(null)}
        title={open?.action ?? ''}
        description={open && formatDateTime(open.createdAt)}
      >
        {open && (
          <div className="space-y-5">
            <KeyValue
              items={[
                { label: 'By', value: open.actorName ?? 'System' },
                { label: 'IP', value: open.ip },
                { label: 'Entity', value: `${open.entityType} ${open.entityId}`, wide: true },
              ]}
            />
            <Diff before={open.before} after={open.after} />
          </div>
        )}
      </Drawer>
    </>
  );
}

/** Field-level before/after view; changed keys are highlighted. */
function Diff({ before, after }: { before: unknown; after: unknown }) {
  const b = (before ?? {}) as Record<string, unknown>;
  const a = (after ?? {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])];
  if (!keys.length)
    return <p className="text-sm text-muted-foreground">No field changes recorded.</p>;
  const show = (v: unknown) =>
    v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
          <th className="py-2">Field</th>
          <th>Before</th>
          <th>After</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((k) => {
          const changed = show(b[k]) !== show(a[k]);
          return (
            <tr key={k} className={`border-b align-top ${changed ? 'bg-warning-soft/60' : ''}`}>
              <td className="py-1.5 pr-3 font-medium">{k}</td>
              <td className="max-w-[16rem] break-words pr-3 font-mono text-xs text-muted-foreground">
                {show(b[k])}
              </td>
              <td className="max-w-[16rem] break-words font-mono text-xs">{show(a[k])}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
