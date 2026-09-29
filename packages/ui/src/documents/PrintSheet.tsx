import { useState, type ReactNode } from 'react';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { Button } from '../components/button';
import { Logo } from '../components/misc';

/** Saves a Blob as a file download. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A4 document on a neutral background, always light (plan 08 §3), with print toolbar. */
export function PrintSheet({
  title,
  children,
  onBack,
  onDownload,
}: {
  title: string;
  children: ReactNode;
  onBack: () => void;
  /** Adds a "Download PDF" button (a server-rendered PDF, e.g. for receipts). */
  onDownload?: () => Promise<void>;
}) {
  const [downloading, setDownloading] = useState(false);
  return (
    <div className="min-h-dvh bg-background py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft /> Back
        </Button>
        <div className="flex items-center gap-2">
          {onDownload && (
            <Button
              variant="secondary"
              loading={downloading}
              onClick={async () => {
                setDownloading(true);
                try {
                  await onDownload();
                } finally {
                  setDownloading(false);
                }
              }}
            >
              <Download /> Download PDF
            </Button>
          )}
          <Button onClick={() => window.print()}>
            <Printer /> Print
          </Button>
        </div>
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
