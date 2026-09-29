import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initMonitoring } from '@gnk/ui';
import { App } from './App';
import './index.css';

void initMonitoring({
  app: 'admin',
  key: import.meta.env.VITE_POSTHOG_KEY,
  host: import.meta.env.VITE_POSTHOG_HOST,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
