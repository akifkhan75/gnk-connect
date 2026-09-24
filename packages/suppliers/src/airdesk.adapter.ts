import { 
  ISupplierAdapter, 
  ProductFilter, 
  SupplierAvailabilityCheck, 
  AvailabilityResult, 
  SupplierBookingRequest, 
  SupplierBookingResponse, 
  SupplierBookingStatusResponse, 
  CancellationResult 
} from './adapter.interface';
import { StandardGroupProduct, ProductType } from '@gnk/types';

export const MOCK_AIRDESK_GROUPS: StandardGroupProduct[] = [
  {
    id: 'gnk-prod-dxb-01',
    supplierId: 'airdesk',
    supplierProductId: 'AD-DXB-7D-EXP',
    supplierProductCode: 'DXB-LUX-2026',
    productType: 'GROUP_TOUR',
    title: 'Dubai Luxury 7-Day Group Departure',
    destination: 'Dubai',
    country: 'United Arab Emirates',
    durationDays: 7,
    durationNights: 6,
    heroImage: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?q=80&w=1200&auto=format&fit=crop'
    ],
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
    exclusions: [
      'Tourism Dirham Fee (payable at hotel reception directly)',
      'Personal expenses, laundry, and extra room services'
    ],
    itinerary: [
      { day: 1, title: 'Arrival in Dubai & Hotel Check-in', description: 'Arrive at DXB Airport, meet our AirDesk ground representative, transfer to hotel.' },
      { day: 2, title: 'Half-Day Dubai City Tour & Burj Khalifa', description: 'Visit Dubai Frame photo-stop, Jumeirah Mosque, and Burj Khalifa 124th floor.' },
      { day: 3, title: 'Afternoon Desert Safari & BBQ Dinner', description: 'Thrilling 4x4 dune bashing across golden sands, camel riding, BBQ dinner.' },
      { day: 4, title: 'Dubai Marina Dhow Cruise with Dinner', description: 'Day at leisure for shopping. Evening 2-hour Marina Dhow Cruise with buffet.' },
      { day: 5, title: 'Abu Dhabi Day Excursion', description: 'Visit the majestic Sheikh Zayed Grand Mosque and Ferrari World photo stop.' },
      { day: 6, title: 'Free Day for Gold Souk & Leisure', description: 'Explore old Deira spice & gold souks or Miracle Garden.' },
      { day: 7, title: 'Departure Transfer to DXB Airport', description: 'Breakfast at hotel, free time, and scheduled airport transfer.' }
    ],
    airline: 'Emirates / FlyDubai',
    visaIncluded: true,
    hotelRating: 4,
    featured: true,
    departures: [
      {
        id: 'dep-dxb-oct-15',
        departureDate: '2026-10-15',
        returnDate: '2026-10-22',
        totalSeats: 25,
        availableSeats: 6,
        supplierNetPricePKR: 185000,
        status: 'OPEN'
      },
      {
        id: 'dep-dxb-oct-28',
        departureDate: '2026-10-28',
        returnDate: '2026-11-04',
        totalSeats: 30,
        availableSeats: 12,
        supplierNetPricePKR: 188000,
        status: 'OPEN'
      }
    ]
  },
  {
    id: 'gnk-prod-ksa-02',
    supplierId: 'airdesk',
    supplierProductId: 'AD-KSA-15D-UMRAH',
    supplierProductCode: 'UMR-15D-VIP',
    productType: 'UMRAH',
    title: 'Saudi Executive Umrah 15-Day Group',
    destination: 'Makkah & Madinah',
    country: 'Saudi Arabia',
    durationDays: 15,
    durationNights: 14,
    heroImage: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1200&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1200&auto=format&fit=crop'
    ],
    overview: 'Complete peace of mind with 5-star hotel in Makkah (Clock Tower) and 4-star in Madinah (Near Haram), VIP bullet train transfers, and guided Ziarat.',
    inclusions: [
      'Direct Flights (Saudi Arabian Airlines / PIA)',
      '8 Nights in Makkah (5-Star Clock Tower, Steps to Haram)',
      '6 Nights in Madinah (4-Star Millennium Taiba, 150m)',
      'Complete VIP Ground Transfers & Haramain Bullet Train',
      'Guided Historical Ziarat in Makkah & Madinah',
      'Electronic Umrah Visa & Saudi Medical Insurance'
    ],
    exclusions: ['Room service, extra personal meals'],
    itinerary: [
      { day: 1, title: 'Arrival at Jeddah Airport & Transfer to Makkah', description: 'Meet & greet at Jeddah Hajj terminal, private AC transfer to Makkah hotel, perform Umrah.' },
      { day: 2, title: 'Makkah - Rest & Ibadah', description: 'Full day for prayers, Tawaf, and spiritual contemplation.' },
      { day: 9, title: 'Haramain Bullet Train to Madinah', description: 'Transfer to Madinah on 300km/h high-speed train.' },
      { day: 15, title: 'Madinah Departure', description: 'Farewell Salam at Rawdah Mubarak, transfer to airport for departure.' }
    ],
    airline: 'Saudia Airlines',
    visaIncluded: true,
    hotelRating: 5,
    featured: true,
    departures: [
      {
        id: 'dep-ksa-oct-20',
        departureDate: '2026-10-20',
        returnDate: '2026-11-04',
        totalSeats: 40,
        availableSeats: 14,
        supplierNetPricePKR: 225000,
        status: 'OPEN'
      }
    ]
  },
  {
    id: 'gnk-prod-tur-03',
    supplierId: 'airdesk',
    supplierProductId: 'AD-TUR-8D-IST-CAP',
    supplierProductCode: 'TUR-CLASSIC-2026',
    productType: 'GROUP_TOUR',
    title: 'Turkey Highlights (Istanbul & Cappadocia) 8 Days',
    destination: 'Istanbul & Cappadocia',
    country: 'Turkey',
    durationDays: 8,
    durationNights: 7,
    heroImage: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=1200&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=1200&auto=format&fit=crop'
    ],
    overview: 'Discover Istanbul’s Blue Mosque, Hagia Sophia, and Bosphorus Cruise, followed by the fairy chimneys and cave landscapes of Cappadocia.',
    inclusions: [
      'Return International Flights (Turkish Airlines / Pegasus)',
      'Domestic Flight (Istanbul - Cappadocia - Istanbul)',
      '4 Nights in Istanbul + 3 Nights in Cave Hotel Cappadocia',
      'Daily Turkish Buffet Breakfast & Selected Lunches',
      'Bosphorus Dinner Cruise with Turkish Night Show',
      'Full-Day Cappadocia Guided Tour'
    ],
    exclusions: ['Optional hot air balloon ride', 'Personal visa fee'],
    itinerary: [
      { day: 1, title: 'Welcome to Istanbul', description: 'Arrival, airport reception, transfer to hotel.' },
      { day: 4, title: 'Fly to Cappadocia', description: 'Morning flight to Cappadocia, check-in to Cave Hotel.' },
      { day: 8, title: 'Farewell Turkey', description: 'Breakfast, check out, airport transfer.' }
    ],
    airline: 'Turkish Airlines',
    visaIncluded: false,
    hotelRating: 4,
    featured: true,
    departures: [
      {
        id: 'dep-tur-oct-22',
        departureDate: '2026-10-22',
        returnDate: '2026-10-30',
        totalSeats: 20,
        availableSeats: 5,
        supplierNetPricePKR: 295000,
        status: 'OPEN'
      }
    ]
  },
  {
    id: 'gnk-prod-bak-04',
    supplierId: 'airdesk',
    supplierProductId: 'AD-BAK-5D-SPEC',
    supplierProductCode: 'BAK-5D-AUTUMN',
    productType: 'GROUP_TOUR',
    title: 'Baku (Azerbaijan) City & Mountain Tour 5 Days',
    destination: 'Baku & Gabala',
    country: 'Azerbaijan',
    durationDays: 5,
    durationNights: 4,
    heroImage: 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?q=80&w=1200&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?q=80&w=1200&auto=format&fit=crop'
    ],
    overview: 'Explore Flame Towers, Old City, and the lush alpine greenery and cable cars of Gabala.',
    inclusions: [
      'Return Air Ticket (Azerbaijan Airlines / FlyJinnah)',
      '4 Nights in 4-Star Baku Hotel with Breakfast',
      'Baku City Tour & Full-Day Excursion to Gabala',
      'Azerbaijan Official E-Visa & Airport Transfers'
    ],
    exclusions: ['Lunches and Dinners'],
    itinerary: [
      { day: 1, title: 'Arrival in Baku', description: 'Arrive at GYD Airport, transfer to hotel, evening Highland Park tour.' },
      { day: 3, title: 'Gabala Mountains', description: 'Scenic drive to Caucasus mountains, ride Tufandag cable cars.' },
      { day: 5, title: 'Departure', description: 'Shopping at Nizami Street, transfer to airport.' }
    ],
    airline: 'Azerbaijan Airlines',
    visaIncluded: true,
    hotelRating: 4,
    featured: false,
    departures: [
      {
        id: 'dep-bak-nov-02',
        departureDate: '2026-11-02',
        returnDate: '2026-11-07',
        totalSeats: 25,
        availableSeats: 9,
        supplierNetPricePKR: 145000,
        status: 'OPEN'
      }
    ]
  }
];

