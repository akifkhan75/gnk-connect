import React, { createContext, useContext, useState, useEffect } from 'react';

export type CurrencyCode = 'USD' | 'PKR' | 'SAR' | 'AED';

export interface CurrencyRate {
  code: CurrencyCode;
  symbol: string;
  rate: number; // conversion from USD
  label: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyRate> = {
  USD: { code: 'USD', symbol: '$', rate: 1, label: 'USD ($)' },
  PKR: { code: 'PKR', symbol: 'Rs. ', rate: 280, label: 'PKR (₨)' },
  SAR: { code: 'SAR', symbol: 'SAR ', rate: 3.75, label: 'SAR (﷼)' },
  AED: { code: 'AED', symbol: 'AED ', rate: 3.67, label: 'AED (د.إ)' },
};

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  formatPrice: (priceUSDStr: string | number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');

  useEffect(() => {
    const saved = localStorage.getItem('gnk_currency') as CurrencyCode;
    if (saved && CURRENCIES[saved]) {
      setCurrencyState(saved);
    }
  }, []);

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyState(code);
    localStorage.setItem('gnk_currency', code);
  };

  const formatPrice = (priceUSDStr: string | number): string => {
    let numeric = 0;
    if (typeof priceUSDStr === 'number') {
      numeric = priceUSDStr;
    } else {
      const match = priceUSDStr.replace(/[^0-9.]/g, '');
      numeric = parseFloat(match) || 0;
    }

    const current = CURRENCIES[currency];
    const converted = Math.round(numeric * current.rate);

    if (currency === 'PKR') {
      return `Rs. ${converted.toLocaleString()}`;
    }
    return `${current.symbol}${converted.toLocaleString()}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
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
