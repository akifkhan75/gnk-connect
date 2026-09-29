import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight,
  Bookmark,
  CheckSquare,
  ChevronDown,
  FileSearch,
  Mail,
  MessageCircle,
  Moon,
  Newspaper,
  Phone,
  Sparkles,
  Star,
  Sun,
} from 'lucide-react';
import { BRAND_NAME, CONTACT_INFO, SERVICES } from '../constants';
import { portalLink } from '../lib/links';
import { CURRENCIES, useCurrency, type CurrencyCode } from '../context/CurrencyContext';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/ThemeContext';

const TOOLS = [
  {
    title: 'AI Trip Planner',
    short: 'Trip planner',
    desc: 'Itineraries with budget estimates',
    path: '/planner',
    icon: Sparkles,
  },
  {
    title: 'Visa Status Tracker',
    short: 'Visa tracker',
    desc: 'Umrah, Dubai and sticker visas',
    path: '/tracking',
    icon: FileSearch,
  },
  {
    title: 'Packing Checklist',
    short: 'Packing list',
    desc: 'Tailored to your destination',
    path: '/checklist',
    icon: CheckSquare,
  },
  {
    title: 'Guides & Insights',
    short: 'Guides',
    desc: 'Visa policies and travel tips',
    path: '/news',
    icon: Newspaper,
  },
  {
    title: 'Traveller Reviews',
    short: 'Reviews',
    desc: 'Verified feedback, rated 4.9',
    path: '/reviews',
    icon: Star,
  },
];
const TOOL_PATHS = TOOLS.map((t) => t.path);

type Menu = 'services' | 'tools' | null;

/** The brand logo: navy ink on light, white ink on dark. */
export const BrandLogo: React.FC<{ className?: string; forceWhite?: boolean }> = ({
  className = 'h-8',
  forceWhite,
}) => (
  <>
    {!forceWhite && (
      <img
        src="/logo.png"
        alt={BRAND_NAME}
        className={`${className} w-auto dark:hidden`}
        draggable={false}
      />
    )}
    <img
      src="/logo-white.png"
      alt={BRAND_NAME}
      className={`${className} w-auto ${forceWhite ? '' : 'hidden dark:block'}`}
      draggable={false}
    />
  </>
);

const linkBase =
  'whitespace-nowrap rounded-full px-3 py-1.5 text-[13.5px] font-medium tracking-[-0.01em] transition-colors duration-200';
const linkIdle = 'text-ink-2 hover:text-ink';
const linkActive = 'text-ink bg-surface-2';

