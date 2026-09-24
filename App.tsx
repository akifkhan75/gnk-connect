import React, { useEffect, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ChatWidget from './components/ChatWidget';
import WhatsAppButton from './components/WhatsAppButton';
import { ToastProvider } from './context/ToastContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { WishlistProvider } from './context/WishlistContext';
import { B2BAuthProvider } from './context/B2BAuthContext';
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

// Agent B2B Pages
import { AgentLayout } from './components/b2b/AgentLayout';
import { AgentDashboardPage } from './pages/agent/AgentDashboardPage';
import { AgentGroupsPage } from './pages/agent/AgentGroupsPage';
import { AgentGroupDetailsPage } from './pages/agent/AgentGroupDetailsPage';
import { AgentBookingsPage } from './pages/agent/AgentBookingsPage';
import { AgentProfilePage } from './pages/agent/AgentProfilePage';
import { AgentLedgerPage } from './pages/agent/AgentLedgerPage';
import { AgentTeamPage } from './pages/agent/AgentTeamPage';
import { AgentLoginPage } from './pages/agent/AgentLoginPage';
import { AgentRegisterPage } from './pages/agent/AgentRegisterPage';

// Admin Pages
import { AdminLayout } from './components/b2b/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminAgentsPage } from './pages/admin/AdminAgentsPage';
import { AdminPricingPage } from './pages/admin/AdminPricingPage';
import { AdminBookingsPage } from './pages/admin/AdminBookingsPage';
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage';
import { AdminSuppliersPage } from './pages/admin/AdminSuppliersPage';
import { AdminLedgerPage } from './pages/admin/AdminLedgerPage';
import { AdminTeamPage } from './pages/admin/AdminTeamPage';

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

// Layout wrapper that conditionally shows Public Navbar/Footer or B2B/Admin layouts
const AppContent: React.FC = () => {
  const location = useLocation();
  const isAgentOrAdmin = location.pathname.startsWith('/agent') || location.pathname.startsWith('/admin');

  return (
    <div className="flex flex-col min-h-screen font-sans bg-gray-50 text-navy-900 selection:bg-cyan-500 selection:text-white">
      <ScrollToTop />
      {!isAgentOrAdmin && <Navbar />}

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

            {/* Standalone Agent Auth Routes */}
            <Route path="/agent/login" element={<AgentLoginPage />} />
            <Route path="/agent/register" element={<AgentRegisterPage />} />

            {/* Agent Portal Sub-routes (Wrapped in AgentLayout) */}
            <Route path="/agent" element={<AgentLayout />}>
              <Route index element={<AgentDashboardPage />} />
              <Route path="dashboard" element={<AgentDashboardPage />} />
              <Route path="groups" element={<AgentGroupsPage />} />
              <Route path="groups/:id" element={<AgentGroupDetailsPage />} />
              <Route path="bookings" element={<AgentBookingsPage />} />
              <Route path="ledger" element={<AgentLedgerPage />} />
              <Route path="team" element={<AgentTeamPage />} />
              <Route path="profile" element={<AgentProfilePage />} />
            </Route>

            {/* Admin Console Sub-routes (Wrapped in AdminLayout) */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="agents" element={<AdminAgentsPage />} />
              <Route path="pricing" element={<AdminPricingPage />} />
              <Route path="bookings" element={<AdminBookingsPage />} />
              <Route path="payments" element={<AdminPaymentsPage />} />
              <Route path="ledger" element={<AdminLedgerPage />} />
              <Route path="suppliers" element={<AdminSuppliersPage />} />
              <Route path="team" element={<AdminTeamPage />} />
            </Route>

            {/* Fallback route */}
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </main>

      {!isAgentOrAdmin && (
        <>
          <Footer />
          <ChatWidget />
          <WhatsAppButton />
          <WishlistDrawer />
        </>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <B2BAuthProvider>
        <CurrencyProvider>
          <WishlistProvider>
            <ToastProvider>
              <Router>
                <AppContent />
              </Router>
            </ToastProvider>
          </WishlistProvider>
        </CurrencyProvider>
      </B2BAuthProvider>
    </ErrorBoundary>
  );
};

export default App;
