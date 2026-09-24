import React, { useEffect, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ChatWidget from './components/ChatWidget';
import WhatsAppButton from './components/WhatsAppButton';
import { ToastProvider } from './context/ToastContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { WishlistProvider } from './context/WishlistContext';
import WishlistDrawer from './components/WishlistDrawer';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy loaded page chunks for fast initial load
const Home = lazy(() => import('./pages/Home'));
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
  <div className="min-h-[60vh] flex flex-col items-center justify-center bg-gray-50">
    <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin mb-4"></div>
    <p className="text-xs font-bold text-navy-900 uppercase tracking-widest animate-pulse">Loading GNK Connect...</p>
  </div>
);

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <CurrencyProvider>
        <WishlistProvider>
          <ToastProvider>
            <Router>
              <div className="flex flex-col min-h-screen font-sans bg-gray-50 text-navy-900 selection:bg-cyan-500 selection:text-white">
                <ScrollToTop />
                <Navbar />
                <main className="flex-grow">
                  <Suspense fallback={<PageLoadingFallback />}>
                    <Routes>
                      <Route path="/" element={<Home />} />
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
            </Router>
          </ToastProvider>
        </WishlistProvider>
      </CurrencyProvider>
    </ErrorBoundary>
  );
};

export default App;
