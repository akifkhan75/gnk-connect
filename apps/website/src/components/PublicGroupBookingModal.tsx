import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  MapPin, 
  Check, 
  Phone, 
  User, 
  MessageSquare, 
  Plane, 
  Hotel, 
  ShieldCheck, 
  Sparkles,
  Share2
} from 'lucide-react';
import { StandardGroupProduct } from '../types/b2b';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../context/ToastContext';

interface PublicGroupBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: StandardGroupProduct | null;
}

export const PublicGroupBookingModal: React.FC<PublicGroupBookingModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const { formatPrice, currency } = useCurrency();
  const { showToast } = useToast();

  const [selectedDepId, setSelectedDepId] = useState<string>('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionRef, setSubmissionRef] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'hotels' | 'agent_flyer'>('overview');

  // Agent Flyer White-Label customizer state
  const [agentAgencyName, setAgentAgencyName] = useState('Your Travel Agency');
  const [agentPhone, setAgentPhone] = useState('+92 300 1234567');
  const [agentCustomMarkupPKR, setAgentCustomMarkupPKR] = useState(15000);

  if (!isOpen || !product) return null;

  const currentDep = product.departures.find(d => d.id === selectedDepId) || product.departures[0];
  const retailBasePKR = currentDep ? currentDep.supplierNetPricePKR + 15000 : 200000;
  const totalCostPKR = (retailBasePKR * adults) + (retailBasePKR * 0.8 * children);

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) {
      alert('Please provide your name and phone number');
      return;
    }

    const ref = `INQ-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    setSubmissionRef(ref);
    setIsSubmitted(true);
    showToast('Inquiry Received', `Your inquiry reference ${ref} has been received. Our senior travel consultant will contact you via WhatsApp shortly.`, 'success');
  };

  const handleWhatsAppBooking = () => {
    const text = `*New Group Tour Booking Request - GNK Connect*
