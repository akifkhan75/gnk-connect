import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ErrorState, ReceiptDocument, Spinner } from '@gnk/ui';
import { api } from '@/lib/api';

export function ReceiptPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ['payment', id, 'receipt'],
    queryFn: () => api.payments.receipt(id),
    enabled: params.get('print') === '1',
  });
  if (params.get('print') !== '1') {
    return <Navigate to={`/payments?id=${id}&receipt=1`} replace />;
  }
  if (q.isLoading) return <Spinner className="py-24" />;
  if (!q.data) return <ErrorState error={q.error} />;
  return (
    <ReceiptDocument
      receipt={q.data}
      onBack={() => (window.opener ? window.close() : navigate(`/payments?id=${id}`))}
    />
  );
}
