import type { ReactNode } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '../components/button';
import { Logo } from '../components/misc';

/** A4 document on a neutral background, always light (plan 08 §3), with print toolbar. */
export function PrintSheet({
  title,
  children,
  onBack,
}: {
  title: string;
  children: ReactNode;
  onBack: () => void;
}) {
  return (
    <div className="min-h-dvh bg-background py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft /> Back
        </Button>
        <Button onClick={() => window.print()}>
          <Printer /> Print / save PDF
        </Button>
      </div>
      <article
        aria-label={title}
        className="mx-auto min-h-[297mm] max-w-[210mm] rounded-sm bg-white p-[14mm] text-[13px] text-slate-900 shadow-pop [color-scheme:light] print:min-h-0 print:rounded-none print:p-0 print:shadow-none"
      >
        <header className="mb-8 flex items-start justify-between border-b border-slate-200 pb-6">
          <Logo variant="ink" size={40} />
          <p className="text-right text-[22px] font-semibold tracking-[-0.02em] text-slate-900">
            {title}
          </p>
        </header>
        {children}
      </article>
    </div>
  );
}
