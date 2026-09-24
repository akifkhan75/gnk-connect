import { Service, Destination, Testimonial, NewsItem } from './types';

export const BRAND_NAME = "GNK Connect";
export const BRAND_TAGLINE = "Crafting Journeys, Creating Memories";

export const NAV_LINKS = [
  { name: 'Home', path: '/' },
  { name: 'Services', path: '/services' },
  { name: 'Destinations', path: '/destinations' },
  { name: 'Guides & Insights', path: '/news' },
  { name: 'About Us', path: '/about' },
  { name: 'Contact', path: '/contact' },
];

export const SERVICES: Service[] = [
  {
    id: '1',
    title: 'Executive Umrah Packages',
    description: 'Comprehensive spiritual journeys with 5-star accommodation, VIP private transport, and personal guidance.',
    iconName: 'Moon',
    link: '/services/umrah',
    image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1200&auto=format&fit=crop',
    longDescription: 'Experience a spiritually uplifting and seamless journey with GNK Connect Executive Umrah Packages. We prioritize your peace of mind and comfort, securing premium 5-star accommodations directly facing the Haram, VIP GMC ground transfers between Jeddah, Makkah, and Madinah, alongside personalized Ziarat arrangements.',
    benefits: [
      '5-Star Luxury Hotels (Steps from the Haram Courtyard)',
      'VIP Private GMC Transport (Jeddah - Makkah - Madinah)',
      'Express Umrah Visa & Comprehensive Insurance',
      'Dedicated Multilingual Ziarat Tour Guides',
      '24/7 On-ground Executive Support Staff',
      'Complimentary Premium Ihram & Pilgrimage Travel Kits'
    ],
    packages: [
      {
        name: 'Economy Package',
        price: '$950',
        duration: '15 Days',
        features: ['3-Star Hotels (350m to Courtyard)', 'Shared AC Transport', 'Visa & Medical Insurance', 'Direct Flights Assistance']
      },
      {
        name: 'Executive VIP Package',
        price: '$1,800',
        duration: '10 Days',
        features: ['5-Star Clock Tower Hotels (Haram View)', 'Private GMC Suburban Transfer', 'VIP Visa & Fast-Track Support', 'Exclusive Private Ziarat']
      },
      {
        name: 'Premium Group',
        price: '$1,200',
        duration: '21 Days',
        features: ['4-Star Hotels (150m)', 'Luxury Bus Transport', 'Complete Ziarat Itinerary', 'Full Board Buffet Meals']
      }
    ],
    ctaText: 'Book Your Umrah'
  },
  {
    id: '2',
    title: 'Visit Visas & Sticker Visas',
    description: 'Hassle-free sticker visa processing and expert file preparation for major global destinations.',
    iconName: 'FileCheck',
    link: '/services/visas',
    image: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?q=80&w=1200&auto=format&fit=crop',
    longDescription: 'Navigate the complex documentation requirements of worldwide embassies effortlessly. Our certified visa consultants provide end-to-end guidance for sticker and electronic visas, covering GCC, UK, USA, Schengen, and Southeast Asia.',
    benefits: [
      'Thorough Embassy Document Assessment & Audit',
      'Expedited Appointment Scheduling Assistance',
      'Professional Cover Letter & Detailed Itinerary Drafting',
      'Embassy Interview Preparation & Mock Sessions',
      'Consistently High Visa Success Rate'
    ],
    processSteps: [
      { title: 'Profile Consultation', desc: 'We review your travel history and financial profile to structure the strongest application.' },
      { title: 'File Preparation', desc: 'Collection, verification, and translation of all mandatory personal, tax, and banking documents.' },
      { title: 'Submission & Biometrics', desc: 'Filing with the official embassy portal or VFS/Gerrys submission center.' },
      { title: 'Passport Delivery', desc: 'Real-time tracking with secure passport dispatch upon visa issuance.' }
    ],
    packages: [
      {
        name: 'Dubai (UAE) E-Visa',
        price: '$150',
        duration: '30 Days',
        features: ['30/60 Days Single Entry', 'Mandatory COVID/Medical Insurance', '3-4 Working Days Processing', 'Zero Embassy Visit']
      },
      {
        name: 'Thailand Sticker Visa',
        price: '$80',
        duration: '60 Days',
        features: ['Official Sticker Visa', 'Document Scrutiny & VFS Booking', 'Cover Letter & Flight Voucher', 'Single / Multiple Entry Options']
      },
      {
        name: 'Schengen File Consultation',
        price: '$200',
        duration: '15-20 Days',
        features: ['Complete Dossier Preparation', 'Verifiable Flight & Hotel Vouchers', 'Mock Interview Coaching', 'Cover Letter Tailoring']
      }
    ],
    ctaText: 'Apply For Visa'
  },
  {
    id: '3',
    title: 'Hotel Bookings',
    description: 'Exclusive corporate & partner rates for domestic and international luxury resorts and boutique hotels.',
    iconName: 'Hotel',
    link: '/services/hotels',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop',
    longDescription: 'Whether reserving a private villa in Bali, a 5-star suite in Downtown Dubai, or a scenic wooden chalet in Hunza, GNK Connect unlocks negotiated B2B rates unavailable on consumer booking platforms.',
    benefits: [
      'Direct Wholesale Partner Pricing',
      'Flexible Cancellation & Rebooking Terms',
      'Complimentary Room Upgrades & Breakfast Inclusions',
      'Corporate & Extended Stay Discounts',
      '24/7 Dedicated Concierge & Check-in Support'
    ],
    ctaText: 'Find A Hotel'
  },
  {
    id: '4',
    title: 'Airline Tickets',
    description: 'Domestic & international flight reservations with competitive pricing and 24/7 rescheduling support.',
    iconName: 'Plane',
    link: '/services/tickets',
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1200&auto=format&fit=crop',
    longDescription: 'Fly anywhere worldwide with GNK Connect. We secure seats on leading domestic and international carriers (Emirates, Qatar Airways, Saudia, PIA, Turkish Airlines, Flydubai) with optimized layovers and luggage allowances.',
    benefits: [
      'Direct GDS Airline Rates with Zero Hidden Fees',
      'Complimentary Seat & Special Meal Selection',
      'Instant Date Changes & Refund Handling',
      'Group & Corporate Bulk Booking Fares',
      'Emergency Re-routing Support'
    ],
    ctaText: 'Book Flight'
  },
  {
    id: '5',
    title: 'Domestic Tours',
    description: 'Explore the majestic peaks, alpine lakes, and cold deserts of Northern Pakistan.',
    iconName: 'Map',
    link: '/services/domestic-tours',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop',
    longDescription: 'Pakistan is home to the world’s most dramatic landscapes. GNK Connect curates luxury domestic tours across Gilgit-Baltistan, Hunza, Skardu, Fairy Meadows, and Naran Kaghan with experienced local guides and modern 4x4 vehicles.',
    benefits: [
      'Late-Model Prado / Land Cruiser 4x4 Vehicles',
      'Experienced Mountain Drivers & Licensed Guides',
      'Verified Family-Friendly Scenic Hotels & Resorts',
      'Campfire, BBQ & Cultural Evenings Included',
      'Private Jeep Safari to Deosai & Attabad Lake Boating'
    ],
    packages: [
      {
        name: 'Naran & Babusar Top',
        price: '$545',
        duration: '5 Days',
        features: ['Private Sedan / GLI Transport', 'Deluxe Lake View Hotels', 'Daily Breakfast & Dinner', 'Saiful Malook Jeep Safari']
      },
      {
        name: 'Skardu Valley Adventure',
        price: '$650',
        duration: '7 Days',
        features: ['Executive Coaster Transport', 'Shangrila Resort Visit', 'Cold Desert Safari & Bonfire', 'Deosai Plains 4x4 Excursion']
      },
      {
        name: 'Hunza Valley VIP Executive',
        price: '$800',
        duration: '6 Days',
        features: ['Private 4x4 Prado Transport', 'Luxus Hunza / Serena Stay', 'Attabad Lake Cruise', 'Baltit & Altit Fort Tours']
      }
    ],
    ctaText: 'Plan Local Trip'
  },
  {
    id: '6',
    title: 'International Tours & Sightseeing',
    description: 'Handcrafted holiday packages for families, couples, and corporate groups across Asia, Europe & the Middle East.',
    iconName: 'Globe',
    link: '/services/international-tours',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop',
    longDescription: 'Discover the world with our curated international holiday packages. From the futuristic skyline of Dubai and Singapore to the tropical paradises of Bali, Thailand, and Vietnam, we orchestrate every detail seamlessly.',
    benefits: [
      'Turnkey Custom Itineraries with Zero Hassle',
      'Private Airport Pickups & Intercity Transfers',
      'Pre-booked Fast-Track Attraction Tickets',
      'Certified English-Speaking Tour Guides',
      'Halal Food Guidance & Family Friendly Options'
    ],
    packages: [
      {
        name: 'Dubai Luxury Getaway',
        price: '$800',
        duration: '5 Days',
        features: ['4-Star Downtown Hotel', 'VIP Desert Safari with BBQ', 'Marina Dhow Cruise Dinner', 'Burj Khalifa 124th Floor Ticket']
      },
      {
        name: 'Malaysia & Singapore Twin City',
        price: '$1,500',
        duration: '7 Days',
        features: ['Connecting Flights & Visa', 'Sentosa Island Cable Car', 'Genting Highlands Day Trip', 'Marina Bay Sands Sightseeing']
      },
      {
        name: 'Amazing Thailand Escape',
        price: '$900',
        duration: '6 Days',
        features: ['Bangkok & Phuket 4-Star Stays', 'Phi Phi Islands Speedboat Tour', 'Coral Island Buffet Lunch', 'Private Airport Transfers']
      }
    ],
    ctaText: 'Explore World'
  },
  {
    id: '7',
    title: 'Travel Insurance',
    description: 'Comprehensive global insurance coverage for medical emergencies, delays, and visa requirements.',
    iconName: 'ShieldCheck',
    link: '/services/insurance',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1200&auto=format&fit=crop',
    longDescription: 'Travel with absolute confidence. Our international travel insurance plans provide emergency hospitalization cover, flight delay compensations, lost baggage reimbursement, and meet all mandatory Schengen visa criteria.',
    benefits: [
      'Up to €50,000 / $100,000 Medical Cover',
      'Mandatory Schengen & UK Visa Compliance',
      'Emergency Medical Evacuation & Repatriation',
      'Baggage Loss & Flight Cancellation Claims',
      'Instant Digital Policy Delivery'
    ],
    packages: [
      {
        name: 'Basic Schengen Compliant',
        price: '$30',
        duration: 'Up to 30 Days',
        features: ['€30,000 Medical Emergency Coverage', 'Approved for All European Embassies', 'Repatriation of Remains', 'Instant PDF Policy Delivery']
      },
      {
        name: 'Worldwide Platinum Protection',
        price: '$80',
        duration: 'Up to 60 Days',
        features: ['$100,000 Global Medical Cover', 'Trip Cancellation Protection', 'Lost Passport & Baggage Delay', '24/7 International Helpline']
      }
    ],
    ctaText: 'Get Insured'
  },
];