export class AirDeskSupplierAdapter implements ISupplierAdapter {
  readonly supplierId = 'airdesk';
  readonly supplierName = 'AirDesk Groups API';
  readonly supportedTypes: ProductType[] = ['GROUP_TOUR', 'UMRAH'];

  private groups: StandardGroupProduct[];

  constructor() {
    this.groups = [...MOCK_AIRDESK_GROUPS];
  }

  async getProducts(filter?: ProductFilter): Promise<StandardGroupProduct[]> {
    let results = [...this.groups];
    if (filter?.destination) {
      const q = filter.destination.toLowerCase();
      results = results.filter(p => p.destination.toLowerCase().includes(q) || p.country.toLowerCase().includes(q));
    }
    if (filter?.productType) {
      results = results.filter(p => p.productType === filter.productType);
    }
    return results;
  }

  async getProductDetails(supplierProductId: string): Promise<StandardGroupProduct | null> {
    const found = this.groups.find(p => p.supplierProductId === supplierProductId || p.id === supplierProductId);
    return found ? { ...found } : null;
  }

  async checkAvailability(check: SupplierAvailabilityCheck): Promise<AvailabilityResult> {
    const product = this.groups.find(p => p.supplierProductId === check.supplierProductId || p.id === check.supplierProductId);
    if (!product) throw new Error(`AirDesk Product not found: ${check.supplierProductId}`);
    const departure = product.departures.find(d => d.id === check.departureId);
    if (!departure) throw new Error(`Departure ${check.departureId} not found`);

    const isAvailable = departure.availableSeats >= check.requestedSeats;
    return {
      isAvailable,
      availableSeats: departure.availableSeats,
      currentSupplierNetPricePKR: departure.supplierNetPricePKR,
      currency: 'PKR',
      departure,
      message: isAvailable ? `${departure.availableSeats} seats available` : `Only ${departure.availableSeats} seats remaining`
    };
  }

