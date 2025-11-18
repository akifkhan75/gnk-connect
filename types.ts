
export interface ServicePackage {
  name: string;
  price: string;
  duration?: string;
  features: string[];
}

export interface Service {
  id: string;
  title: string;
  description: string;
  iconName: string;
  link: string;
  // Detailed Page Content
  image?: string;
  longDescription?: string;
  benefits?: string[];
  processSteps?: { title: string; desc: string }[];
  ctaText?: string;
  packages?: ServicePackage[];
}

export interface Destination {
  id: string;
  name: string;
  image: string;
  price: string;
  duration: string;
  activities: number;
  places: number;
  rating: number;
  type: 'domestic' | 'international';
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  comment: string;
  avatar: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  image: string;
}