export const Navbar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<Menu>(null);
  const [scrolled, setScrolled] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const { currency, setCurrency } = useCurrency();
  const { savedItems, setIsDrawerOpen } = useWishlist();
  const { resolved, toggle } = useTheme();
  const location = useLocation();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currencyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMenu(null);
    setCurrencyOpen(false);
  }, [location.pathname]);

  // Lock page scroll behind the mobile sheet; Escape closes menus.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setMenu(null);
        setCurrencyOpen(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!currencyRef.current?.contains(e.target as Node)) setCurrencyOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  const enter = (m: Menu) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMenu(m);
  };
  const leave = () => {
    closeTimer.current = setTimeout(() => setMenu(null), 140);
  };

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `${linkBase} ${isActive ? linkActive : linkIdle}`;
  const toolsActive = TOOL_PATHS.some((p) => location.pathname.startsWith(p));
  const servicesActive = location.pathname.startsWith('/services');

  return (
    <>
      <header
        className={`frosted fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
          scrolled || open ? 'border-line' : 'border-transparent'
        }`}
      >
        <nav
          aria-label="Main"
          className="mx-auto flex h-14 max-w-[1200px] items-center gap-4 px-4 sm:px-6"
        >
          <Link
            to="/"
            aria-label={`${BRAND_NAME} home`}
            className="-ml-1 flex shrink-0 items-center rounded-lg p-1"
          >
            <BrandLogo className="h-8" />
          </Link>

          {/* Desktop links */}
          <div className="ml-4 hidden flex-1 items-center gap-0.5 lg:flex">
            <NavLink to="/groups" className={navCls}>
              Groups
            </NavLink>
            <Dropdown
              label="Services"
              active={servicesActive}
              open={menu === 'services'}
              onEnter={() => enter('services')}
              onLeave={leave}
              onToggle={() => setMenu(menu === 'services' ? null : 'services')}
              width="w-[520px]"
            >
              <div className="grid grid-cols-2 gap-1">
                {SERVICES.map((s) => (
                  <Link
                    key={s.id}
                    to={s.link}
                    className="rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2"
                  >
                    <span className="block text-[13.5px] font-semibold text-ink">{s.title}</span>
                    <span className="mt-0.5 line-clamp-1 block text-[12.5px] text-ink-3">
                      {s.description}
                    </span>
                  </Link>
                ))}
              </div>
              <Link
                to="/corporate"
                className="mt-2 flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-[13px] text-ink-2 transition-colors hover:text-ink"
              >
                Corporate and MICE travel
                <ArrowUpRight className="size-4" />
              </Link>
            </Dropdown>
            <NavLink to="/destinations" className={navCls}>
              Destinations
            </NavLink>
            <Dropdown
              label="Tools"
              active={toolsActive}
              open={menu === 'tools'}
              onEnter={() => enter('tools')}
              onLeave={leave}
              onToggle={() => setMenu(menu === 'tools' ? null : 'tools')}
              width="w-[340px]"
            >
              {TOOLS.map((t) => (
                <Link
                  key={t.path}
                  to={t.path}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
                    <t.icon className="size-[17px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold text-ink">{t.title}</span>
                    <span className="block truncate text-[12.5px] text-ink-3">{t.desc}</span>
                  </span>
                </Link>
              ))}
            </Dropdown>
            <NavLink to="/about" className={navCls}>
              About
            </NavLink>
            <NavLink to="/contact" className={navCls}>
              Contact
            </NavLink>
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1">
            <div ref={currencyRef} className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => setCurrencyOpen((o) => !o)}
                className="flex h-8 items-center gap-1 rounded-full px-2.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                aria-label={`Currency: ${currency}`}
                aria-expanded={currencyOpen}
              >
                {currency}
                <ChevronDown className="size-3.5" />
              </button>
              <AnimatePresence>
                {currencyOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 top-10 w-40 rounded-2xl border border-line bg-surface p-1 shadow-[0_18px_40px_-12px_rgb(11_26_51/0.25)]"
                  >
                    {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          setCurrency(code);
                          setCurrencyOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-[13px] transition-colors ${
                          currency === code
                            ? 'bg-brand-soft font-semibold text-brand-ink'
                            : 'text-ink-2 hover:bg-surface-2'
                        }`}
                      >
                        {CURRENCIES[code].label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <IconButton
              label={resolved === 'dark' ? 'Use light mode' : 'Use dark mode'}
              onClick={toggle}
            >
              {resolved === 'dark' ? (
                <Sun className="size-[17px]" />
              ) : (
                <Moon className="size-[17px]" />
              )}
            </IconButton>

            <IconButton
              label={`Saved trips (${savedItems.length})`}
              onClick={() => setIsDrawerOpen(true)}
            >
              <Bookmark className="size-[17px]" />
              {savedItems.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-warm px-1 text-[9.5px] font-bold leading-4 text-white">
                  {savedItems.length}
                </span>
              )}
            </IconButton>

            <a
              href={portalLink('/')}
              className="ml-1 hidden whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink xl:block"
            >
              Agent login
            </a>
            <Link
              to="/planner"
              className="ml-1 hidden h-8 items-center whitespace-nowrap rounded-full bg-brand-gradient px-4 text-[13px] font-semibold text-white shadow-[0_4px_14px_-4px_rgb(10_92_230/0.6)] transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.97] sm:flex"
            >
              Plan a trip
            </Link>

            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="relative -mr-1 flex size-10 items-center justify-center rounded-full lg:hidden"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              <span
                className={`absolute h-[1.5px] w-[18px] rounded-full bg-ink transition-transform duration-300 ease-apple ${open ? 'rotate-45' : '-translate-y-[4px]'}`}
              />
              <span
                className={`absolute h-[1.5px] w-[18px] rounded-full bg-ink transition-transform duration-300 ease-apple ${open ? '-rotate-45' : 'translate-y-[4px]'}`}
              />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile sheet */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 bottom-0 top-14 z-40 overflow-y-auto overscroll-contain bg-canvas lg:hidden"
          >
            <motion.div
              initial={{ y: -8 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="mx-auto max-w-lg px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4"
            >
              <ul className="space-y-0.5">
                {[
                  { to: '/', label: 'Home' },
                  { to: '/groups', label: 'Group departures' },
                  { to: '/services', label: 'Services' },
                  { to: '/destinations', label: 'Destinations' },
                  { to: '/planner', label: 'Plan a trip' },
                  { to: '/about', label: 'About' },
                  { to: '/contact', label: 'Contact' },
                ].map((l, i) => (
                  <motion.li
                    key={l.to}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * i, duration: 0.25 }}
                  >
                    <NavLink
                      to={l.to}
                      end={l.to === '/'}
                      className={({ isActive }) =>
                        `block py-2 text-[26px] font-semibold tracking-[-0.025em] ${isActive ? 'text-brand-ink' : 'text-ink'}`
                      }
                    >
                      {l.label}
                    </NavLink>
                  </motion.li>
                ))}
              </ul>

              <p className="mt-8 text-[12px] font-medium text-ink-3">Travel tools</p>
              <ul className="mt-2 grid grid-cols-2 gap-2">
                {TOOLS.map((t) => (
                  <li key={t.path}>
                    <Link
                      to={t.path}
                      className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-3 text-[13.5px] font-medium text-ink ring-1 ring-line"
                    >
                      <t.icon className="size-4 text-brand-ink" />
                      <span className="truncate">{t.short}</span>
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex items-center justify-between">
                <span className="text-[12px] font-medium text-ink-3">Currency</span>
                <div className="flex rounded-full bg-surface-2 p-0.5">
                  {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setCurrency(code)}
                      className={`rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors ${
                        currency === code ? 'bg-surface text-ink shadow-sm' : 'text-ink-3'
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[12px] font-medium text-ink-3">Appearance</span>
                <button
                  type="button"
                  onClick={toggle}
                  className="flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-[12.5px] font-medium text-ink"
                >
                  {resolved === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                  {resolved === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
              </div>

              <div className="mt-8 grid gap-2">
                <a
                  href={portalLink('/')}
                  className="flex h-12 items-center justify-center rounded-full bg-brand-gradient text-[15px] font-semibold text-white"
                >
                  Agent portal login
                </a>
                <div className="grid grid-cols-3 gap-2">
                  <a
                    href={`tel:${CONTACT_INFO.phone}`}
                    className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-surface text-[13.5px] font-medium text-ink ring-1 ring-line"
                  >
                    <Phone className="size-4" /> Call
                  </a>
                  <a
                    href={`https://wa.me/${CONTACT_INFO.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-surface text-[13.5px] font-medium text-ink ring-1 ring-line"
                  >
                    <MessageCircle className="size-4" /> WhatsApp
                  </a>
                  <a
                    href={`mailto:${CONTACT_INFO.email}`}
                    className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-surface text-[13.5px] font-medium text-ink ring-1 ring-line"
                  >
                    <Mail className="size-4" /> Email
                  </a>
                </div>
              </div>
              <p className="mt-8 text-center text-[12px] text-ink-3">
                DTS Lic. #4920 · IATA accredited · {CONTACT_INFO.displayPhone}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const IconButton: React.FC<{
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="relative flex size-9 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
  >
    {children}
  </button>
);

const Dropdown: React.FC<{
  label: string;
  active: boolean;
  open: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onToggle: () => void;
  width: string;
  children: React.ReactNode;
}> = ({ label, active, open, onEnter, onLeave, onToggle, width, children }) => (
  <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-haspopup="true"
      className={`${linkBase} flex items-center gap-1 ${active || open ? linkActive : linkIdle}`}
    >
      {label}
      <ChevronDown
        className={`size-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      />
    </button>
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.985 }}
          transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
          className={`absolute left-1/2 top-[calc(100%+10px)] -translate-x-1/2 ${width} rounded-3xl border border-line bg-white/95 p-2 shadow-[0_24px_60px_-16px_rgb(11_26_51/0.28)] backdrop-blur-2xl`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export default Navbar;
