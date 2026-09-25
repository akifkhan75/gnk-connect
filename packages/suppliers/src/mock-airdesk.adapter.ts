import {
  AvailabilityResult,
  SupplierAdapter,
  SupplierBookingRequest,
  SupplierBookingResult,
  SupplierDeparture,
  SupplierError,
  SupplierProduct,
  SupplierProductContent,
  SupplierProductType,
} from './contract';

// Stand-in for the AirDesk groups API until sandbox credentials are available.
// Inventory is deterministic: departures are anchored to the first day of the
// current month, so re-syncing produces the same IDs and dates never go stale.

interface Template {
  code: string;
  type: SupplierProductType;
  title: string;
  sector: string | null;
  airline: string;
  destination: string;
  country: string;
  durationDays: number;
  baseFare: number;
  baggage: string;
  dayOffsets: number[];
  content: SupplierProductContent;
}

const groupTicket = (
  code: string,
  from: string,
  to: string,
  airline: string,
  flightOut: string,
  flightIn: string,
  times: [string, string, string, string],
  destination: string,
  country: string,
  durationDays: number,
  baseFare: number,
  baggage: string,
  dayOffsets: number[],
): Template => ({
  code,
  type: 'GROUP',
  title: `${from}–${to} Group Ticket · ${airline}`,
  sector: `${from}-${to}`,
  airline,
  destination,
  country,
  durationDays,
  baseFare,
  baggage,
  dayOffsets,
  content: {
    overview: `Return group seats on ${airline} from ${from} to ${to}, ${durationDays} days. Fixed dates, allocated seats, group fare.`,
    inclusions: [
      'Return economy ticket on fixed group dates',
      `Checked baggage ${baggage}`,
      'Airport taxes',
    ],
    exclusions: ['Visa', 'Hotel and transport', 'Name changes after ticketing'],
    itinerary: [],
    outbound: { flightNo: flightOut, from, to, departTime: times[0], arriveTime: times[1] },
    inbound: { flightNo: flightIn, from: to, to: from, departTime: times[2], arriveTime: times[3] },
  },
});

