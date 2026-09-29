import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ErrorState, InvoiceDocument, Spinner } from '@gnk/ui';
import { api } from '@/lib/api';

export function InvoicePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ['invoice', id], queryFn: () => api.invoices.get(id) });
  if (q.error) return <ErrorState error={q.error} />;
  if (!q.data) return <Spinner className="py-20" />;
  return <InvoiceDocument invoice={q.data} onBack={() => navigate(-1)} />;
}
