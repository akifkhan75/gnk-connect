import React, { createContext, useContext, useEffect, useState } from 'react';
import { publicApi } from '../lib/api';

export type CurrencyCode = 'USD' | 'PKR' | 'SAR' | 'AED';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  label: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  PKR: { code: 'PKR', symbol: 'Rs. ', label: 'PKR (₨)' },
  USD: { code: 'USD', symbol: '$', label: 'USD ($)' },
  SAR: { code: 'SAR', symbol: 'SAR ', label: 'SAR (﷼)' },
  AED: { code: 'AED', symbol: 'AED ', label: 'AED (د.إ)' },
};

/**
 * PKR per 1 unit. Replaced on load by the latest rates finance enters in the admin rate table
 * (Accounting → Setup); these are only used while that loads or if the API is unreachable.
 */
const FALLBACK_PKR_PER: Record<CurrencyCode, number> = {
  PKR: 1,
  USD: 280,
  SAR: 74.67,
  AED: 76.29,
};

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  /** Formats a catalogue price (stored in USD) in the visitor's chosen currency. */
  formatPrice: (priceUSDStr: string | number) => string;
  /** Date of the rates in use, or null while using the built-in fallback. */
  ratesAsOf: string | null;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode: the choice just isn't remembered */
  }
};

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>('PKR');
  const [pkrPer, setPkrPer] = useState(FALLBACK_PKR_PER);
  const [ratesAsOf, setRatesAsOf] = useState<string | null>(null);

  useEffect(() => {
    const saved = read('gnk_currency') as CurrencyCode | null;
    if (saved && CURRENCIES[saved]) setCurrencyState(saved);
  }, []);

  useEffect(() => {
    let cancelled = false;
    publicApi
      .rates()
      .then((r) => {
        if (cancelled) return;
        setPkrPer((prev) => {
          const next = { ...prev };
          for (const code of Object.keys(CURRENCIES) as CurrencyCode[])
            if (code !== 'PKR' && r.rates[code] > 0) next[code] = r.rates[code];
          return next;
        });
        setRatesAsOf(r.asOf);
      })
      .catch(() => {
        /* keep the fallback rates */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyState(code);
    write('gnk_currency', code);
  };

  const formatPrice = (priceUSDStr: string | number): string => {
    const usd =
      typeof priceUSDStr === 'number'
        ? priceUSDStr
        : parseFloat(priceUSDStr.replace(/[^0-9.]/g, '')) || 0;
    const converted = Math.round((usd * pkrPer.USD) / pkrPer[currency]);
    return `${CURRENCIES[currency].symbol}${converted.toLocaleString()}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, ratesAsOf }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextValue => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
