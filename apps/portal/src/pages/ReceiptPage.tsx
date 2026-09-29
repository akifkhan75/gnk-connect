import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ErrorState, ReceiptDocument, Spinner, saveBlob } from '@gnk/ui';
import { api } from '@/lib/api';
import { keys } from '@/lib/query';

export function ReceiptPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: keys.receipt(id), queryFn: () => api.payments.receipt(id) });
  if (q.error) return <ErrorState error={q.error} />;
  if (!q.data) return <Spinner className="py-20" />;
  const receipt = q.data;
  return (
    <ReceiptDocument
      receipt={receipt}
      onBack={() => navigate('/payments')}
      onDownload={async () => saveBlob(await api.payments.receiptPdf(id), `${receipt.number}.pdf`)}
    />
  );
}