export const FEATURED_DESTINATIONS: Destination[] = [
  {
    id: 'naran',
    name: 'Naran & Kaghan Valley',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800&auto=format&fit=crop',
    price: '$545',
    duration: '5 Days',
    activities: 10,
    places: 12,
    rating: 4.8,
    type: 'domestic'
  },
  {
    id: 'babusar',
    name: 'Babusar Top & Lulusar',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop',
    price: '$450',
    duration: '4 Days',
    activities: 5,
    places: 8,
    rating: 4.7,
    type: 'domestic'
  },
  {
    id: 'skardu',
    name: 'Skardu & Deosai Plains',
    image: 'https://images.unsplash.com/photo-1586348943529-beaae6c28db9?q=80&w=800&auto=format&fit=crop',
    price: '$650',
    duration: '7 Days',
    activities: 8,
    places: 6,
    rating: 4.9,
    type: 'domestic'
  },
];

export const INTERNATIONAL_DESTINATIONS: Destination[] = [
  { id: 'uae', name: 'Dubai & Abu Dhabi (UAE)', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=800&auto=format&fit=crop', price: '$800', duration: '5 Days', activities: 20, places: 5, rating: 4.9, type: 'international' },
  { id: 'vietnam', name: 'Vietnam (Hanoi & Da Nang)', image: 'https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=800&auto=format&fit=crop', price: '$1200', duration: '10 Days', activities: 15, places: 4, rating: 4.7, type: 'international' },
  { id: 'singapore', name: 'Singapore City & Sentosa', image: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?q=80&w=800&auto=format&fit=crop', price: '$1500', duration: '5 Days', activities: 10, places: 5, rating: 4.8, type: 'international' },
  { id: 'malaysia', name: 'Kuala Lumpur & Langkawi', image: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?q=80&w=800&auto=format&fit=crop', price: '$950', duration: '6 Days', activities: 12, places: 3, rating: 4.6, type: 'international' },
  { id: 'thailand', name: 'Bangkok & Phuket (Thailand)', image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?q=80&w=800&auto=format&fit=crop', price: '$900', duration: '7 Days', activities: 14, places: 6, rating: 4.7, type: 'international' },
  { id: 'indonesia', name: 'Bali & Nusa Penida', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=800&auto=format&fit=crop', price: '$1100', duration: '8 Days', activities: 10, places: 4, rating: 4.8, type: 'international' },
  { id: 'egypt', name: 'Cairo & Nile Cruise (Egypt)', image: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?q=80&w=800&auto=format&fit=crop', price: '$1300', duration: '8 Days', activities: 12, places: 5, rating: 4.6, type: 'international' },
  { id: 'srilanka', name: 'Colombo & Kandy (Sri Lanka)', image: 'https://images.unsplash.com/photo-1546708973-b339540b5162?q=80&w=800&auto=format&fit=crop', price: '$850', duration: '6 Days', activities: 8, places: 4, rating: 4.5, type: 'international' },
  { id: 'china', name: 'Beijing & Shanghai (China)', image: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?q=80&w=800&auto=format&fit=crop', price: '$1600', duration: '12 Days', activities: 18, places: 8, rating: 4.7, type: 'international' },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Ahmad',
    role: 'Executive Umrah Pilgrim',
    comment: 'GNK Connect made our family Umrah trip seamless. The 5-star hotel in the Clock Tower and VIP transport exceeded all our expectations.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop'
  },
  {
    id: '2',
    name: 'John Smith',
    role: 'Corporate Traveler',
    comment: 'The Skardu Valley tour was flawlessly executed. Exceptional hotels, a knowledgeable guide, and luxury 4x4 transport throughout.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop'
  },
  {
    id: '3',
    name: 'Fatima Ali',
    role: 'Frequent Flyer',
    comment: 'My trusted agency for sticker visa processing and urgent ticketing. Their team is genuinely available 24/7 with immediate answers.',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop'
  }
];

export const LATEST_NEWS: NewsItem[] = [
  {
    id: '1',
    slug: 'top-10-destinations-northern-pakistan-2025',
    title: 'Top 10 Breathtaking Destinations in Northern Pakistan for 2025',
    excerpt: 'Discover high-altitude wonderlands from the cold deserts of Skardu to the turquoise waters of Attabad Lake and Fairy Meadows.',
    content: [
      'Northern Pakistan represents one of the world’s most pristine and dramatic alpine ecosystems. Home to three of the world’s greatest mountain ranges—the Himalayas, the Karakoram, and the Hindu Kush—it offers travelers unprecedented vistas, rich cultural hospitality, and luxury eco-resorts.',
      '1. Skardu Valley & Deosai Plains: Known as the Land of Giants, Deosai is the second highest plateau on Earth, carpeted with alpine wildflowers in summer. Skardu also features the Katpana Cold Desert and Shangrila Resort.',
      '2. Hunza Valley & Passu Cones: The legendary Karakoram Highway leads to Karimabad, Baltit Fort, and the jagged cathedral peaks of Passu Cones. Boating across the turquoise waters of Attabad Lake is an unforgettable highlight.',
      '3. Fairy Meadows & Nanga Parbat Base Camp: For adventure seekers, Fairy Meadows offers a direct panoramic amphitheater view of the colossal 8,126m Killer Mountain.',
      'At GNK Connect, our Northern Pakistan domestic expeditions provide late-model 4x4 Prado transport, experienced mountain drivers, and reservations in the region’s premier verified family hotels.'
    ],
    date: 'February 2025',
    author: 'GNK Travel Advisory',
    readTime: '5 min read',
    category: 'Tours',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800&auto=format&fit=crop',
    tags: ['Pakistan', 'Skardu', 'Hunza', 'Domestic Travel', 'Mountains']
  },
  {
    id: '2',
    slug: 'executive-umrah-complete-guide-preparation-packing',
    title: 'Essential Guide to Executive Umrah: Preparation, Visas & Packing',
    excerpt: 'A comprehensive walkthrough for pilgrims seeking comfort, proximity to Haram, private GMC transport, and structured spiritual guidance.',
    content: [
      'Performing Umrah is a transformative spiritual milestone. Preparing ahead for documentation, flight connections, and hotel selection ensures your entire focus remains dedicated to devotion and worship.',
      '1. Choosing the Right Package: Proximity to the Haram is critical, especially when traveling with elderly family members or young children. GNK Connect Executive VIP packages secure accommodations directly in the Clock Tower complex (steps from King Abdulaziz Gate).',
      '2. Private Ground Transfers: Navigating airport queues and intercity transfers between Jeddah, Makkah, and Madinah is seamless with private GMC Yukon / Suburban transfers and Haramain High-Speed train tickets.',
      '3. Packing Checklist: High-quality non-stitched Ihram (for men), comfortable prayer slippers for marble courtyards, unscented toiletries, portable power banks, and personal prescribed medications.',
      'Our dedicated scholar guides accompany pilgrims for historical Ziarat tours across Cave Hira, Jabal Thawr, Mount Arafat, Masjid Quba, and Mount Uhud.'
    ],
    date: 'January 2025',
    author: 'GNK Spiritual Desk',
    readTime: '7 min read',
    category: 'Umrah',
    image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=800&auto=format&fit=crop',
    tags: ['Umrah', 'Makkah', 'Madinah', 'Pilgrimage', 'Spiritual']
  },
  {
    id: '3',
    slug: 'updated-global-visa-guidelines-gcc-schengen-southeast-asia',
    title: 'Updated Global Visa Guidelines for GCC, Schengen and Southeast Asia',
    excerpt: 'Key policy updates on e-visas, sticker requirements, appointment booking, and financial documentation for tourists in 2025.',
    content: [
      'International travel documentation has evolved significantly with electronic portals, biometric tracking, and stricter financial verification rules across global embassies.',
      '1. UAE E-Visa Updates: Dubai and Abu Dhabi continue to offer streamlined 30 and 60-day e-visas with 3–4 working day turnaround. Ensure your passport has at least 6 months of validity and no spelling discrepancies.',
      '2. Schengen Visa Dossier Requirements: European embassies emphasize verified 6-month banking statements, tax returns (NTN/FBR), confirmed hotel vouchers, and mandatory €30,000 travel insurance.',
      '3. Southeast Asia E-Visas: Malaysia and Vietnam have transitioned almost entirely to paperless electronic visa portals. Thailand continues to offer single and multiple entry sticker visas via official embassy submission.',
      'GNK Connect’s certified visa specialists conduct pre-submission file audits and mock interview sessions to ensure the highest approval rates.'
    ],
    date: 'March 2025',
    author: 'GNK Visa Desk',
    readTime: '6 min read',
    category: 'Visas',
    image: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?q=80&w=800&auto=format&fit=crop',
    tags: ['Visas', 'Dubai', 'Schengen', 'Documentation', 'Passport']
  }
];

export const CONTACT_INFO = {
  phone: '0516137232',
  displayPhone: '+92 51 6137232',
  email: 'info@gnkconnect.com',
  address: 'Office #2, Mezzanine floor, Junaid plaza, Islamabad, Pakistan',
  officeHours: 'Mon–Sat: 9:00 AM – 6:00 PM',
};