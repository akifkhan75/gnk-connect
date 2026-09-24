export type ServiceIconType = 
  | 'Moon' 
  | 'FileCheck' 
  | 'Hotel' 
  | 'Plane' 
  | 'Map' 
  | 'ShieldCheck' 
  | 'Globe';

export interface ServicePackage {
  name: string;
  price: string;
  duration?: string;
  features: string[];
}

export interface ServiceProcessStep {
  title: string;
  desc: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  iconName: ServiceIconType;
  link: string;
  image?: string;
  longDescription?: string;
  benefits?: string[];
  processSteps?: ServiceProcessStep[];
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

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export interface BookingFormData {
  name: string;
  package: string;
  travelDate: string;
  adults: number;
  children: number;
  phone: string;
}

export interface VisaFormData {
  name: string;
  phone: string;
  passportFileName?: string;
  bankStatementFileName?: string;
}