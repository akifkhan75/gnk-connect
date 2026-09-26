import React, { useState } from 'react';
import { Plane, Hotel, Moon, Map, Search, Calendar, Users, ArrowRightLeft } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import InquiryModal from './InquiryModal';

type SearchTab = 'flights' | 'hotels' | 'umrah' | 'tours';

const FlightHotelSearch: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SearchTab>('umrah');
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [inquiryTitle, setInquiryTitle] = useState('');
  const [inquiryNotes, setCustomNotes] = useState('');

  // Flights state
  const [flightOrigin, setFlightOrigin] = useState('Islamabad (ISB)');
  const [flightDest, setFlightDest] = useState('Jeddah (JED)');
  const [flightType, setFlightType] = useState<'round' | 'oneway'>('round');
  const [flightClass, setFlightClass] = useState('Economy');
  const [flightDate, setFlightDate] = useState('');
  const [flightPassengers, setFlightPassengers] = useState('1');

  // Hotels state
  const [hotelCity, setHotelCity] = useState('Makkah (Clock Tower Area)');
  const [hotelTier, setHotelTier] = useState('5-Star Luxury');
  const [hotelGuests, setHotelGuests] = useState('2');
  const [hotelRooms, setHotelRooms] = useState('1');

  // Umrah state
  const [umrahDuration, setUmrahDuration] = useState('15 Days (Executive)');
  const [umrahMonth, setUmrahMonth] = useState('Next 30 Days');
  const [umrahPilgrims, setUmrahPilgrims] = useState('2');
  const [umrahTransport, setUmrahTransport] = useState('Private GMC Suburban');

  // Tours state
  const [tourDestination, setTourDestination] = useState('Skardu & Deosai Plains');
  const [tourTravelers, setTourTravelers] = useState('2');
  const [tourSeason, setTourSeason] = useState('Spring / Summer 2025');

  const swapFlightAirports = () => {
    const temp = flightOrigin;
    setFlightOrigin(flightDest);
    setFlightDest(temp);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let title = '';
    let notes = '';

    if (activeTab === 'flights') {
      title = `Flight Booking: ${flightOrigin} -> ${flightDest} (${flightClass})`;
      notes = `Trip Type: ${flightType === 'round' ? 'Round Trip' : 'One Way'} | Passengers: ${flightPassengers} | Date: ${flightDate || 'Flexible'}`;
    } else if (activeTab === 'hotels') {
      title = `Hotel Reservation: ${hotelCity} (${hotelTier})`;
      notes = `Rooms: ${hotelRooms} | Guests: ${hotelGuests}`;
    } else if (activeTab === 'umrah') {
      title = `Umrah Custom Package: ${umrahDuration}`;
      notes = `Departure Window: ${umrahMonth} | Pilgrims: ${umrahPilgrims} | Ground Transport: ${umrahTransport}`;
    } else if (activeTab === 'tours') {
      title = `Expedition Tour: ${tourDestination}`;
      notes = `Travelers: ${tourTravelers} | Preferred Season: ${tourSeason}`;
    }

    setInquiryTitle(title);
    setCustomNotes(notes);
    setModalOpen(true);
    showToast(
      'Search Generated',
      'Lock in best negotiated rates by completing your contact info.',
      'info',
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-surface rounded-3xl shadow-[0_18px_40px_-24px_rgb(11_26_51/0.35)] border border-line overflow-hidden relative">
      {/* Tabs Header */}
      <div className="flex border-b border-line bg-canvas/80 overflow-x-auto no-scrollbar">
        {[
          { id: 'umrah', label: 'Executive Umrah', icon: Moon },
          { id: 'flights', label: 'Flight Booking', icon: Plane },
          { id: 'hotels', label: 'Luxury Hotels', icon: Hotel },
          { id: 'tours', label: 'Northern & Global Tours', icon: Map },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as SearchTab)}
              className={`flex-1 min-w-[150px] py-4 px-4 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                isActive
                  ? 'border-cyan-500 text-ink bg-surface shadow-sm'
                  : 'border-transparent text-ink-3 hover:text-ink hover:bg-surface-2/50'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-cyan-600' : 'text-gray-400'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSearchSubmit} className="p-6 sm:p-8">
        {/* UMRAH TAB */}
        {activeTab === 'umrah' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5">
                Package Tier / Duration
              </label>
              <select
                value={umrahDuration}
                onChange={(e) => setUmrahDuration(e.target.value)}
                className="w-full bg-canvas border border-line rounded-xl px-3.5 py-2.5 text-xs font-bold text-ink focus:ring-2 focus:ring-cyan-500 outline-none"
              >
                <option value="10 Days VIP Haram View">10 Days (5-Star VIP Haram View)</option>
                <option value="15 Days Executive">15 Days (Executive 5-Star)</option>
                <option value="21 Days Premium Group">21 Days (Premium Group 4-Star)</option>
                <option value="Custom Duration & Hotels">Custom Dates & Itinerary</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5">
                Target Departure Window
              </label>
              <select
                value={umrahMonth}
                onChange={(e) => setUmrahMonth(e.target.value)}
                className="w-full bg-canvas border border-line rounded-xl px-3.5 py-2.5 text-xs font-bold text-ink focus:ring-2 focus:ring-cyan-500 outline-none"
              >
                <option value="Immediate / Next 15 Days">Immediate (Next 15 Days)</option>
                <option value="Ramadan 2025 First Ashra">Ramadan 2025 (First 10 Days)</option>
                <option value="Ramadan 2025 Last Ashra">Ramadan 2025 (Last 10 Days)</option>
                <option value="Shaban / Shawwal 2025">Shaban / Shawwal Season</option>
                <option value="Flexible Dates">Flexible Dates</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5">
                Pilgrims Count
              </label>
              <div className="flex items-center bg-canvas border border-line rounded-xl px-3 py-2">
                <Users size={14} className="text-gray-400 mr-2" />
                <select
                  value={umrahPilgrims}
                  onChange={(e) => setUmrahPilgrims(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-ink outline-none"
                >
                  <option value="1 Individual">1 Person</option>
                  <option value="2 Couple / Sharing">2 Persons (Couple)</option>
                  <option value="3-4 Family">3-4 Persons (Family)</option>
                  <option value="5+ Group">5+ Persons (Private Group)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5">
                Ground Transport
              </label>
              <select
                value={umrahTransport}
                onChange={(e) => setUmrahTransport(e.target.value)}
                className="w-full bg-canvas border border-line rounded-xl px-3.5 py-2.5 text-xs font-bold text-ink focus:ring-2 focus:ring-cyan-500 outline-none"
              >
                <option value="Private GMC Suburban VIP">Private GMC Suburban VIP</option>
                <option value="Private Toyota Coaster">Private Toyota Coaster</option>
                <option value="Luxury Bus Transfer">Luxury AC Bus Transfer</option>
                <option value="Haramain High-Speed Train">Haramain Train + Sedan</option>
              </select>
            </div>
          </div>
        )}

        {/* FLIGHTS TAB */}
        {activeTab === 'flights' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-xs font-bold text-ink-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="flightType"
                  checked={flightType === 'round'}
                  onChange={() => setFlightType('round')}
                  className="accent-cyan-500"
                />
                <span>Round Trip</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="flightType"
                  checked={flightType === 'oneway'}
                  onChange={() => setFlightType('oneway')}
                  className="accent-cyan-500"
                />
                <span>One Way</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5">
                  Departure City
                </label>
                <input
                  type="text"
                  value={flightOrigin}
                  onChange={(e) => setFlightOrigin(e.target.value)}
                  className="w-full bg-canvas border border-line rounded-xl px-3.5 py-2.5 text-xs font-bold text-ink focus:ring-2 focus:ring-cyan-500 outline-none"
                  placeholder="e.g. Islamabad (ISB)"
                />
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={swapFlightAirports}
                  title="Swap Origin and Destination"
                  className="hidden lg:flex absolute -left-3 top-7 z-10 w-6 h-6 bg-brand text-white rounded-full items-center justify-center shadow-md hover:scale-110 transition-transform"
                >
                  <ArrowRightLeft size={10} />
                </button>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5">
                  Destination City
                </label>
                <input
                  type="text"
                  value={flightDest}
                  onChange={(e) => setFlightDest(e.target.value)}
                  className="w-full bg-canvas border border-line rounded-xl px-3.5 py-2.5 text-xs font-bold text-ink focus:ring-2 focus:ring-cyan-500 outline-none"
                  placeholder="e.g. Jeddah (JED)"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5">
                  Travel Date
                </label>
                <div className="flex items-center bg-canvas border border-line rounded-xl px-3 py-2">
                  <Calendar size={14} className="text-gray-400 mr-2 shrink-0" />
                  <input
                    type="date"
                    value={flightDate}
                    onChange={(e) => setFlightDate(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-ink outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5">
                  Class & Passengers
                </label>
                <select
                  value={`${flightClass} - ${flightPassengers} Pax`}
                  onChange={(e) => {
                    const [cls, pax] = e.target.value.split(' - ');
                    setFlightClass(cls);
                    setFlightPassengers(pax.replace(' Pax', ''));
                  }}
                  className="w-full bg-canvas border border-line rounded-xl px-3.5 py-2.5 text-xs font-bold text-ink focus:ring-2 focus:ring-cyan-500 outline-none"
                >
                  <option value="Economy - 1 Pax">Economy (1 Adult)</option>
                  <option value="Economy - 2 Pax">Economy (2 Adults)</option>
                  <option value="Economy - 4 Pax">Economy (Family 4)</option>
                  <option value="Business - 1 Pax">Business Class (1 Adult)</option>
                  <option value="Business - 2 Pax">Business Class (2 Adults)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* HOTELS TAB */}
        {activeTab === 'hotels' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5">
                Destination / Area
              </label>
              <select
                value={hotelCity}
                onChange={(e) => setHotelCity(e.target.value)}
                className="w-full bg-canvas border border-line rounded-xl px-3.5 py-2.5 text-xs font-bold text-ink focus:ring-2 focus:ring-cyan-500 outline-none"
              >
                <option value="Makkah (Clock Tower Area)">Makkah (Clock Tower Area)</option>
                <option value="Madinah (Markazia North)">Madinah (Markazia North)</option>
                <option value="Dubai (Downtown / Marina)">Dubai (Downtown / Marina)</option>
                <option value="Baku (Fountain Square)">Baku (Fountain Square)</option>
                <option value="Hunza (Karimabad / Attabad)">Hunza (Karimabad / Attabad)</option>
                <option value="Skardu (Shangrila / Serena)">Skardu (Shangrila / Serena)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5">
                Hotel Category
              </label>
              <select
                value={hotelTier}
                onChange={(e) => setHotelTier(e.target.value)}
                className="w-full bg-canvas border border-line rounded-xl px-3.5 py-2.5 text-xs font-bold text-ink focus:ring-2 focus:ring-cyan-500 outline-none"
              >
                <option value="5-Star Luxury Haram View">5-Star Luxury (Haram View)</option>
                <option value="5-Star Standard">5-Star Standard</option>
                <option value="4-Star Premium (Walking Distance)">
                  4-Star Premium (Walking Distance)
                </option>
                <option value="3-Star Budget Friendly">3-Star Budget Friendly</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5">
                Number of Guests
              </label>
              <div className="flex items-center bg-canvas border border-line rounded-xl px-3 py-2">
                <Users size={14} className="text-gray-400 mr-2" />
                <select
                  value={hotelGuests}
                  onChange={(e) => setHotelGuests(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-ink outline-none"
                >
                  <option value="1 Adult">1 Adult</option>
                  <option value="2 Adults (Couple)">2 Adults (Couple)</option>
                  <option value="2 Adults + 2 Children">2 Adults + 2 Children</option>
                  <option value="4+ Group">4+ Group Guests</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5">
                Rooms Required
              </label>
              <select
                value={hotelRooms}
                onChange={(e) => setHotelRooms(e.target.value)}
                className="w-full bg-canvas border border-line rounded-xl px-3.5 py-2.5 text-xs font-bold text-ink focus:ring-2 focus:ring-cyan-500 outline-none"
              >
                <option value="1 Room">1 Room</option>
                <option value="2 Rooms">2 Connected Rooms</option>
                <option value="3+ Rooms">3+ Multiple Rooms</option>
                <option value="Executive Suite">Executive Suite</option>
              </select>
            </div>
          </div>
        )}

        {/* TOURS TAB */}
        {activeTab === 'tours' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5">
                Tour Destination
              </label>
              <select
                value={tourDestination}
                onChange={(e) => setTourDestination(e.target.value)}
                className="w-full bg-canvas border border-line rounded-xl px-3.5 py-2.5 text-xs font-bold text-ink focus:ring-2 focus:ring-cyan-500 outline-none"
              >
                <option value="Skardu & Deosai Plains (7 Days)">
                  Skardu & Deosai Plains (7 Days)
                </option>
                <option value="Hunza & Khunjerab Pass (6 Days)">
                  Hunza & Khunjerab Pass (6 Days)
                </option>
                <option value="Swat Valley & Malam Jabba (4 Days)">
                  Swat Valley & Malam Jabba (4 Days)
                </option>
                <option value="Dubai City & Desert Safari (5 Days)">
                  Dubai & Desert Safari (5 Days)
                </option>
                <option value="Baku Azerbaijan Explorer (5 Days)">
                  Baku Azerbaijan Explorer (5 Days)
                </option>
                <option value="Turkey Historic Wonders (8 Days)">
                  Turkey Historic Wonders (8 Days)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5">
                Preferred Travel Month
              </label>
              <select
                value={tourSeason}
                onChange={(e) => setTourSeason(e.target.value)}
                className="w-full bg-canvas border border-line rounded-xl px-3.5 py-2.5 text-xs font-bold text-ink focus:ring-2 focus:ring-cyan-500 outline-none"
              >
                <option value="Spring (March - May)">Spring (March - May)</option>
                <option value="Summer (June - August)">Summer (June - August)</option>
                <option value="Autumn / Blossom (Sept - Nov)">Autumn (Sept - Nov)</option>
                <option value="Winter Ski / Snow Season">Winter Ski / Snow Season</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5">
                Travelers Count
              </label>
              <div className="flex items-center bg-canvas border border-line rounded-xl px-3 py-2">
                <Users size={14} className="text-gray-400 mr-2" />
                <select
                  value={tourTravelers}
                  onChange={(e) => setTourTravelers(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-ink outline-none"
                >
                  <option value="Solo Traveler">Solo Traveler</option>
                  <option value="Couple (2 Persons)">Couple (2 Persons)</option>
                  <option value="Family (3-5 Persons)">Family (3-5 Persons)</option>
                  <option value="Corporate / Private Group (6+)">Corporate Group (6+)</option>
                </select>
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-navy-900 hover:bg-brand hover:text-white text-white font-bold py-2.5 px-4 rounded-full text-sm transition-all shadow-lg flex items-center justify-center gap-2 h-[38px] dark:bg-white dark:text-navy-900"
              >
                <Search size={14} />
                <span>Search Best Rates</span>
              </button>
            </div>
          </div>
        )}

        {/* Global Submit for Umrah / Flights / Hotels */}
        {activeTab !== 'tours' && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-line gap-3">
            <p className="text-[11px] text-gray-400 text-center sm:text-left">
              ⚡ Instant price match guarantee &amp; IATA accredited ticketing desk
            </p>
            <button
              type="submit"
              className="w-full sm:w-auto bg-navy-900 hover:bg-brand hover:text-white text-white font-bold py-2.5 px-8 rounded-full text-sm transition-all shadow-lg flex items-center justify-center gap-2 shrink-0 dark:bg-white dark:text-navy-900"
            >
              <Search size={14} />
              <span>Get Instant Custom Quotation</span>
            </button>
          </div>
        )}
      </form>

      <InquiryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        packageName={inquiryTitle}
        initialNotes={inquiryNotes}
      />
    </div>
  );
};

export default FlightHotelSearch;
