import * as React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bookingsApi } from '@gnk/api-client';
import { FileText, ArrowLeft, CheckCircle2, Circle, Clock } from 'lucide-react';
import { Button } from '@gnk/ui';
import { Timeline } from '@gnk/ui';

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsApi.getBookingById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="p-8 text-center">Loading booking details...</div>;
  }

  if (!booking) {
    return <div className="p-8 text-center text-red-500">Booking not found</div>;
  }

  const isConfirmed = booking.status === 'APPROVED' || booking.status === 'CONFIRMED';

  const timelineEvents = booking.statusHistory?.map((event: any, idx: number) => {
    const isFirst = idx === 0;
    
    let icon = <Circle className="w-4 h-4 text-muted-foreground" />;
    if (isFirst) {
      icon = <CheckCircle2 className="w-4 h-4 text-green-500" />;
    } else if (event.to === 'PENDING_APPROVAL') {
      icon = <Clock className="w-4 h-4 text-blue-500" />;
    }

    return {
      id: event.id,
      title: event.to.replace('_', ' '),
      description: event.actorRealm === 'STAFF' ? 'Updated by GNK Operations' : 'Action by Agency',
      time: new Date(event.createdAt).toLocaleString(),
      icon: icon,
      isActive: isFirst
    };
  }) || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/bookings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Booking {booking.reference}</h1>
          <p className="text-muted-foreground">{booking.product?.title}</p>
        </div>
        <div className="ml-auto">
          {isConfirmed && (
            <Link to={`/bookings/${booking.id}/voucher`}>
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                View Travel Voucher
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Passenger Manifest</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-sm text-muted-foreground">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Passport (Masked)</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {booking.passengers?.map((p: any) => (
                    <tr key={p.id}>
                      <td className="py-3">{p.title} {p.firstName} {p.lastName}</td>
                      <td className="py-3">{p.type}</td>
                      <td className="py-3 font-mono">{p.passportMasked}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Booking Timeline</h2>
            <Timeline events={timelineEvents} />
          </div>
        </div>
      </div>
    </div>
  );
}
