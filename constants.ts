
import { Service, Destination, Testimonial, NewsItem } from './types';

export const NAV_LINKS = [
  { name: 'Home', path: '/' },
  { name: 'Services', path: '/services' },
  { name: 'Destinations', path: '/destinations' },
  { name: 'About Us', path: '/about' },
  { name: 'Contact', path: '/contact' },
  { name: 'News', path: '/news' },
];

export const SERVICES: Service[] = [
  {
    id: '1',
    title: 'Executive Umrah Packages',
    description: 'Comprehensive spiritual journeys with 5-star accommodation, transport, and guidance.',
    iconName: 'Moon',
    link: '/services/umrah',
    image: 'https://picsum.photos/1200/600?random=201',
    longDescription: 'Experience a spiritually uplifting journey with our Executive Umrah Packages. We prioritize your comfort and peace of mind, ensuring that every aspect of your pilgrimage is handled with the utmost care and professionalism. From luxury accommodation steps away from the Haram to VIP transport.',
    benefits: [
      '5-Star Hotel Accommodation (Walking distance to Haram)',
      'VIP Private Transport (Jeddah - Makkah - Madinah)',
      'Visa Processing & Travel Insurance Included',
      'Guided Ziarat Tours in Makkah & Madinah',
      '24/7 On-ground Support Staff',
      'Complimentary Ihram & Travel Kits'
    ],
    packages: [
      {
        name: 'Economy Package',
        price: '$950',
        duration: '15 Days',
        features: ['3-Star Hotels (500m)', 'Shared Transport', 'Visa Included', 'Direct Flights']
      },
      {
        name: 'Executive Package',
        price: '$1,800',
        duration: '10 Days',
        features: ['5-Star Hotels (Clock Tower)', 'Private GMC Transport', 'Visa & Insurance', 'Guided Tours']
      },
      {
        name: 'Premium Group',
        price: '$1,200',
        duration: '21 Days',
        features: ['4-Star Hotels (200m)', 'Luxury Bus Transport', 'Ziarat Included', 'Full Board Meals']
      }
    ],
    ctaText: 'Book Your Umrah'
  },
  {
    id: '2',
    title: 'Visit Visas',
    description: 'Hassle-free sticker visa processing for major destinations globally.',
    iconName: 'FileCheck',
    link: '/services/visas',
    image: 'https://picsum.photos/1200/600?random=202',
    longDescription: 'Navigate the complex world of international travel documentation with ease. Our dedicated visa consultants provide end-to-end assistance for visit visas, specifically specializing in sticker visas for countries with strict requirements.',
    benefits: [
      'Expert Document Assessment',
      'Appointment Scheduling Assistance',
      'Cover Letter & Itinerary Drafting',
      'Interview Preparation Mock Sessions',
      'High Success Rate'
    ],
    processSteps: [
      { title: 'Consultation', desc: 'We assess your profile and travel history to recommend the best approach.' },
      { title: 'Documentation', desc: 'Collection and verification of all required financial and personal documents.' },
      { title: 'Submission', desc: 'Filing the application with the respective embassy or visa center.' },
      { title: 'Collection', desc: 'Passport collection and delivery to your doorstep upon approval.' }
    ],
    packages: [
        {
            name: 'Dubai (UAE) Visa',
            price: '$150',
            duration: '30 Days',
            features: ['E-Visa', 'Insurance Included', '3-4 Working Days', 'Single Entry']
        },
        {
            name: 'Thailand Sticker Visa',
            price: '$80',
            duration: '60 Days',
            features: ['Sticker Visa', 'Documents Review', 'Appointment Booking', 'Single Entry']
        },
        {
            name: 'Schengen Consultation',
            price: '$200',
            features: ['Complete File Preparation', 'Interview Mock', 'Itinerary Planning', 'Hotel Reservations']
        }
    ],
    ctaText: 'Apply For Visa'
  },
  {
    id: '3',
    title: 'Hotel Bookings',
    description: 'Best rates for domestic and international hotels, from luxury to budget.',
    iconName: 'Hotel',
    link: '/services/hotels',
    image: 'https://picsum.photos/1200/600?random=203',
    longDescription: 'Whether you need a cozy guesthouse in Naran or a luxury suite in Dubai, we have direct partnerships with thousands of properties worldwide to get you the best rates unavailable to the general public.',
    benefits: [
      'Exclusive Corporate Rates',
      'Free Cancellation Options',
      'Breakfast & Meal Plan Inclusions',
      'Group Booking Discounts',
      '24/7 Check-in Support'
    ],
    ctaText: 'Find A Hotel'
  },
  {
    id: '4',
    title: 'Airline Tickets',
    description: 'Domestic & International flight bookings with competitive pricing.',
    iconName: 'Plane',
    link: '/services/tickets',
    image: 'https://picsum.photos/1200/600?random=204',
    longDescription: 'Fly to any corner of the world with ExperienceTravel. We offer ticketing services for all major domestic and international airlines. Our team finds the best connections and prices for your schedule.',
    benefits: [
      'Competitive Market Fares',
      'Seat Selection Assistance',
      'Meal Preference Management',
      'Date Change & Refund Assistance',
      'Emergency Booking Services'
    ],
    ctaText: 'Book Flight'
  },
  {
    id: '5',
    title: 'Domestic Tours',
    description: 'Explore the breathtaking landscapes of Northern Pakistan.',
    iconName: 'Map',
    link: '/services/domestic-tours',
    image: 'https://picsum.photos/1200/600?random=205',
    longDescription: 'Pakistan is home to some of the world’s most beautiful landscapes. Our domestic tours take you to the heart of the north, from the lakes of Naran to the cold deserts of Skardu and the fairy meadows of Gilgit-Baltistan.',
    benefits: [
      'Luxury Pradox/Land Cruiser Transport',
      'Experienced Local Drivers & Guides',
      'Verified Family Hotels',
      'Bonfire & BBQ Nights',
      'Jeep Safari Arrangements'
    ],
    packages: [
        {
            name: 'Naran & Babusar (Couple)',
            price: '$545',
            duration: '5 Days',
            features: ['Private Corolla Car', 'Standard Hotels', 'Breakfast', 'Jeep to Saiful Malook']
        },
        {
            name: 'Skardu Adventure (Group)',
            price: '$650',
            duration: '7 Days',
            features: ['Luxury Coaster', 'Bonfire Night', 'Shangrila Resort', 'Deosai Jeep Safari']
        },
        {
            name: 'Hunza Valley Executive',
            price: '$800',
            duration: '6 Days',
            features: ['Prado Transport', 'Luxus Hunza Stay', 'Attabad Lake Boating', 'Cultural Dinner']
        }
    ],
    ctaText: 'Plan Local Trip'
  },
  {
    id: '6',
    title: 'Intl Tours & Sightseeing',
    description: 'Curated holiday packages for families, couples, and solo travelers.',
    iconName: 'Globe',
    link: '/services/international-tours',
    image: 'https://picsum.photos/1200/600?random=206',
    longDescription: 'Discover the world with our curated international tour packages. Popular destinations include Vietnam, Singapore, Malaysia, Thailand, UAE, and more. We handle the logistics so you can enjoy the sights.',
    benefits: [
      'Complete Itinerary Planning',
      'Airport Transfers',
      'City Tours & Attraction Tickets',
      'Halal Food Options (where available)',
      'English Speaking Guides'
    ],
    packages: [
        {
            name: 'Best of Dubai',
            price: '$800',
            duration: '5 Days',
            features: ['3-Star Hotel', 'Desert Safari', 'Dhow Cruise Dinner', 'City Tour']
        },
        {
            name: 'Malaysia & Singapore',
            price: '$1,500',
            duration: '7 Days',
            features: ['Flights Included', 'Sentosa Island', 'Genting Highlands', 'Visa Processing']
        },
        {
            name: 'Amazing Thailand',
            price: '$900',
            duration: '6 Days',
            features: ['Phuket & Bangkok', 'Island Hopping', 'Coral Island Lunch', '4-Star Hotels']
        }
    ],
    ctaText: 'Explore World'
  },
  {
    id: '7',
    title: 'Travel Insurance',
    description: 'Comprehensive coverage for peace of mind during your travels.',
    iconName: 'ShieldCheck',
    link: '/services/insurance',
    image: 'https://picsum.photos/1200/600?random=207',
    longDescription: 'Travel with confidence knowing you are protected against the unexpected. Our travel insurance plans cover medical emergencies, flight cancellations, lost luggage, and more.',
    benefits: [
      'Medical Expense Coverage',
      'Emergency Evacuation',
      'Trip Cancellation/Interruption',
      'Baggage Delay/Loss',
      'Mandatory for Schengen Visas'
    ],
    packages: [
        {
            name: 'Basic Schengen',
            price: '$30',
            features: ['30,000 Euro Coverage', 'Medical Emergency', 'Repatriation', 'Approved for Visa']
        },
        {
            name: 'Worldwide Premium',
            price: '$80',
            features: ['100,000 USD Coverage', 'Flight Delay', 'Baggage Loss', 'COVID-19 Cover']
        }
    ],
    ctaText: 'Get Insured'
  },
];

