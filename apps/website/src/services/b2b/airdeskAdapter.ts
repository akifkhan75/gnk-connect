import { 
  ISupplierAdapter, 
  ProductFilter, 
  SupplierAvailabilityCheck, 
  AvailabilityResult, 
  SupplierBookingRequest, 
  SupplierBookingResponse, 
  SupplierBookingStatusResponse, 
  CancellationResult 
} from './supplierAdapter.interface';
import { StandardGroupProduct, ProductType } from '../../types/b2b';

// Initial realistic AirDesk Mock Inventory
const MOCK_AIRDESK_GROUPS: StandardGroupProduct[] = [
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
      'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?q=80&w=1200&auto=format&fit=crop'
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
      'Personal expenses, laundry, and extra room services',
      'Any meals not mentioned in inclusions'
    ],
    itinerary: [
      { day: 1, title: 'Arrival in Dubai & Hotel Check-in', description: 'Arrive at DXB Airport, meet our AirDesk ground representative, transfer to hotel. Evening at leisure.' },
      { day: 2, title: 'Half-Day Dubai City Tour & Burj Khalifa', description: 'Visit Dubai Frame photo-stop, Jumeirah Mosque, Burj Al Arab view, and visit Burj Khalifa 124th floor in the evening.' },
      { day: 3, title: 'Afternoon Desert Safari & BBQ Dinner', description: 'Thrilling 4x4 dune bashing across golden sands, camel riding, sandboarding, followed by live entertainment & BBQ dinner.' },
      { day: 4, title: 'Dubai Marina Dhow Cruise with Dinner', description: 'Day at leisure for shopping at Dubai Mall. Evening 2-hour Marina Dhow Cruise with buffet dinner & music.' },
      { day: 5, title: 'Abu Dhabi Day Excursion (Optional/Included)', description: 'Visit the majestic Sheikh Zayed Grand Mosque, Ferrari World photo stop, and Yas Island.' },
      { day: 6, title: 'Free Day for Gold Souk & Leisure', description: 'Explore old Deira spice & gold souks or Miracle Garden.' },
      { day: 7, title: 'Departure Transfer to DXB Airport', description: 'Breakfast at hotel, free time for last-minute shopping, and scheduled airport transfer.' }
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
      },
      {
        id: 'dep-dxb-nov-12',
        departureDate: '2026-11-12',
        returnDate: '2026-11-19',
        totalSeats: 30,
        availableSeats: 18,
        supplierNetPricePKR: 192000,
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
      'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=1200&auto=format&fit=crop'
    ],
    overview: 'Complete peace of mind with 5-star hotel in Makkah (Clock Tower / Jabal Omar) and 4-star in Madinah (Near Haram), VIP bullet train / AC bus transport, guided Ziarat and visa processing.',
    inclusions: [
      'Direct Flights (Saudi Arabian Airlines / PIA)',
      '8 Nights in Makkah (5-Star Clock Tower / Swissotel, Steps to Haram)',
      '6 Nights in Madinah (4-Star Millennium Taiba, 150m)',
      'Complete VIP Ground Transfers (Jeddah-Makkah-Madinah-Jeddah)',
      'Guided Historical Ziarat in Makkah & Madinah with Scholar',
      'Electronic Umrah Visa & Full Saudi Medical Insurance',
      '24/7 AirDesk On-ground Support Team & 5L Zamzam Water'
    ],
    exclusions: [
      'Room service, laundry, extra personal meals',
      'Wheelchair assistance or porter tips'
    ],
    itinerary: [
      { day: 1, title: 'Arrival at Jeddah Airport & Transfer to Makkah', description: 'Meet & greet at Jeddah Hajj terminal, private AC transfer to Makkah hotel, perform Umrah with group guide.' },
      { day: 2, title: 'Makkah - Rest & Ibadah in Masjid Al-Haram', description: 'Full day for prayers, Tawaf, and spiritual contemplation.' },
      { day: 4, title: 'Makkah Holy Ziarat', description: 'Visit Jabal Al-Noor (Cave Hira), Jabal Thawr, Mina, Muzdalifah, and Arafat with historical narration.' },
      { day: 9, title: 'Transfer to Madinah via Haramain High-Speed Train', description: 'Check out from Makkah, travel in comfort on the 300km/h high-speed bullet train to Madinah Munawwarah.' },
      { day: 11, title: 'Madinah Munawwarah Ziarat', description: 'Visit Masjid Quba (first mosque in Islam), Mount Uhud, and Masjid Al-Qiblatayn.' },
      { day: 15, title: 'Madinah to Airport Departure', description: 'Farewell Salam at Rawdah Mubarak, transfer to Madinah/Jeddah airport for return flight.' }
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
      },
      {
        id: 'dep-ksa-nov-05',
        departureDate: '2026-11-05',
        returnDate: '2026-11-20',
        totalSeats: 40,
        availableSeats: 22,
        supplierNetPricePKR: 230000,
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
      'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?q=80&w=1200&auto=format&fit=crop'
    ],
    overview: 'Discover the enchanting crossroads of Europe and Asia. Explore Istanbul’s Blue Mosque, Hagia Sophia, and Bosphorus Cruise, followed by the fairy chimneys and cave landscapes of Cappadocia.',
    inclusions: [
      'Return International Flights (Turkish Airlines / Pegasus)',
      'Domestic Flight (Istanbul - Cappadocia - Istanbul)',
      '4 Nights in 4-Star Istanbul Hotel + 3 Nights in Authentic Cave Hotel Cappadocia',
      'Daily Turkish Buffet Breakfast & Selected Lunches',
      'Full-Day Istanbul Byzantine & Ottoman Relics Tour with Professional English Guide',
      'Bosphorus Dinner Cruise with Turkish Night Show',
      'Full-Day Cappadocia South & North Tour (Goreme Open Air Museum, Underground City)',
      'All Airport Transfers in AC Luxury Coaches'
    ],
    exclusions: [
      'Cappadocia Hot Air Balloon Ride (Available as optional add-on)',
      'Personal expenses and visa fees'
    ],
    itinerary: [
      { day: 1, title: 'Welcome to Istanbul', description: 'Arrival in Istanbul, airport reception, transfer to hotel, evening walking orientation.' },
      { day: 2, title: 'Istanbul Historic Peninsula Tour', description: 'Hagia Sophia, Blue Mosque, Hippodrome, and Grand Bazaar shopping.' },
      { day: 3, title: 'Bosphorus Cruise & Spice Market', description: 'Cruise between continents along the Bosphorus Strait, visit Egyptian Spice Market.' },
      { day: 4, title: 'Fly to Cappadocia & Fairy Chimneys', description: 'Morning domestic flight to Cappadocia, check-in to Cave Hotel, visit Devrent Valley.' },
      { day: 5, title: 'Cappadocia Tour & Hot Air Balloons', description: 'Optional sunrise balloon ride, followed by Goreme Open-Air Museum and Derinkuyu underground city.' },
      { day: 6, title: 'Uchisar Castle & Pigeon Valley', description: 'Panoramic views from Uchisar rock castle, pottery making demonstration in Avanos.' },
      { day: 7, title: 'Fly back to Istanbul - Free Evening', description: 'Fly to Istanbul, free evening in Taksim Square & Istiklal Street.' },
      { day: 8, title: 'Farewell Turkey', description: 'Breakfast, check out, and transfer to Istanbul International Airport.' }
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
      },
      {
        id: 'dep-tur-nov-15',
        departureDate: '2026-11-15',
        returnDate: '2026-11-23',
        totalSeats: 20,
        availableSeats: 11,
        supplierNetPricePKR: 285000,
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
    overview: 'Explore the land of fire! From the historic Old City (Icherisheher) and iconic Flame Towers to the lush alpine greenery and cable cars of Gabala.',
    inclusions: [
      'Return Air Ticket (Azerbaijan Airlines / FlyJinnah)',
      '4 Nights in 4-Star Baku Hotel with Breakfast',
      'All Sightseeing with English/Urdu speaking guide in Luxury Coach',
      'Baku City Tour (Flame Towers, Boulevard, Old Town, Heydar Aliyev Center)',
      'Full-Day Excursion to Gabala with Tufandag Cable Car Tickets',
      'Ateshgah Fire Temple & Yanardag Burning Mountain Excursion',
      'Azerbaijan Official E-Visa & Airport Transfers'
    ],
    exclusions: ['Lunches and Dinners', 'Personal gratuities'],
    itinerary: [
      { day: 1, title: 'Arrival in Baku & Night Tour', description: 'Arrive at GYD Airport, transfer to hotel, evening visit to Highland Park for panoramic view of Flame Towers.' },
      { day: 2, title: 'Baku Old City & Modern Landmarks', description: 'Visit Maiden Tower, Shirvanshahs Palace, Heydar Aliyev Cultural Center.' },
      { day: 3, title: 'Full Day Gabala Nature Tour', description: 'Scenic drive to Caucasus mountains, visit Nohur Lake and ride the Tufandag Mountain Ropeway.' },
      { day: 4, title: 'Ateshgah Fire Temple & Yanar Dag', description: 'Discover the ancient Zoroastrian Fire Temple and eternal natural gas flames at Yanar Dag.' },
      { day: 5, title: 'Departure Transfer', description: 'Breakfast, shopping at Nizami Street, transfer to Baku Airport.' }
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
    // Clone initial mock data to enable runtime seat reservations
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('gnk_airdesk_inventory');
      if (stored) {
        try {
          this.groups = JSON.parse(stored);
        } catch (e) {
          this.groups = [...MOCK_AIRDESK_GROUPS];
        }
      } else {
        this.groups = [...MOCK_AIRDESK_GROUPS];
        this.persist();
      }
    } else {
      this.groups = [...MOCK_AIRDESK_GROUPS];
    }
  }

  private persist() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('gnk_airdesk_inventory', JSON.stringify(this.groups));
      } catch (e) {
        console.warn('Failed to persist AirDesk inventory', e);
      }
    }
  }

  private async simulateNetworkDelay(ms = 350) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getProducts(filter?: ProductFilter): Promise<StandardGroupProduct[]> {
    await this.simulateNetworkDelay(300);
    let results = [...this.groups];

    if (filter) {
      if (filter.destination) {
        const query = filter.destination.toLowerCase();
        results = results.filter(p => 
          p.destination.toLowerCase().includes(query) || 
          p.country.toLowerCase().includes(query) ||
          p.title.toLowerCase().includes(query)
        );
      }
      if (filter.productType) {
        results = results.filter(p => p.productType === filter.productType);
      }
      if (filter.minSeats) {
        results = results.filter(p => 
          p.departures.some(d => d.availableSeats >= (filter.minSeats || 1))
        );
      }
    }

    return results;
  }

  async getProductDetails(supplierProductId: string): Promise<StandardGroupProduct | null> {
    await this.simulateNetworkDelay(250);
    const found = this.groups.find(p => p.supplierProductId === supplierProductId || p.id === supplierProductId);
    return found ? { ...found } : null;
  }

  async checkAvailability(check: SupplierAvailabilityCheck): Promise<AvailabilityResult> {
    await this.simulateNetworkDelay(200);
    const product = this.groups.find(p => p.supplierProductId === check.supplierProductId || p.id === check.supplierProductId);
    
    if (!product) {
      throw new Error(`AirDesk Product not found: ${check.supplierProductId}`);
    }

    const departure = product.departures.find(d => d.id === check.departureId);
    if (!departure) {
      throw new Error(`Departure date ${check.departureId} not found in AirDesk inventory.`);
    }

    const isAvailable = departure.availableSeats >= check.requestedSeats;

    return {
      isAvailable,
      availableSeats: departure.availableSeats,
      currentSupplierNetPricePKR: departure.supplierNetPricePKR,
      currency: 'PKR',
      departure,
      message: isAvailable 
        ? `${departure.availableSeats} seats available at PKR ${departure.supplierNetPricePKR.toLocaleString()}`
        : `Only ${departure.availableSeats} seats remaining (requested ${check.requestedSeats})`
    };
  }

  async createBooking(request: SupplierBookingRequest): Promise<SupplierBookingResponse> {
    await this.simulateNetworkDelay(600);

    const productIndex = this.groups.findIndex(p => p.supplierProductId === request.supplierProductId || p.id === request.supplierProductId);
    if (productIndex === -1) {
      return {
        success: false,
        supplierBookingId: '',
        supplierStatus: 'REJECTED',
        supplierReferenceCode: '',
        confirmedSeats: 0,
        totalSupplierCostPKR: 0,
        errorMessage: `AirDesk Product ${request.supplierProductId} not found`
      };
    }

    const departureIndex = this.groups[productIndex].departures.findIndex(d => d.id === request.departureId);
    if (departureIndex === -1) {
      return {
        success: false,
        supplierBookingId: '',
        supplierStatus: 'REJECTED',
        supplierReferenceCode: '',
        confirmedSeats: 0,
        totalSupplierCostPKR: 0,
        errorMessage: `Departure ${request.departureId} not found`
      };
    }

    const departure = this.groups[productIndex].departures[departureIndex];
    if (departure.availableSeats < request.seats) {
      return {
        success: false,
        supplierBookingId: '',
        supplierStatus: 'REJECTED',
        supplierReferenceCode: '',
        confirmedSeats: 0,
        totalSupplierCostPKR: 0,
        errorMessage: `Insufficient seats. Only ${departure.availableSeats} available, requested ${request.seats}.`
      };
    }

    // Decrement available seats in AirDesk inventory
    departure.availableSeats -= request.seats;
    if (departure.availableSeats === 0) {
      departure.status = 'SOLD_OUT';
    } else if (departure.availableSeats <= 5) {
      departure.status = 'FILLING_FAST';
    }

    this.persist();

    // Generate AirDesk Unique Supplier Reference
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const supplierBookingId = `AD-${randomNum}`;
    const totalCost = departure.supplierNetPricePKR * request.seats;

    return {
      success: true,
      supplierBookingId,
      supplierStatus: 'CONFIRMED',
      supplierReferenceCode: `AIRDESK-REF-${randomNum}`,
      confirmedSeats: request.seats,
      totalSupplierCostPKR: totalCost,
      supplierPnrOrVoucher: `PNR-AD-${randomNum.toString().slice(-4)}`,
      rawSupplierResponse: {
        vendor: 'AirDesk Groups Engine',
        timestamp: new Date().toISOString(),
        externalGnkBookingId: request.externalGnkBookingId,
        passengersCount: request.passengers.length
      }
    };
  }

  async getBookingStatus(supplierBookingId: string): Promise<SupplierBookingStatusResponse> {
    await this.simulateNetworkDelay(300);
    return {
      supplierBookingId,
      supplierStatus: 'CONFIRMED',
      ticketOrVoucherUrl: `https://airdesk.travel/vouchers/${supplierBookingId}.pdf`,
      pnr: `AD-${supplierBookingId.slice(-4)}`,
      updatedAt: new Date().toISOString()
    };
  }

  async cancelBooking(supplierBookingId: string, reason: string): Promise<CancellationResult> {
    await this.simulateNetworkDelay(400);
    return {
      success: true,
      supplierRefundAmountPKR: 0,
      cancellationFeePKR: 25000,
      supplierCancellationReference: `CAN-${supplierBookingId}`,
      message: `AirDesk booking ${supplierBookingId} cancelled. Reason: ${reason}. Cancellation fee PKR 25,000 applied per policy.`
    };
  }
}

// Export singleton instance
export const airDeskAdapter = new AirDeskSupplierAdapter();
