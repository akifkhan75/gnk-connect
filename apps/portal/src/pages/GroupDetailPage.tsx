import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Clock, Star, CheckCircle2, Plane, Hotel } from 'lucide-react';
import { Button, StatusBadge } from '@gnk/ui';

export function GroupDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // In reality, fetch from API. Using mock data matching AirDesk payload.
  const group = {
    id: 'gnk-prod-dxb-01',
    title: 'Dubai Luxury 7-Day Group Departure',
    destination: 'Dubai',
    country: 'United Arab Emirates',
    durationDays: 7,
    durationNights: 6,
    heroImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop',
    overview: 'Experience the glitz and glamour of Dubai with direct flights, 4-star city center accommodation, Desert Safari with BBQ dinner, Dubai Marina Dhow Cruise, and Burj Khalifa 124th floor access.',
    inclusions: [
      'Return Air Ticket on Emirates / FlyDubai (Direct)',
      '6 Nights in 4-Star Millennium / Citymax Hotel with Breakfast',
      'Dubai Airport Meet & Assist + VIP Shared AC Coach Transfers',
      'Desert Safari with Dune Bashing, Camel Ride, Tanoura Show & BBQ Dinner',
      'Dubai Marina Luxury Dhow Cruise with International Buffet',
      'Half-Day Modern Dubai City Tour + Burj Khalifa Level 124 Tickets',
      'UAE Tourist Visa & Mandatory Travel Insurance'
    ],
    airline: 'Emirates / FlyDubai',
    hotelRating: 4,
    departures: [
      {
        id: 'dep-dxb-oct-15',
        departureDate: '2026-10-15',
        returnDate: '2026-10-22',
        totalSeats: 25,
        availableSeats: 6,
        status: 'OPEN'
      },
      {
        id: 'dep-dxb-oct-28',
        departureDate: '2026-10-28',
        returnDate: '2026-11-04',
        totalSeats: 30,
        availableSeats: 12,
        status: 'OPEN'
      }
    ]
  };

  return (
    <div className="space-y-6 flex flex-col w-full pb-10">
      <div>
        <Button variant="ghost" onClick={() => navigate('/groups')} className="-ml-4 mb-4 text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Catalog
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-xl overflow-hidden h-[400px]">
            <img src={group.heroImage} alt={group.title} className="w-full h-full object-cover" />
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm text-primary font-medium mb-2">
              <MapPin className="h-4 w-4" />
              <span>{group.destination}, {group.country}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-4">{group.title}</h1>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground pb-6 border-b">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span>{group.durationDays} Days / {group.durationNights} Nights</span>
              </div>
              <div className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                <span>{group.airline}</span>
              </div>
              <div className="flex items-center gap-2">
                <Hotel className="h-5 w-5" />
                <div className="flex items-center gap-1">
                  <span>{group.hotelRating} Star Hotel</span>
                  <Star className="h-4 w-4 text-gold-500 fill-gold-500" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              {group.overview}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">What's Included</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {group.inclusions.map((inc, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">{inc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border bg-surface p-6 shadow-card">
            <h3 className="text-lg font-bold mb-4">Available Departures</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Prices are currently hidden. Pricing will be available upon account approval and tier assignment.
            </p>
            
            <div className="space-y-4">
              {group.departures.map(dep => (
                <div key={dep.id} className="border rounded-lg p-4 transition-colors hover:border-primary">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium">{new Date(dep.departureDate).toLocaleDateString()}</div>
                    <StatusBadge status={dep.status} className="text-xs" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Calendar className="h-4 w-4" />
                    <span>Returns {new Date(dep.returnDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-sm font-medium text-primary">
                      {dep.availableSeats} seats left
                    </span>
                    <Button size="sm">Book Now</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
