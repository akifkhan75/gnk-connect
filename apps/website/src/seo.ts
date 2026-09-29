/**
 * Page titles and descriptions for every public route, and the sitemap built from them.
 * No React or browser imports: vite.config.ts also reads this to write sitemap.xml at build.
 */
import { BRAND_NAME, SERVICES } from './constants';

export const SITE_URL = 'https://gnkconnect.com';

export interface PageMeta {
  title: string;
  description: string;
  /** Listed in sitemap.xml (utility pages and unknown URLs are not). */
  index?: boolean;
  priority?: number;
  changefreq?: 'daily' | 'weekly' | 'monthly';
}

const PAGES: Record<string, PageMeta> = {
  '/': {
    title: `${BRAND_NAME} | Umrah Packages, Visit Visas, Group Tickets & Tours from Islamabad`,
    description:
      'GNK Connect is an Islamabad travel agency for Umrah packages, visit and sticker visas, group air tickets, hotels, and domestic and international tours.',
    index: true,
    priority: 1,
    changefreq: 'daily',
  },
  '/groups': {
    title: `Group Tours and Group Tickets | ${BRAND_NAME}`,
    description:
      'Upcoming group departures to Jeddah, Madinah, Dubai and Riyadh with seats confirmed by GNK Connect. Enquire on WhatsApp for fares.',
    index: true,
    priority: 0.9,
    changefreq: 'daily',
  },
  '/services': {
    title: `Travel Services | ${BRAND_NAME}`,
    description:
      'Umrah packages, visit visas, hotel bookings, airline tickets, domestic and international tours, and travel insurance, arranged from Islamabad.',
    index: true,
    priority: 0.9,
    changefreq: 'weekly',
  },
  '/destinations': {
    title: `Destinations in Pakistan and Abroad | ${BRAND_NAME}`,
    description:
      'Hunza, Skardu, Swat and Naran, plus Dubai, Turkey, Malaysia and more: destinations GNK Connect plans trips to, with itineraries on request.',
    index: true,
    priority: 0.8,
    changefreq: 'weekly',
  },
  '/planner': {
    title: `Trip Planner | ${BRAND_NAME}`,
    description:
      'Tell us where and when you want to travel and get a suggested itinerary, then refine it with a GNK Connect travel consultant.',
    index: true,
    priority: 0.6,
    changefreq: 'monthly',
  },
  '/tracking': {
    title: `Visa Application Tracker | ${BRAND_NAME}`,
    description: 'Check the status of a visa application submitted through GNK Connect.',
    index: true,
    priority: 0.5,
    changefreq: 'monthly',
  },
  '/corporate': {
    title: `Corporate Travel | ${BRAND_NAME}`,
    description:
      'Business travel for companies in Pakistan: flights, hotels, visas and group events, with one account manager and consolidated invoicing.',
    index: true,
    priority: 0.7,
    changefreq: 'monthly',
  },
  '/checklist': {
    title: `Travel Packing Checklist | ${BRAND_NAME}`,
    description:
      'A printable packing checklist for Umrah and holidays: documents, clothing, health and essentials.',
    index: true,
    priority: 0.5,
    changefreq: 'monthly',
  },
  '/reviews': {
    title: `Customer Reviews | ${BRAND_NAME}`,
    description:
      'What travellers say about their Umrah, visa and tour experience with GNK Connect.',
    index: true,
    priority: 0.6,
    changefreq: 'weekly',
  },
  '/news': {
    title: `Travel Guides and News | ${BRAND_NAME}`,
    description:
      'Guides to Umrah preparation, visa rules for the GCC, Schengen and Asia, and the best places to visit in Northern Pakistan.',
    index: true,
    priority: 0.6,
    changefreq: 'weekly',
  },
  '/about': {
    title: `About Us | ${BRAND_NAME}`,
    description:
      'GNK Connect is a travel and tourism company in Islamabad, Pakistan, serving pilgrims, families, corporate travellers and travel agents.',
    index: true,
    priority: 0.7,
    changefreq: 'monthly',
  },
  '/contact': {
    title: `Contact Us | ${BRAND_NAME}`,
    description:
      'Call 051 2222031, WhatsApp +92 345 9680375 or email support@gnkconnect.com. Visit our Islamabad office for Umrah, visas and tours.',
    index: true,
    priority: 0.8,
    changefreq: 'monthly',
  },
};

// One page per service, e.g. /services/umrah.
for (const s of SERVICES)
  PAGES[s.link] = {
    title: `${s.title} | ${BRAND_NAME}`,
    description:
      s.description.length > 160 ? `${s.description.slice(0, 157).trimEnd()}…` : s.description,
    index: true,
    priority: 0.9,
    changefreq: 'weekly',
  };

// Unknown URLs show the home page (the SPA fallback) but must not be indexed as duplicates.
const NOT_FOUND: PageMeta = { title: PAGES['/'].title, description: PAGES['/'].description };

/** Meta for a pathname; unknown paths get a noindex "not found" entry. */
export function metaFor(pathname: string): PageMeta & { path: string; known: boolean } {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (PAGES[path]) return { ...PAGES[path], path, known: true };
  // Article URLs share the guides page until articles get their own pages.
  if (path.startsWith('/news/')) return { ...PAGES['/news'], index: false, path, known: true };
  return { ...NOT_FOUND, path, known: false };
}

export function sitemapXml(site = SITE_URL, lastmod = new Date().toISOString().slice(0, 10)) {
  const urls = Object.entries(PAGES)
    .filter(([, m]) => m.index)
    .sort(([, a], [, b]) => (b.priority ?? 0.5) - (a.priority ?? 0.5))
    .map(
      ([path, m]) =>
        `  <url>\n    <loc>${site}${path === '/' ? '/' : path}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${m.changefreq ?? 'monthly'}</changefreq>\n    <priority>${(m.priority ?? 0.5).toFixed(1)}</priority>\n  </url>`,
    );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}
