import React, { useMemo, useState } from 'react';
import { Briefcase, Search } from 'lucide-react';
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
    <div className="bg-gray-50 pb-20">
      <section className="bg-[#00205B] pb-24 pt-32 text-white">
        <div className="container mx-auto px-4 md:px-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
            Fixed group departures
          </p>
          <h1 className="mt-2 max-w-3xl font-display text-4xl font-bold md:text-5xl">
            Group tickets and Umrah packages with guaranteed seats
          </h1>
          <p className="mt-4 max-w-2xl text-white/75">
            Fixed dates from Lahore, Islamabad, Karachi and Peshawar to Jeddah, Madinah, Dubai and
            Riyadh. Message our team for today's fares and availability.
          </p>
        </div>
      </section>

      <div className="container mx-auto -mt-12 px-4 md:px-6">
        <div className="mb-8 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-lg md:flex-row md:items-center">
          <div className="flex gap-1.5 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors ${filter === f.value ? 'bg-[#00205B] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city, sector or airline"
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </label>
        </div>

        {error ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-600">
            We couldn't load departures right now. Please try again shortly or contact us on
            WhatsApp.
          </div>
        ) : loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-80 animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-600">
            No departures match your search.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((g) => (
              <GroupCard key={g.productId} group={g} />
            ))}
          </div>
        )}

        <div className="mt-12 flex flex-col items-start justify-between gap-5 rounded-2xl bg-[#0B1528] p-8 text-white md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
              <Briefcase size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Are you a travel agent?</h2>
              <p className="mt-1 max-w-xl text-sm text-white/70">
                Partners get live partner fares, instant seat requests, a running account balance
                and credit on the GNK Connect partner portal.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={portalLink('/login')}
              className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
            >
              Partner sign in
            </a>
            <a
              href={portalLink('/register')}
              className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-[#00205B] hover:bg-cyan-300"
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
