import { useEffect, useState } from 'react';
import type { PublicGroupDto } from '@gnk/types';
import { publicApi } from '../lib/api';

export interface PublicGroup {
  productId: string;
  type: PublicGroupDto['type'];
  title: string;
  sector: string | null;
  airline: string | null;
  destination: string;
  durationDays: number | null;
  baggage: string | null;
  departures: {
    id: string;
    date: string;
    returnDate: string | null;
    seats: number;
    status: PublicGroupDto['status'];
  }[];
}

/** Upcoming published groups, one entry per product with its departures. */
export function usePublicGroups() {
  const [groups, setGroups] = useState<PublicGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    publicApi
      .groups()
      .then(({ items }) => {
        if (cancelled) return;
        const byProduct = new Map<string, PublicGroup>();
        for (const d of items) {
          const g =
            byProduct.get(d.productId) ??
            byProduct
              .set(d.productId, {
                productId: d.productId,
                type: d.type,
                title: d.title,
                sector: d.sector,
                airline: d.airline,
                destination: d.destination,
                durationDays: d.durationDays,
                baggage: d.baggage,
                departures: [],
              })
              .get(d.productId)!;
          g.departures.push({
            id: d.departureId,
            date: d.departureDate,
            returnDate: d.returnDate,
            seats: d.seatsAvailable,
            status: d.status,
          });
        }
        setGroups([...byProduct.values()]);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return { groups, loading, error };
}
