import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ErrorState, ReceiptDocument, Spinner } from '@gnk/ui';
import { api } from '@/lib/api';

export function ReceiptPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ['payment', id, 'receipt'],
    queryFn: () => api.payments.receipt(id),
  });
  if (q.isLoading) return <Spinner className="py-24" />;
  if (!q.data) return <ErrorState error={q.error} />;
  return <ReceiptDocument receipt={q.data} onBack={() => navigate(`/payments?id=${id}`)} />;
}
