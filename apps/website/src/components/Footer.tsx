import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Facebook, Instagram, Mail, MapPin, Phone, Twitter } from 'lucide-react';
import { BRAND_NAME, BRAND_TAGLINE, CONTACT_INFO, SERVICES } from '../constants';
import { portalLink } from '../lib/links';
import { BrandLogo } from './Navbar';

const COLUMNS: { title: string; links: { label: string; to: string; external?: boolean }[] }[] = [
  {
    title: 'Travel',
    links: [
      { label: 'Group departures', to: '/groups' },
      { label: 'Destinations', to: '/destinations' },
      { label: 'Corporate and MICE', to: '/corporate' },
      { label: 'All services', to: '/services' },
    ],
  },
  {
    title: 'Services',
    links: SERVICES.slice(0, 5).map((s) => ({ label: s.title, to: s.link })),
  },
  {
    title: 'Tools',
    links: [
      { label: 'Trip planner', to: '/planner' },
      { label: 'Visa tracker', to: '/tracking' },
      { label: 'Packing checklist', to: '/checklist' },
      { label: 'Guides and insights', to: '/news' },
      { label: 'Reviews', to: '/reviews' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About us', to: '/about' },
      { label: 'Contact', to: '/contact' },
      { label: 'Agent portal', to: portalLink('/'), external: true },
    ],
  },
];

const SOCIAL = [
  { label: 'Facebook', href: 'https://facebook.com', icon: Facebook },
  { label: 'Twitter', href: 'https://twitter.com', icon: Twitter },
  { label: 'Instagram', href: 'https://instagram.com', icon: Instagram },
];

const FooterLink: React.FC<{ to: string; external?: boolean; children: React.ReactNode }> = ({
  to,
  external,
  children,
}) =>
  external ? (
    <a href={to} className="text-ink-3 transition-colors hover:text-ink">
      {children}
    </a>
  ) : (
    <Link to={to} className="text-ink-3 transition-colors hover:text-ink">
      {children}
    </Link>
  );

const Footer: React.FC = () => (
  <footer className="border-t border-line bg-surface text-[13px]">
    <div className="mx-auto max-w-[1200px] px-4 pb-10 pt-14 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div className="max-w-xs">
          <Link to="/" aria-label={`${BRAND_NAME} home`} className="inline-block">
            <BrandLogo className="h-10" />
          </Link>
          <p className="mt-4 leading-relaxed text-ink-3">
            {BRAND_TAGLINE}. Executive Umrah, visas, group departures and holidays from Islamabad.
          </p>
          <ul className="mt-5 space-y-2.5 text-ink-2">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-ink-3" />
              <span>{CONTACT_INFO.address}</span>
            </li>
            <li>
              <a
                href={`tel:${CONTACT_INFO.phone}`}
                className="flex items-center gap-2.5 hover:text-ink"
              >
                <Phone className="size-4 text-ink-3" /> {CONTACT_INFO.displayPhone}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${CONTACT_INFO.email}`}
                className="flex items-center gap-2.5 hover:text-ink"
              >
                <Mail className="size-4 text-ink-3" /> {CONTACT_INFO.email}
              </a>
            </li>
          </ul>
        </div>

        {/* Desktop columns */}
        {COLUMNS.map((col) => (
          <div key={col.title} className="hidden lg:block">
            <h3 className="mb-3 text-[12px] font-semibold text-ink">{col.title}</h3>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <FooterLink to={l.to} external={l.external}>
                    {l.label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Phone: accordion, as on apple.com */}
        <div className="divide-y divide-line border-y border-line lg:hidden">
          {COLUMNS.map((col) => (
            <details key={col.title} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-[14px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                {col.title}
                <ChevronDown className="size-4 text-ink-3 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <ul className="space-y-3 pb-4 pl-1">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <FooterLink to={l.to} external={l.external}>
                      {l.label}
                    </FooterLink>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 text-[12px] text-ink-3 md:flex-row md:items-center md:justify-between">
        <p>
          © {new Date().getFullYear()} {BRAND_NAME}. Licensed travel and tourism agency · DTS Lic.
          #4920 · IATA accredited.
        </p>
        <div className="flex items-center gap-1">
          {SOCIAL.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${BRAND_NAME} on ${s.label}`}
              className="flex size-9 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <s.icon className="size-4" />
            </a>
          ))}
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