export const FEATURED_DESTINATIONS: Destination[] = [
  {
    id: 'naran',
    name: 'Naran & Kaghan',
    image: 'https://picsum.photos/800/600?random=1',
    price: '$545',
    duration: '1 Week',
    activities: 10,
    places: 12,
    rating: 4.8,
    type: 'domestic'
  },
  {
    id: 'babusar',
    name: 'Babusar Top',
    image: 'https://picsum.photos/800/600?random=101',
    price: '$450',
    duration: '4 Days',
    activities: 5,
    places: 8,
    rating: 4.7,
    type: 'domestic'
  },
  {
    id: 'skardu',
    name: 'Skardu Valley',
    image: 'https://picsum.photos/800/600?random=2',
    price: '$650',
    duration: '5 Days',
    activities: 8,
    places: 6,
    rating: 4.9,
    type: 'domestic'
  },
];

export const INTERNATIONAL_DESTINATIONS: Destination[] = [
  { id: 'vietnam', name: 'Vietnam', image: 'https://picsum.photos/800/600?random=3', price: '$1200', duration: '10 Days', activities: 15, places: 4, rating: 4.7, type: 'international' },
  { id: 'singapore', name: 'Singapore', image: 'https://picsum.photos/800/600?random=4', price: '$1500', duration: '5 Days', activities: 10, places: 5, rating: 4.8, type: 'international' },
  { id: 'malaysia', name: 'Malaysia', image: 'https://picsum.photos/800/600?random=5', price: '$950', duration: '6 Days', activities: 12, places: 3, rating: 4.6, type: 'international' },
  { id: 'uae', name: 'UAE (Dubai)', image: 'https://picsum.photos/800/600?random=6', price: '$800', duration: '5 Days', activities: 20, places: 5, rating: 4.9, type: 'international' },
  { id: 'thailand', name: 'Thailand', image: 'https://picsum.photos/800/600?random=7', price: '$900', duration: '7 Days', activities: 14, places: 6, rating: 4.7, type: 'international' },
  { id: 'indonesia', name: 'Indonesia', image: 'https://picsum.photos/800/600?random=8', price: '$1100', duration: '8 Days', activities: 10, places: 4, rating: 4.8, type: 'international' },
  { id: 'egypt', name: 'Egypt', image: 'https://picsum.photos/800/600?random=9', price: '$1300', duration: '8 Days', activities: 12, places: 5, rating: 4.6, type: 'international' },
  { id: 'srilanka', name: 'Sri Lanka', image: 'https://picsum.photos/800/600?random=10', price: '$850', duration: '6 Days', activities: 8, places: 4, rating: 4.5, type: 'international' },
  { id: 'china', name: 'China', image: 'https://picsum.photos/800/600?random=11', price: '$1600', duration: '12 Days', activities: 18, places: 8, rating: 4.7, type: 'international' },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Ahmad',
    role: 'Family Traveler',
    comment: 'ExperienceTravel made our Umrah trip absolutely seamless. The executive package was worth every penny.',
    avatar: 'https://picsum.photos/100/100?random=12'
  },
  {
    id: '2',
    name: 'John Smith',
    role: 'Adventure Seeker',
    comment: 'The Skardu tour was organized perfectly. Great hotels, experienced guide, and unforgettable memories.',
    avatar: 'https://picsum.photos/100/100?random=13'
  },
  {
    id: '3',
    name: 'Fatima Ali',
    role: 'Business Traveler',
    comment: 'My go-to for visa processing and urgent ticketing. Their support team is truly 24/7.',
    avatar: 'https://picsum.photos/100/100?random=14'
  }
];

export const LATEST_NEWS: NewsItem[] = [
  {
    id: '1',
    title: 'Top 10 Places to Visit in Northern Pakistan',
    excerpt: 'Discover the hidden gems of the north, from fairy meadows to the cold deserts of Skardu.',
    date: 'June 6, 2016',
    author: 'John Smith',
    image: 'https://picsum.photos/800/600?random=15'
  },
  {
    id: '2',
    title: 'A Guide to Umrah: Preparation and Tips',
    excerpt: 'Everything you need to know before embarking on your spiritual journey to the holy land.',
    date: 'May 20, 2016',
    author: 'Admin',
    image: 'https://picsum.photos/800/600?random=16'
  },
  {
    id: '3',
    title: 'Visa Policies Updated for Southeast Asia',
    excerpt: 'New visa-on-arrival policies for Pakistani tourists in Malaysia and Thailand.',
    date: 'April 15, 2016',
    author: 'Sarah Khan',
    image: 'https://picsum.photos/800/600?random=17'
  }
];

export const CONTACT_INFO = {
  phone: '0516137232',
  email: 'info@explorexperiencetravels.com',
  address: 'Office #2, Mezzanine floor, Junaid plaza, Islamabad',
};