  async createBooking(request: SupplierBookingRequest): Promise<SupplierBookingResponse> {
    const product = this.groups.find(p => p.supplierProductId === request.supplierProductId || p.id === request.supplierProductId);
    if (!product) return { success: false, supplierBookingId: '', supplierStatus: 'REJECTED', supplierReferenceCode: '', confirmedSeats: 0, totalSupplierCostPKR: 0, errorMessage: 'Product not found' };
    const departure = product.departures.find(d => d.id === request.departureId);
    if (!departure || departure.availableSeats < request.seats) {
      return { success: false, supplierBookingId: '', supplierStatus: 'REJECTED', supplierReferenceCode: '', confirmedSeats: 0, totalSupplierCostPKR: 0, errorMessage: 'Insufficient seats' };
    }

    departure.availableSeats -= request.seats;
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const supplierBookingId = `AD-${randomNum}`;

    return {
      success: true,
      supplierBookingId,
      supplierStatus: 'CONFIRMED',
      supplierReferenceCode: `AIRDESK-REF-${randomNum}`,
      confirmedSeats: request.seats,
      totalSupplierCostPKR: departure.supplierNetPricePKR * request.seats,
      supplierPnrOrVoucher: `PNR-AD-${randomNum.toString().slice(-4)}`
    };
  }

  async getBookingStatus(supplierBookingId: string): Promise<SupplierBookingStatusResponse> {
    return {
      supplierBookingId,
      supplierStatus: 'CONFIRMED',
      ticketOrVoucherUrl: `https://airdesk.travel/vouchers/${supplierBookingId}.pdf`,
      pnr: `AD-${supplierBookingId.slice(-4)}`,
      updatedAt: new Date().toISOString()
    };
  }

  async cancelBooking(supplierBookingId: string, reason: string): Promise<CancellationResult> {
    return {
      success: true,
      supplierRefundAmountPKR: 0,
      cancellationFeePKR: 25000,
      supplierCancellationReference: `CAN-${supplierBookingId}`,
      message: `Cancelled with reason: ${reason}`
    };
  }
}

export const airDeskAdapter = new AirDeskSupplierAdapter();