const TEMPLATES: Template[] = [
  groupTicket(
    'LHE-JED-SV',
    'LHE',
    'JED',
    'Saudia',
    'SV 739',
    'SV 738',
    ['04:10', '07:20', '22:40', '05:55'],
    'Jeddah',
    'SA',
    21,
    168000,
    '2 × 23 KG',
    [6, 13, 20, 34, 48],
  ),
  groupTicket(
    'ISB-JED-PK',
    'ISB',
    'JED',
    'PIA',
    'PK 741',
    'PK 742',
    ['03:00', '06:15', '09:30', '17:05'],
    'Jeddah',
    'SA',
    14,
    159000,
    '40 KG',
    [4, 18, 32, 46],
  ),
  groupTicket(
    'KHI-JED-PA',
    'KHI',
    'JED',
    'Airblue',
    'PA 870',
    'PA 871',
    ['02:15', '04:45', '06:05', '12:20'],
    'Jeddah',
    'SA',
    21,
    149000,
    '30 + 7 KG',
    [9, 23, 37, 51],
  ),
  groupTicket(
    'LHE-MED-SV',
    'LHE',
    'MED',
    'Saudia',
    'SV 735',
    'SV 734',
    ['03:35', '06:40', '20:15', '03:30'],
    'Madinah',
    'SA',
    15,
    174000,
    '2 × 23 KG',
    [11, 25, 39],
  ),
  groupTicket(
    'LHE-DXB-EK',
    'LHE',
    'DXB',
    'Emirates',
    'EK 623',
    'EK 622',
    ['04:25', '06:55', '22:35', '02:50'],
    'Dubai',
    'AE',
    7,
    112000,
    '30 KG',
    [5, 12, 19, 26, 40],
  ),
  groupTicket(
    'ISB-DXB-FZ',
    'ISB',
    'DXB',
    'flydubai',
    'FZ 352',
    'FZ 351',
    ['11:20', '13:55', '06:40', '10:35'],
    'Dubai',
    'AE',
    5,
    89000,
    '20 + 7 KG',
    [8, 15, 29, 43],
  ),
  groupTicket(
    'KHI-RUH-XY',
    'KHI',
    'RUH',
    'flynas',
    'XY 318',
    'XY 317',
    ['01:40', '03:35', '20:50', '00:55'],
    'Riyadh',
    'SA',
    30,
    118000,
    '30 KG',
    [10, 31, 52],
  ),
  groupTicket(
    'PEW-JED-PK',
    'PEW',
    'JED',
    'PIA',
    'PK 725',
    'PK 726',
    ['05:30', '08:40', '10:10', '18:25'],
    'Jeddah',
    'SA',
    21,
    162000,
    '40 KG',
    [16, 44],
  ),
  {
    code: 'UMRAH-15-EXEC',
    type: 'UMRAH',
    title: '15-Day Executive Umrah · Makkah & Madinah',
    sector: 'LHE-JED',
    airline: 'Saudia',
    destination: 'Makkah & Madinah',
    country: 'SA',
    durationDays: 15,
    baseFare: 265000,
    baggage: '2 × 23 KG',
    dayOffsets: [14, 28, 42],
    content: {
      overview:
        'Umrah package with Saudia flights, 5-star Makkah hotel within walking distance of the Haram, 4-star Madinah hotel, visa and ground transport.',
      inclusions: [
        'Return flights LHE–JED / MED–LHE on Saudia',
        'Umrah visa and Saudi medical insurance',
        '8 nights Makkah, 5-star, ~300 m from Haram, breakfast',
        '6 nights Madinah, 4-star, ~150 m from Masjid an-Nabawi, breakfast',
        'Haramain train Makkah → Madinah',
        'Airport and intercity transfers, guided Ziarat in both cities',
      ],
      exclusions: ['Lunch and dinner', 'Personal expenses', 'Qurbani'],
      itinerary: [
        {
          day: 1,
          title: 'Arrive Jeddah, transfer to Makkah',
          description: 'Meet at the Hajj terminal, transfer to hotel, perform Umrah.',
        },
        {
          day: 2,
          title: 'Makkah',
          description: 'Days for prayer and Tawaf. Guided Ziarat on day 4.',
        },
        {
          day: 9,
          title: 'Haramain train to Madinah',
          description: 'Check in near Masjid an-Nabawi.',
        },
        { day: 12, title: 'Madinah Ziarat', description: 'Quba, Uhud and the Seven Mosques.' },
        {
          day: 15,
          title: 'Depart Madinah',
          description: 'Transfer to MED airport for the flight home.',
        },
      ],
      outbound: {
        flightNo: 'SV 739',
        from: 'LHE',
        to: 'JED',
        departTime: '04:10',
        arriveTime: '07:20',
      },
      inbound: {
        flightNo: 'SV 736',
        from: 'MED',
        to: 'LHE',
        departTime: '19:30',
        arriveTime: '02:40',
      },
      hotels: [
        { city: 'Makkah', name: 'Swissôtel Al Maqam', stars: 5, nights: 8 },
        { city: 'Madinah', name: 'Millennium Taiba', stars: 4, nights: 6 },
      ],
    },
  },
  {
    code: 'UMRAH-21-ECO',
    type: 'UMRAH',
    title: '21-Day Economy Umrah · Shared Rooms',
    sector: 'ISB-JED',
    airline: 'PIA',
    destination: 'Makkah & Madinah',
    country: 'SA',
    durationDays: 21,
    baseFare: 219000,
    baggage: '40 KG',
    dayOffsets: [7, 21, 35, 49],
    content: {
      overview:
        'Value Umrah package for families and groups: PIA flights, 3-star hotels with shuttle to the Haram, quad-sharing rooms.',
      inclusions: [
        'Return flights ISB–JED on PIA',
        'Umrah visa and insurance',
        '14 nights Makkah, 3-star, shuttle service',
        '6 nights Madinah, 3-star, ~600 m from Haram',
        'Shared AC coach for all transfers',
      ],
      exclusions: ['Meals', 'Ziarat', 'Personal expenses'],
      itinerary: [
        {
          day: 1,
          title: 'Arrive Jeddah',
          description: 'Transfer by coach to Makkah, perform Umrah.',
        },
        { day: 15, title: 'Coach to Madinah', description: 'Check in and rest.' },
        { day: 21, title: 'Return', description: 'Coach to Jeddah for the flight home.' },
      ],
      outbound: {
        flightNo: 'PK 741',
        from: 'ISB',
        to: 'JED',
        departTime: '03:00',
        arriveTime: '06:15',
      },
      inbound: {
        flightNo: 'PK 742',
        from: 'JED',
        to: 'ISB',
        departTime: '09:30',
        arriveTime: '17:05',
      },
      hotels: [
        { city: 'Makkah', name: 'Elaf Ajyad', stars: 3, nights: 14 },
        { city: 'Madinah', name: 'Al Eiman Royal', stars: 3, nights: 6 },
      ],
    },
  },
];

// Small deterministic hash (FNV-1a) so seat counts and fares are stable per departure.
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

