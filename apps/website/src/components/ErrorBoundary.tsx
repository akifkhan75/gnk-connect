import { Component, ErrorInfo, ReactNode } from 'react';
import { Compass, RefreshCw, Phone } from 'lucide-react';
import { BRAND_NAME, CONTACT_INFO } from '../constants';
import { reportError } from '../lib/monitoring';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by GNK Connect ErrorBoundary:', error, errorInfo);
    reportError(error, { componentStack: errorInfo.componentStack });
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-navy-900 text-white flex items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md bg-navy-800/90 border border-navy-700 p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-5 border border-cyan-400/30">
              <Compass className="w-8 h-8 animate-spin-slow" />
            </div>

            <h1 className="text-2xl font-bold mb-2 tracking-tight">Something went unexpected</h1>

            <p className="text-gray-300 text-xs sm:text-sm mb-6 leading-relaxed">
              We encountered a temporary interface issue while loading this page. Our team has been
              notified.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                type="button"
                onClick={this.handleReload}
                className="bg-brand hover:bg-brand text-white px-6 py-3 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
              >
                <RefreshCw size={14} /> Refresh Page
              </button>
              <a
                href={`tel:${CONTACT_INFO.phone}`}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border border-white/20"
              >
                <Phone size={14} /> Call Helpline
              </a>
            </div>

            <p className="text-[11px] text-gray-400">
              &copy; {new Date().getFullYear()} {BRAND_NAME}. Direct Assistance:{' '}
              {CONTACT_INFO.displayPhone}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
