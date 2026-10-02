import React, { useMemo, useState } from 'react';
import { Briefcase } from 'lucide-react';
import { Chips, HeroSearch, PageHero } from '../components/PageHero';
import { GroupCard } from '../components/GroupCard';
import { usePublicGroups } from '../hooks/usePublicGroups';
import { portalLink } from '../lib/links';

const FILTERS = [
  { value: 'ALL', label: 'All departures' },
  { value: 'GROUP', label: 'Group tickets' },
  { value: 'UMRAH', label: 'Umrah packages' },
] as const;

export const PublicGroupsPage: React.FC = () => {
  const { groups, loading, error } = usePublicGroups();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('ALL');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter(
      (g) =>
        (filter === 'ALL' || g.type === filter) &&
        (!q ||
          [g.title, g.sector, g.airline, g.destination].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [groups, filter, query]);

  return (
    <div className="bg-canvas pb-20">
      <PageHero
        eyebrow="Fixed group departures"
        title="Group tickets and Umrah, with guaranteed seats"
        subtitle="Fixed dates from Lahore, Islamabad, Karachi and Peshawar to Jeddah, Madinah, Dubai and Riyadh. Sign in as a partner to see fares and book seats."
      >
        <HeroSearch
          value={query}
          onChange={setQuery}
          placeholder="City, sector or airline"
          label="Search departures"
        />
        <Chips className="mt-4" value={filter} onChange={setFilter} items={[...FILTERS]} />
      </PageHero>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        {error ? (
          <div className="rounded-3xl border border-line bg-surface p-10 text-center text-ink-2">
            We couldn't load departures right now. Please try again shortly or contact us on
            WhatsApp.
          </div>
        ) : loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-80 animate-pulse rounded-3xl bg-surface" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-3xl border border-line bg-surface p-10 text-center text-ink-2">
            No departures match your search.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((g) => (
              <GroupCard key={g.productId} group={g} />
            ))}
          </div>
        )}

        <div className="mt-16 flex flex-col items-start justify-between gap-6 rounded-3xl bg-surface p-7 ring-1 ring-line sm:p-10 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink">
              <Briefcase size={22} />
            </span>
            <div>
              <h2 className="text-[21px] font-semibold tracking-[-0.02em] text-ink">
                Are you a travel agent?
              </h2>
              <p className="mt-1 max-w-xl text-[15px] leading-relaxed text-ink-3">
                Partners get live partner fares, instant seat requests, a running account balance
                and credit on the GNK Connect partner portal.
              </p>
            </div>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <a
              href={portalLink('/login')}
              className="flex h-11 flex-1 items-center justify-center rounded-full px-5 text-[15px] font-medium text-brand-ink ring-1 ring-line hover:bg-surface-2 sm:flex-none"
            >
              Sign in
            </a>
            <a
              href={portalLink('/register')}
              className="flex h-11 flex-1 items-center justify-center rounded-full bg-brand-gradient px-5 text-[15px] font-semibold text-white hover:brightness-110 sm:flex-none"
            >
              Become a partner
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicGroupsPage;
