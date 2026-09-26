import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { RotateCcw, Search as SearchIcon } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
} from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { keys } from '@/lib/query';
import { TYPE_LABEL } from '@/lib/labels';
import { GroupsTable } from '@/components/GroupsTable';
import { can } from '@/components/guards';

const FILTERS = ['q', 'sector', 'airline', 'type', 'from', 'to', 'minSeats', 'sort'] as const;

export function GroupsPage() {
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const query = {
    ...Object.fromEntries(FILTERS.map((k) => [k, params.get(k) || undefined])),
    page: Number(params.get('page') ?? 1),
    pageSize: 25,
  } as Record<string, string | number | undefined> & { page: number; pageSize: number };

  const filters = useQuery({
    queryKey: keys.groupFilters,
    queryFn: api.groups.filters,
    staleTime: 5 * 60_000,
  });
  const groups = useQuery({
    queryKey: keys.groups(query),
    queryFn: () => api.groups.search(query as never),
    placeholderData: keepPreviousData,
  });

  const set = (k: string, v: string | undefined) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  // Debounce the free-text search.
  useEffect(() => {
    const t = setTimeout(
      () => (text !== (params.get('q') ?? '') ? set('q', text.trim() || undefined) : undefined),
      350,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const approved = session!.account.accountStatus === 'APPROVED';
  const active = FILTERS.some((k) => k !== 'sort' && params.get(k));

  return (
    <>
      <PageHeader
        title="Groups & fares"
        description={
          approved
            ? 'Live group seats with your partner fare per seat. Seats and fares update from the airline.'
            : 'Browse upcoming groups. Fares appear once your account is approved.'
        }
      />
      <Card>
        <div className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_minmax(0,0.8fr)_minmax(0,0.8fr)_auto]">
          <SearchInput
            placeholder="City, sector or airline"
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Search"
          />
          <Select
            value={params.get('sector') ?? ''}
            onChange={(e) => set('sector', e.target.value)}
            aria-label="Sector"
          >
            <option value="">All sectors</option>
            {filters.data?.sectors.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <Select
            value={params.get('airline') ?? ''}
            onChange={(e) => set('airline', e.target.value)}
            aria-label="Airline"
          >
            <option value="">All airlines</option>
            {filters.data?.airlines.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <Select
            value={params.get('type') ?? ''}
            onChange={(e) => set('type', e.target.value)}
            aria-label="Type"
          >
            <option value="">All products</option>
            {filters.data?.types.map((s) => (
              <option key={s} value={s}>
                {TYPE_LABEL[s] ?? s}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            value={params.get('from') ?? ''}
            onChange={(e) => set('from', e.target.value)}
            aria-label="Departing from"
            title="Departing from"
          />
          <Input
            type="date"
            value={params.get('to') ?? ''}
            onChange={(e) => set('to', e.target.value)}
            aria-label="Departing until"
            title="Departing until"
          />
          <div className="flex gap-2">
            <Select
              value={params.get('sort') ?? 'date'}
              onChange={(e) => set('sort', e.target.value === 'date' ? undefined : e.target.value)}
              aria-label="Sort"
              className="min-w-32"
            >
              <option value="date">Sort: date</option>
              {approved && <option value="price">Sort: fare</option>}
              <option value="seats">Sort: seats</option>
            </Select>
            {active && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setText('');
                  setParams(new URLSearchParams(), { replace: true });
                }}
                aria-label="Clear filters"
                title="Clear filters"
              >
                <RotateCcw />
              </Button>
            )}
          </div>
        </div>
        {groups.error ? (
          <ErrorState error={groups.error} onRetry={() => groups.refetch()} />
        ) : (
          <>
            <GroupsTable
              rows={groups.data?.items}
              loading={groups.isLoading}
              canBook={approved && can.book(session!.account.role)}
              empty={
                <EmptyState
                  icon={<SearchIcon />}
                  title="No groups match these filters"
                  description="Try a different sector or widen the date range."
                />
              }
            />
            {groups.data && (
              <Pagination
                page={query.page}
                pageSize={query.pageSize}
                total={groups.data.total}
                onChange={(p) => set('page', String(p))}
              />
            )}
          </>
        )}
      </Card>
    </>
  );
}