Tour: ${product.title}
Departure Date: ${currentDep?.departureDate} (${product.durationDays} Days)
Passengers: ${adults} Adults${children > 0 ? `, ${children} Children` : ''}
Lead Name: ${fullName || 'Interested Traveler'}
Phone: ${phone || 'Pending'}
City: ${city || 'Pakistan'}
Notes: ${specialNotes || 'None'}
Estimated Total: PKR ${totalCostPKR.toLocaleString()}`;

    window.open(`https://wa.me/923000000000?text=${encodeURIComponent(text)}`, '_blank');
  };

  const resetAndClose = () => {
    setIsSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="relative h-48 sm:h-56 overflow-hidden shrink-0">
          <img
            src={product.heroImage}
            alt={product.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

          {/* Close button */}
          <button
            onClick={resetAndClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/70 text-slate-300 hover:text-white hover:bg-slate-900 transition-all border border-slate-700"
          >
            <X size={18} />
          </button>

          <div className="absolute bottom-4 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-[10px] font-black uppercase tracking-wider mb-1.5">
                <Sparkles size={11} /> Guaranteed AirDesk Group Departure
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">{product.title}</h2>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                <MapPin size={13} className="text-cyan-400" /> {product.destination} • {product.durationDays} Days / {product.durationNights} Nights
              </p>
            </div>

            <div className="bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-700/80 text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Starting From</span>
              <span className="text-lg font-black text-cyan-400">
                {formatPrice(retailBasePKR)}
              </span>
              <span className="text-[10px] text-slate-400 block">/ person</span>
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 bg-slate-950 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          {[
            { id: 'overview', label: 'Package Overview & Booking' },
            { id: 'itinerary', label: 'Detailed Itinerary' },
            { id: 'hotels', label: 'Hotels & Flights' },
            { id: 'agent_flyer', label: '💼 Agent White-Label Flyer' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`py-3 px-3 font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === t.id
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {isSubmitted ? (
            /* Success View */
            <div className="py-10 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <Check size={32} />
              </div>
              <h3 className="text-2xl font-black text-white">Booking Request Submitted!</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Thank you, <strong>{fullName}</strong>. Your inquiry for <strong>{product.title}</strong> has been logged under reference <span className="font-mono text-cyan-400 font-bold">{submissionRef}</span>.
              </p>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-slate-400">Departure:</span>
                  <strong className="text-white">{currentDep?.departureDate}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Travelers:</span>
                  <strong className="text-white">{adults + children} Pax</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Contact Phone:</span>
                  <strong className="text-cyan-400">{phone}</strong>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleWhatsAppBooking}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
                >
                  <MessageSquare size={14} /> Open in WhatsApp
                </button>
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl text-xs transition-all"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : activeTab === 'overview' ? (
            /* Overview & Reservation Form */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Product Details & Inclusions */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5">
                    Tour Overview
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {product.overview}
                  </p>
                </div>

                {/* Confirmed Inclusions */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    All-Inclusive Package Features
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {product.inclusions.map((inc, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <Check size={13} className="text-cyan-400 shrink-0 mt-0.5" />
                        <span className="text-slate-300 text-[11px]">{inc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upcoming Departures Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Select Departure Schedule
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {product.departures.map((d) => {
                      const isSelected = (selectedDepId || product.departures[0].id) === d.id;
                      return (
                        <div
                          key={d.id}
                          onClick={() => setSelectedDepId(d.id)}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                            isSelected
                              ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-md'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <Calendar size={13} className="text-cyan-400" />
                              {d.departureDate}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Return: {d.returnDate}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                              {d.availableSeats} Seats Left
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Traveler Details & Booking Form */}
              <div className="lg:col-span-5 bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-base font-black text-white">Reserve Group Seats</h3>
                  <p className="text-[11px] text-slate-400">
                    Lock your seats for departure on <strong className="text-cyan-400">{currentDep?.departureDate}</strong>
                  </p>
                </div>

                <form onSubmit={handleBookingSubmit} className="space-y-3.5 text-xs">
                  {/* Passenger Count Selection */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Adults (12+ yrs)</label>
                      <div className="flex items-center border border-slate-700 bg-slate-900 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setAdults(Math.max(1, adults - 1))}
                          className="px-3 py-2 text-slate-400 hover:text-white"
                        >
                          -
                        </button>
                        <span className="flex-1 text-center font-bold text-white">{adults}</span>
                        <button
                          type="button"
                          onClick={() => setAdults(Math.min(currentDep?.availableSeats || 10, adults + 1))}
                          className="px-3 py-2 text-slate-400 hover:text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Children (2-11 yrs)</label>
                      <div className="flex items-center border border-slate-700 bg-slate-900 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setChildren(Math.max(0, children - 1))}
                          className="px-3 py-2 text-slate-400 hover:text-white"
                        >
                          -
                        </button>
                        <span className="flex-1 text-center font-bold text-white">{children}</span>
                        <button
                          type="button"
                          onClick={() => setChildren(children + 1)}
                          className="px-3 py-2 text-slate-400 hover:text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Contact Fields */}
                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Lead Passenger Name *</label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Tariq Mansoor"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">WhatsApp / Phone *</label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="tel"
                          required
                          placeholder="e.g. +92 300 1234567"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">Email</label>
                        <input
                          type="email"
                          placeholder="name@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-300 block mb-1">City</label>
                        <input
                          type="text"
                          placeholder="e.g. Islamabad"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Special Requests / Notes</label>
                      <textarea
                        rows={2}
                        placeholder="Bed preferences, dietary requirements, visa assistance..."
                        value={specialNotes}
                        onChange={(e) => setSpecialNotes(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  {/* Price Estimate Meter */}
                  <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-1">
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>{adults} Adult(s) + {children} Child(ren)</span>
                      <span>{currency}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-white text-xs">Estimated Total:</span>
                      <span className="font-black text-cyan-400 text-base">
                        {formatPrice(totalCostPKR)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-3 rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20"
                    >
                      Submit Reservation Inquiry
                    </button>

                    <button
                      type="button"
                      onClick={handleWhatsAppBooking}
                      className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <MessageSquare size={13} /> Book via Direct WhatsApp
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : activeTab === 'itinerary' ? (
            /* Detailed Day-by-Day Itinerary */
            <div className="space-y-4 max-w-3xl mx-auto">
              <h3 className="text-base font-black text-white mb-2">Day-by-Day Tour Schedule</h3>
              <div className="space-y-3">
                {product.itinerary && product.itinerary.length > 0 ? (
                  product.itinerary.map((dayItem) => (
                    <div key={dayItem.day} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-400 font-black font-mono">
                          Day {dayItem.day}
                        </span>
                        <h4 className="font-bold text-white text-sm">{dayItem.title}</h4>
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed pl-2">{dayItem.description}</p>
                      {dayItem.meals && dayItem.meals.length > 0 && (
                        <div className="pl-2 pt-1 text-[11px] text-slate-400">
                          Meals included: <strong className="text-slate-200">{dayItem.meals.join(', ')}</strong>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  [
                    { day: 1, title: 'Arrival & VIP Airport Meet & Assist', desc: 'Arrival at destination airport. Private coach transfer to hotel, check-in, and evening at leisure.' },
                    { day: 2, title: 'Guided City Highlights & Cultural Excursions', desc: 'Comprehensive guided tour of major landmarks, historical sights, and traditional bazaars.' },
                    { day: 3, title: 'Signature Experience & Luxury Dinner Cruise', desc: 'Full-day sightseeing adventure followed by a luxury evening sunset dinner cruise.' },
                    { day: 4, title: 'Shopping, Free Exploration & Departure Transfer', desc: 'Free morning for shopping, followed by assisted transfer to international airport for return flight.' },
                  ].map((d) => (
                    <div key={d.day} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-400 font-black font-mono">
                          Day {d.day}
                        </span>
                        <h4 className="font-bold text-white">{d.title}</h4>
                      </div>
                      <p className="text-slate-400 text-[11px] pl-2">{d.desc}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : activeTab === 'hotels' ? (
            /* Hotels and Airlines */
            <div className="space-y-6 max-w-3xl mx-auto text-xs">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Hotel size={16} className="text-amber-400" /> Accommodation Standards
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  All our international group packages guarantee premium 4-Star or 5-Star partner hotels with daily buffet breakfasts, central city or Haram proximity, high-speed Wi-Fi, and 24-hour concierge services.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Standard Room</span>
                    <strong className="text-white">Deluxe Double / Twin Bedded</strong>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Meal Plan</span>
                    <strong className="text-emerald-400">Bed & International Breakfast</strong>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Plane size={16} className="text-cyan-400" /> Airline & Baggage Allocation
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  Direct international flights with premium carriers (Emirates, Saudia, PIA, Turkish Airlines, or FlyDubai). Standard 20kg–30kg check-in baggage + 7kg cabin carry-on included per passenger.
                </p>
              </div>
            </div>
          ) : (
            /* Agent White-Label Customizer */
            <div className="space-y-6 max-w-2xl mx-auto text-xs">
              <div className="bg-gradient-to-r from-slate-950 to-cyan-950/40 p-5 rounded-2xl border border-cyan-500/30 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <Sparkles size={16} /> B2B Agent Reseller Tool
                </div>
                <h3 className="text-base font-black text-white">Generate Client-Facing Quotation</h3>
                <p className="text-slate-300">
                  Customise this package with your own agency brand, add your reseller profit margin, and copy/share a branded proposal to your clients.
                </p>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Your Agency Name</label>
                    <input
                      type="text"
                      value={agentAgencyName}
                      onChange={(e) => setAgentAgencyName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Your Agency Contact Phone</label>
                    <input
                      type="text"
                      value={agentPhone}
                      onChange={(e) => setAgentPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    Your Reseller Margin per Person (PKR): +PKR {agentCustomMarkupPKR.toLocaleString()}
                  </label>
                  <input
                    type="range"
                    min="5000"
                    max="50000"
                    step="1000"
                    value={agentCustomMarkupPKR}
                    onChange={(e) => setAgentCustomMarkupPKR(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>

                {/* Live Client Preview */}
                <div className="bg-white text-slate-900 p-5 rounded-2xl mt-4 space-y-2 shadow-xl">
                  <div className="flex justify-between items-center border-b pb-2">
                    <div>
                      <h4 className="font-black text-sm uppercase text-blue-900">{agentAgencyName}</h4>
                      <p className="text-[10px] text-slate-500">Official Group Travel Proposal</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-700">{agentPhone}</span>
                  </div>

                  <h3 className="font-black text-base text-slate-900 pt-1">{product.title}</h3>
                  <p className="text-xs text-slate-600">{product.overview}</p>

                  <div className="pt-2 border-t flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Package Price (All-Inclusive):</span>
                      <strong className="text-base font-black text-emerald-700">
                        PKR {(retailBasePKR + agentCustomMarkupPKR).toLocaleString()} / person
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`*${agentAgencyName} Exclusive Offer*\n${product.title}\nDates: ${currentDep?.departureDate}\nPrice: PKR ${(retailBasePKR + agentCustomMarkupPKR).toLocaleString()}/person\nContact: ${agentPhone}`);
                        showToast('Copied to Clipboard', 'Client flyer text copied successfully!', 'success');
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1"
                    >
                      <Share2 size={12} /> Copy Flyer Text
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
