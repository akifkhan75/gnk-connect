import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
  SegmentedControl,
  Select,
} from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { keys } from '@/lib/query';
import { GroupsTable } from '@/components/GroupsTable';
import { can } from '@/components/guards';
import { serviceBySlug, useServiceListings } from '@/lib/services';

const FILTERS = ['q', 'sector', 'airline', 'from', 'to', 'minSeats', 'sort'] as const;

/** Old /groups links land on the group ticket listing. */
export function GroupsRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/book/groups${search}`} replace />;
}

/** One listing per service (group tickets, Umrah packages, hotels…), chosen by the URL. */
export function GroupsPage() {
  const { service: slug } = useParams();
  const service = serviceBySlug(slug);
  if (!service) return <Navigate to="/book/groups" replace />;
  return <Listing key={service.slug} slug={service.slug} />;
}

function Listing({ slug }: { slug: string }) {
  const service = serviceBySlug(slug)!;
  const listings = useServiceListings();
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [text, setText] = useState(params.get('q') ?? '');
  const query = {
    ...Object.fromEntries(FILTERS.map((k) => [k, params.get(k) || undefined])),
    type: service.type,
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
        title={service.title}
        description={
          approved
            ? `${service.description} Your partner fare is shown per seat and updates live.`
            : `${service.description} Fares appear once your account is approved.`
        }
      />
      {listings.length > 1 && (
        <SegmentedControl
          className="mb-5"
          value={service.slug}
          onChange={(v) => navigate(`/book/${v}`)}
          items={listings.map((l) => ({ value: l.slug, label: l.title }))}
        />
      )}
      <Card>
        <div className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))_minmax(0,0.8fr)_minmax(0,0.8fr)_auto]">
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
                  title={`No ${service.title.toLowerCase()} match these filters`}
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