function buildDepartures(t: Template, now: Date): SupplierDeparture[] {
  const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return t.dayOffsets
    .map((offset) => {
      const dep = new Date(anchor.getTime() + offset * 86_400_000);
      const ret = new Date(dep.getTime() + (t.durationDays - 1) * 86_400_000);
      const id = `${t.code}-${isoDate(dep).replace(/-/g, '')}`;
      const h = hash(id);
      const totalSeats = [20, 25, 30, 40][h % 4];
      const fareDelta = ((h >>> 4) % 9) * 1500 - 6000;
      return {
        supplierDepartureId: id,
        departureDate: isoDate(dep),
        returnDate: isoDate(ret),
        totalSeats,
        availableSeats: 2 + ((h >>> 8) % (totalSeats - 2)),
        netFare: t.baseFare + fareDelta,
        baggage: t.baggage,
      };
    })
    .filter((d) => d.departureDate >= isoDate(now));
}

export class MockAirDeskAdapter implements SupplierAdapter {
  readonly key = 'airdesk';
  readonly name = 'AirDesk (mock)';

  // Seats sold through this process, keyed by supplierDepartureId.
  private readonly sold = new Map<string, number>();
  private readonly bookings = new Map<
    string,
    SupplierBookingResult & { departureId: string; seats: number }
  >();
  private readonly byIdempotencyKey = new Map<string, string>();

  constructor(private readonly clock: () => Date = () => new Date()) {}

  async listProducts(): Promise<SupplierProduct[]> {
    const now = this.clock();
    return TEMPLATES.map((t) => ({
      supplierProductId: `AD-${t.code}`,
      type: t.type,
      title: t.title,
      sector: t.sector,
      airline: t.airline,
      destination: t.destination,
      country: t.country,
      durationDays: t.durationDays,
      content: t.content,
      departures: buildDepartures(t, now).map((d) => ({
        ...d,
        availableSeats: Math.max(0, d.availableSeats - (this.sold.get(d.supplierDepartureId) ?? 0)),
      })),
    }));
  }

  async checkAvailability(
    supplierProductId: string,
    supplierDepartureId: string,
    seats: number,
  ): Promise<AvailabilityResult> {
    const departure = await this.findDeparture(supplierProductId, supplierDepartureId);
    return {
      available: departure.availableSeats >= seats,
      availableSeats: departure.availableSeats,
      netFare: departure.netFare,
    };
  }

  async createBooking(request: SupplierBookingRequest): Promise<SupplierBookingResult> {
    const existing = this.byIdempotencyKey.get(request.idempotencyKey);
    if (existing) return this.strip(this.bookings.get(existing)!);

    const departure = await this.findDeparture(
      request.supplierProductId,
      request.supplierDepartureId,
    );
    if (departure.availableSeats < request.seats) {
      throw new SupplierError(
        'SOLD_OUT',
        `Only ${departure.availableSeats} seats left on ${request.supplierDepartureId}`,
      );
    }

    this.sold.set(
      departure.supplierDepartureId,
      (this.sold.get(departure.supplierDepartureId) ?? 0) + request.seats,
    );
    const h = hash(request.idempotencyKey);
    const ref = `AD-${String(100000 + (h % 900000))}`;
    const pnr = Array.from(
      { length: 6 },
      (_, i) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[(h >>> (i * 5)) % 32],
    ).join('');
    const record = {
      supplierBookingRef: ref,
      status: 'CONFIRMED' as const,
      pnr,
      departureId: departure.supplierDepartureId,
      seats: request.seats,
    };
    this.bookings.set(ref, record);
    this.byIdempotencyKey.set(request.idempotencyKey, ref);
    return this.strip(record);
  }

  async getBookingStatus(supplierBookingRef: string): Promise<SupplierBookingResult> {
    const record = this.bookings.get(supplierBookingRef);
    if (!record)
      throw new SupplierError('NOT_FOUND', `Unknown supplier booking ${supplierBookingRef}`);
    return this.strip(record);
  }

  async cancelBooking(supplierBookingRef: string): Promise<SupplierBookingResult> {
    const record = this.bookings.get(supplierBookingRef);
    if (!record)
      throw new SupplierError('NOT_FOUND', `Unknown supplier booking ${supplierBookingRef}`);
    if (record.status !== 'CANCELLED') {
      record.status = 'CANCELLED';
      this.sold.set(
        record.departureId,
        Math.max(0, (this.sold.get(record.departureId) ?? 0) - record.seats),
      );
    }
    return this.strip(record);
  }

  private async findDeparture(supplierProductId: string, supplierDepartureId: string) {
    const products = await this.listProducts();
    const departure = products
      .find((p) => p.supplierProductId === supplierProductId)
      ?.departures.find((d) => d.supplierDepartureId === supplierDepartureId);
    if (!departure)
      throw new SupplierError('NOT_FOUND', `Departure ${supplierDepartureId} not found`);
    return departure;
  }

  private strip(record: SupplierBookingResult): SupplierBookingResult {
    return {
      supplierBookingRef: record.supplierBookingRef,
      status: record.status,
      pnr: record.pnr,
    };
  }
}
