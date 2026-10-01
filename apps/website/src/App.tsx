import { RouteMeta } from './components/RouteMeta';
import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ChatWidget from './components/ChatWidget';
import WhatsAppButton from './components/WhatsAppButton';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { WishlistProvider } from './context/WishlistContext';
import WishlistDrawer from './components/WishlistDrawer';
import { ErrorBoundary } from './components/ErrorBoundary';

// Public Pages
const Home = lazy(() => import('./pages/Home'));
const PublicGroupsPage = lazy(() => import('./pages/PublicGroupsPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const DestinationsPage = lazy(() => import('./pages/DestinationsPage'));
const TripPlannerPage = lazy(() => import('./pages/TripPlannerPage'));
const VisaTrackingPage = lazy(() => import('./pages/VisaTrackingPage'));
const CorporatePage = lazy(() => import('./pages/CorporatePage'));
const PackingChecklistPage = lazy(() => import('./pages/PackingChecklistPage'));
const NewsPage = lazy(() => import('./pages/NewsPage'));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));

// Scroll to top on route change
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
};

// Route Suspense Loading Fallback
const PageLoadingFallback: React.FC = () => (
  <div className="flex min-h-[60vh] items-center justify-center bg-canvas" role="status">
    <div className="size-6 animate-spin rounded-full border-2 border-line border-t-brand" />
    <span className="sr-only">Loading</span>
  </div>
);

const AppContent: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-canvas font-sans text-ink">
      <ScrollToTop />
      <RouteMeta />
      <Navbar />

      <main className="flex-grow">
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/groups" element={<PublicGroupsPage />} />
            <Route path="/planner" element={<TripPlannerPage />} />
            <Route path="/tracking" element={<VisaTrackingPage />} />
            <Route path="/corporate" element={<CorporatePage />} />
            <Route path="/checklist" element={<PackingChecklistPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/services/:slug" element={<ServicesPage />} />
            <Route path="/destinations" element={<DestinationsPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/news/:slug" element={<NewsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/about" element={<AboutPage />} />

            {/* Fallback route */}
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
      <ChatWidget />
      <WhatsAppButton />
      <WishlistDrawer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <CurrencyProvider>
          <WishlistProvider>
            <ToastProvider>
              <Router>
                <AppContent />
              </Router>
            </ToastProvider>
          </WishlistProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
