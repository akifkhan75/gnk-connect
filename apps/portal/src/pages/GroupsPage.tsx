import { Search, MapPin, Calendar, Clock, Star } from 'lucide-react';
import { Button } from '@gnk/ui';
import { useNavigate } from 'react-router-dom';

export function GroupsPage() {
  const navigate = useNavigate();
  
  const mockGroups = [
    {
      id: 'gnk-prod-dxb-01',
      title: 'Dubai Luxury 7-Day Group Departure',
      destination: 'Dubai',
      country: 'United Arab Emirates',
      durationDays: 7,
      durationNights: 6,
      heroImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop',
      departuresCount: 2,
      featured: true,
      hotelRating: 4,
    },
    {
      id: 'gnk-prod-ksa-02',
      title: 'Saudi Executive Umrah 15-Day Group',
      destination: 'Makkah & Madinah',
      country: 'Saudi Arabia',
      durationDays: 15,
      durationNights: 14,
      heroImage: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1200&auto=format&fit=crop',
      departuresCount: 1,
      featured: true,
      hotelRating: 5,
    },
    {
      id: 'gnk-prod-tur-03',
      title: 'Turkey Highlights (Istanbul & Cappadocia) 8 Days',
      destination: 'Istanbul & Cappadocia',
      country: 'Turkey',
      durationDays: 8,
      durationNights: 7,
      heroImage: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=1200&auto=format&fit=crop',
      departuresCount: 1,
      featured: true,
      hotelRating: 4,
    },
  ];

  return (
    <div className="space-y-6 flex flex-col w-full pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Catalog & Groups</h2>
          <p className="text-muted-foreground mt-1">
            Browse all available B2B group departures and Umrah packages.
          </p>
        </div>
        <div className="flex items-center gap-3 relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search destination, country..." 
            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockGroups.map((group) => (
          <div key={group.id} className="group flex flex-col overflow-hidden rounded-xl border bg-surface shadow-card transition-all hover:shadow-lg">
            <div className="relative h-48 overflow-hidden">
              <img 
                src={group.heroImage} 
                alt={group.title} 
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {group.featured && (
                <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded">
                  Featured
                </div>
              )}
            </div>
            
            <div className="flex flex-col flex-1 p-5">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <MapPin className="h-3 w-3" />
                <span>{group.destination}, {group.country}</span>
              </div>
              
              <h3 className="font-semibold text-lg leading-tight mb-3 line-clamp-2">
                {group.title}
              </h3>
              
              <div className="flex items-center gap-4 mt-auto text-sm text-muted-foreground mb-5">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{group.durationDays} Days</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{group.departuresCount} Departures</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-gold-500 fill-gold-500" />
                  <span>{group.hotelRating} Star</span>
                </div>
              </div>
              
              <Button className="w-full" onClick={() => navigate(`/groups/${group.id}`)}>
                View Details
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
