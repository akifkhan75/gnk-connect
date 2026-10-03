import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PublicCurrencyDto } from '@gnk/types';
import { publicApi } from '../lib/api';

export type CurrencyCode = string;

const STORAGE_KEY = 'gnk_currency';

const PKR: PublicCurrencyDto = { code: 'PKR', name: 'Pakistani rupee', symbol: 'Rs', rate: 1 };

/** Used only if the API is unreachable. Admin Settings rates replace these. */
const FALLBACK: PublicCurrencyDto[] = [
  PKR,
  { code: 'USD', name: 'US dollar', symbol: '$', rate: 278 },
  { code: 'SAR', name: 'Saudi riyal', symbol: 'SR', rate: 74.1 },
  { code: 'AED', name: 'UAE dirham', symbol: 'AED', rate: 75.7 },
];

interface CurrencyContextValue {
  currency: CurrencyCode;
  currencies: PublicCurrencyDto[];
  setCurrency: (code: CurrencyCode) => void;
  /** Format a PKR amount in the visitor's selected currency. */
  formatPrice: (pricePkr: string | number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

const parsePkr = (value: string | number) =>
  typeof value === 'number' ? value : parseFloat(value.replace(/[^0-9.]/g, '')) || 0;

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'PKR';
    } catch {
      return 'PKR';
    }
  });
  const [currencies, setCurrencies] = useState<PublicCurrencyDto[]>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    publicApi
      .currencies()
      .then((dto) => {
        if (cancelled || !dto.currencies.length) return;
        setCurrencies(dto.currencies);
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && dto.currencies.some((c) => c.code === saved)) setCurrencyState(saved);
        else setCurrencyState(dto.base);
      })
      .catch(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && FALLBACK.some((c) => c.code === saved)) setCurrencyState(saved);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = (code: CurrencyCode) => {
    if (!currencies.some((c) => c.code === code)) return;
    setCurrencyState(code);
    localStorage.setItem(STORAGE_KEY, code);
  };

  const formatPrice = useMemo(() => {
    return (pricePkr: string | number) => {
      const pkr = parsePkr(pricePkr);
      const current = currencies.find((c) => c.code === currency) ?? PKR;
      const amount = current.code === 'PKR' ? Math.round(pkr) : pkr / current.rate;
      const formatted = amount.toLocaleString('en-PK', {
        minimumFractionDigits: current.code === 'PKR' ? 0 : 2,
        maximumFractionDigits: current.code === 'PKR' ? 0 : 2,
      });
      if (current.code === 'PKR') return `Rs. ${formatted}`;
      const gap = /[A-Za-z]/.test(current.symbol) ? ' ' : '';
      return `${current.symbol}${gap}${formatted}`;
    };
  }, [currencies, currency]);

  return (
    <CurrencyContext.Provider value={{ currency, currencies, setCurrency, formatPrice }}>
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
