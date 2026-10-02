import { useSearchParams, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  SegmentedControl,
  Select,
  Spinner,
} from '@gnk/ui';
import { api, useAuth } from '@/lib/api';
import { keys } from '@/lib/query';
import { GroupFareCard } from '@/components/GroupFareCard';
import { can } from '@/components/guards';
import { serviceBySlug, useServiceListings } from '@/lib/services';

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
  const query = {
    airline: params.get('airline') || undefined,
    sector: params.get('sector') || undefined,
    days: params.get('days') ? Number(params.get('days')) : undefined,
    type: service.type,
    page: Number(params.get('page') ?? 1),
    pageSize: 25,
  };

  const filters = useQuery({
    queryKey: keys.groupFilters,
    queryFn: api.groups.filters,
    staleTime: 5 * 60_000,
  });
  const groups = useQuery({
    queryKey: keys.groups(query),
    queryFn: () => api.groups.search(query),
    placeholderData: keepPreviousData,
  });

  const set = (k: string, v: string | undefined) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const approved = session!.account.accountStatus === 'APPROVED';
  const canBook = approved && can.book(session!.account.role);

  return (
    <>
      <PageHeader
        title={service.title}
        description={
          approved
            ? 'Choose a departure and hold seats. Your partner fare is shown per adult.'
            : 'Fares appear once your account is approved.'
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

      <div className="mb-5 grid gap-3 rounded-xl bg-surface p-3 shadow-card sm:grid-cols-3">
        <Select
          value={params.get('airline') ?? ''}
          onChange={(e) => set('airline', e.target.value || undefined)}
          aria-label="Airline"
        >
          <option value="">All airlines</option>
          {filters.data?.airlines?.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select
          value={params.get('sector') ?? ''}
          onChange={(e) => set('sector', e.target.value || undefined)}
          aria-label="Sector"
        >
          <option value="">All sectors</option>
          {filters.data?.sectors?.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select
          value={params.get('days') ?? ''}
          onChange={(e) => set('days', e.target.value || undefined)}
          aria-label="Trip"
        >
          <option value="">All trips</option>
          {filters.data?.durations?.map((d) => (
            <option key={d} value={d}>
              {d} day{d === 1 ? '' : 's'}
            </option>
          ))}
        </Select>
      </div>

      {groups.error ? (
        <ErrorState error={groups.error} onRetry={() => groups.refetch()} />
      ) : groups.isLoading ? (
        <Spinner className="py-20" />
      ) : !groups.data?.items.length ? (
        <EmptyState
          icon={<SearchIcon />}
          title={`No ${service.title.toLowerCase()} match these filters`}
          description="Try a different airline, sector or trip length."
        />
      ) : (
        <div className="space-y-4">
          {groups.data.items.map((g) => (
            <GroupFareCard key={g.departureId} group={g} canBook={canBook} />
          ))}
          <Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={groups.data.total}
            onChange={(p) => set('page', String(p))}
          />
        </div>
      )}
    </>
  );
}
