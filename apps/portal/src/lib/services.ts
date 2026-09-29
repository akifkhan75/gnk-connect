import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Car,
  FileCheck2,
  Landmark,
  Moon,
  Package,
  Plane,
  type LucideIcon,
} from 'lucide-react';
import type { ProductType } from '@gnk/types';
import { api } from './api';
import { keys } from './query';

export interface ServiceListing {
  slug: string;
  type: ProductType;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Always shown in navigation, even before inventory exists. */
  primary?: boolean;
}

/** One listing per product type, in navigation order. */
export const SERVICE_LISTINGS: ServiceListing[] = [
  {
    slug: 'groups',
    type: 'GROUP',
    title: 'Group tickets',
    description: 'Fixed-date group seats on Saudia, PIA, Emirates, flydubai and more.',
    icon: Plane,
    primary: true,
  },
  {
    slug: 'umrah',
    type: 'UMRAH',
    title: 'Umrah packages',
    description: 'Flights, hotels in Makkah and Madinah, visa and transport in one package.',
    icon: Moon,
    primary: true,
  },
  {
    slug: 'hotels',
    type: 'HOTEL',
    title: 'Hotels',
    description: 'Hotel inventory in Saudi Arabia, the UAE and beyond.',
    icon: Building2,
  },
  {
    slug: 'ziarat',
    type: 'ZIARAT',
    title: 'Ziarat tours',
    description: 'Guided ziarat in Makkah, Madinah and Taif.',
    icon: Landmark,
  },
  {
    slug: 'flights',
    type: 'FLIGHT',
    title: 'Flights',
    description: 'Individual airline seats at partner fares.',
    icon: Plane,
  },
  {
    slug: 'transfers',
    type: 'TRANSFER',
    title: 'Transfers',
    description: 'Airport and intercity transport.',
    icon: Car,
  },
  {
    slug: 'visas',
    type: 'VISA',
    title: 'Visas',
    description: 'Umrah and visit visa processing.',
    icon: FileCheck2,
  },
  {
    slug: 'other',
    type: 'OTHER',
    title: 'Other services',
    description: 'Everything else on offer.',
    icon: Package,
  },
];

export const serviceBySlug = (slug?: string) => SERVICE_LISTINGS.find((s) => s.slug === slug);
export const serviceByType = (type?: string | null) =>
  SERVICE_LISTINGS.find((s) => s.type === type) ?? SERVICE_LISTINGS[0];
export const listingPath = (type?: string | null) => `/book/${serviceByType(type).slug}`;

/** Primary services plus any other service that currently has inventory. */
export function useServiceListings() {
  const filters = useQuery({
    queryKey: keys.groupFilters,
    queryFn: api.groups.filters,
    staleTime: 5 * 60_000,
  });
  const available = new Set(filters.data?.types ?? []);
  return SERVICE_LISTINGS.filter((s) => s.primary || available.has(s.type));
}
