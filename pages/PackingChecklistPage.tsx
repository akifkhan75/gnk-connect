import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  Printer, 
  RotateCcw, 
  Moon, 
  Map, 
  CheckCircle2
} from 'lucide-react';
import { BRAND_NAME } from '../constants';
import { useToast } from '../context/ToastContext';

interface ChecklistItem {
  id: string;
  category: 'religious' | 'documents' | 'clothing' | 'toiletries' | 'electronics' | 'medical';
  title: string;
  tip?: string;
  checked: boolean;
  isCustom?: boolean;
}

const DEFAULT_UMRAH_ITEMS: ChecklistItem[] = [
  // Religious & Ihram
  { id: 'u-1', category: 'religious', title: '2 Sets of White Ihram (Men)', tip: 'Seamless, pure cotton or microfiber towels', checked: false },
  { id: 'u-2', category: 'religious', title: 'Ihram Belt / Money Pouch', tip: 'Zippered waist pouch for passport and money', checked: false },
  { id: 'u-3', category: 'religious', title: 'Comfortable Slippers / Sandals', tip: 'Must leave ankle and top of foot exposed for Ihram', checked: false },
  { id: 'u-4', category: 'religious', title: 'Pocket Quran & Masnoon Dua Booklet', tip: 'For Tawaf and Sa’i supplications', checked: false },
  { id: 'u-5', category: 'religious', title: 'Digital Tasbeeh / Tawaf Counter', tip: 'Useful for tracking 7 rounds of Tawaf', checked: false },
  { id: 'u-6', category: 'religious', title: 'Prayer Mat (Travel Portable)', tip: 'Lightweight folding mat for Haram courtyards', checked: false },
  { id: 'u-7', category: 'religious', title: 'Small Scissors / Shaving Razor', tip: 'Pack in checked baggage only (for Tahallul hair trimming)', checked: false },

  // Documents & Currency
  { id: 'u-8', category: 'documents', title: 'Original Passport (6+ Months Validity)', tip: 'Keep 2 physical photocopies separate', checked: false },
  { id: 'u-9', category: 'documents', title: 'Printed Umrah E-Visa / Barcode', tip: 'Carry paper copies for Jeddah / Madinah immigration', checked: false },
  { id: 'u-10', category: 'documents', title: 'Confirmed Flight Tickets & Hotel Vouchers', tip: 'GNK Connect executive hotel confirmation vouchers', checked: false },
  { id: 'u-11', category: 'documents', title: 'Saudi Riyal (SAR) Cash & Multi-Currency Cards', tip: 'Carry 500-1000 SAR for initial transport and tips', checked: false },
  { id: 'u-12', category: 'documents', title: 'Emergency Contact Cards & GNK Desk Hotline', tip: 'Include hotel names in Makkah & Madinah', checked: false },

  // Toiletries (Unscented for Ihram)
  { id: 'u-13', category: 'toiletries', title: 'Unscented Soap & Shampoo', tip: 'Mandatory during Ihram state (no perfume/fragrance)', checked: false },
  { id: 'u-14', category: 'toiletries', title: 'Unscented Sunscreen & Lip Balm', tip: 'Protect against dry heat in Makkah', checked: false },
  { id: 'u-15', category: 'toiletries', title: 'Unscented Petroleum Jelly (Vaseline)', tip: 'Prevents inner thigh chafing during Tawaf & Sa’i', checked: false },
  { id: 'u-16', category: 'toiletries', title: 'Toothbrush & Miswak', tip: 'Traditional miswak is ideal for the Haram', checked: false },

  // Clothing & Daily Wear
  { id: 'u-17', category: 'clothing', title: '3-4 Sets of Modest Loose Clothes (Kurta/Shalwar/Abaya)', tip: 'Breathable cotton fabric for walking', checked: false },
  { id: 'u-18', category: 'clothing', title: 'Light Jacket or Shawl', tip: 'Madinah nights and air-conditioned buses can be cool', checked: false },
  { id: 'u-19', category: 'clothing', title: 'Extra Socks with Grip', tip: 'Marble Haram courtyards can be cold or slippery', checked: false },
  { id: 'u-20', category: 'clothing', title: 'Shoe Bag / Drawstring Pouch', tip: 'To carry shoes inside the Haram during prayers', checked: false },

  // Electronics & Accessories
  { id: 'u-21', category: 'electronics', title: 'Heavy Duty Power Bank (10,000 - 20,000 mAh)', tip: 'Essential for long hours in Haram', checked: false },
  { id: 'u-22', category: 'electronics', title: 'Universal Saudi UK-Style 3-Pin Adapter', tip: 'Standard plug type used across Saudi hotels', checked: false },
  { id: 'u-23', category: 'electronics', title: 'Phone Charging Cables & Earphones', tip: 'For listening to Quran recitations and calls', checked: false },

  // Medical & Health
  { id: 'u-24', category: 'medical', title: 'Pain Relievers (Panadol / Paracetamol / Ibuprofen)', tip: 'For foot muscle soreness after Sa’i', checked: false },
  { id: 'u-25', category: 'medical', title: 'Throat Lozenges & Cough Syrup', tip: 'Air conditioning and dry air frequently cause dry cough', checked: false },
  { id: 'u-26', category: 'medical', title: 'Antihistamines / Allergy Medication', tip: 'For sudden dust sensitivity', checked: false },
  { id: 'u-27', category: 'medical', title: 'Blister Bandages & Antiseptic Cream', tip: 'For minor foot blisters after walking', checked: false },
  { id: 'u-28', category: 'medical', title: 'Personal Daily Prescriptions', tip: 'Carry doctor prescription letter for customs', checked: false },
];

const DEFAULT_NORTHERN_ITEMS: ChecklistItem[] = [
  { id: 'n-1', category: 'clothing', title: 'Thermal Base Layer (Innerwear Tops & Bottoms)', tip: 'Crucial for Skardu, Hunza & Deosai nights', checked: false },
  { id: 'n-2', category: 'clothing', title: 'Windproof & Waterproof Down Jacket', tip: 'For high altitude mountain passes and boat rides', checked: false },
  { id: 'n-3', category: 'clothing', title: 'Sturdy Waterproof Trekking / Hiking Boots', tip: 'Ankle support for rocky mountain trails', checked: false },
  { id: 'n-4', category: 'clothing', title: 'Woolen Beanie, Neck Gaiter & Gloves', tip: 'Protects from freezing mountain winds', checked: false },
  { id: 'n-5', category: 'electronics', title: 'High Capacity Power Bank & Spare Camera Batteries', tip: 'Cold weather drains phone batteries rapidly', checked: false },
  { id: 'n-6', category: 'documents', title: 'Original CNIC / Passport & Vehicle Documents', tip: 'Required at multiple security checkpoints on KKH', checked: false },
  { id: 'n-7', category: 'medical', title: 'Altitude Sickness Medication (Acetazolamide/Diamox)', tip: 'Consult your doctor before Deosai / Babusar Top visits', checked: false },
  { id: 'n-8', category: 'toiletries', title: 'High SPF 50+ Sunblock & UV Polarized Sunglasses', tip: 'UV radiation is intense at high altitudes', checked: false },
  { id: 'n-9', category: 'documents', title: 'Adequate Cash in PKR', tip: 'Remote northern areas have limited ATM connectivity', checked: false },
];

const STORAGE_KEY = 'gnk_travel_packing_kit_v1';

const PackingChecklistPage: React.FC = () => {
  const [tripType, setTripType] = useState<'umrah' | 'northern'>('umrah');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_UMRAH_ITEMS;
    } catch {
      return DEFAULT_UMRAH_ITEMS;
    }
  });

  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ChecklistItem['category']>('religious');
  const { showToast } = useToast();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Could not save checklist state', e);
    }
  }, [items]);

  const handleSwitchTripType = (type: 'umrah' | 'northern') => {
    setTripType(type);
    if (type === 'umrah') {
      setItems(DEFAULT_UMRAH_ITEMS);
      setNewItemCategory('religious');
    } else {
      setItems(DEFAULT_NORTHERN_ITEMS);
      setNewItemCategory('clothing');
    }
    showToast('Checklist Switched', `Loaded ${type === 'umrah' ? 'Umrah & Pilgrimage' : 'Northern Expedition'} packing kit.`, 'info');
  };

  const handleToggleCheck = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    const newItem: ChecklistItem = {
      id: `custom-${Date.now()}`,
      category: newItemCategory,
      title: newItemTitle.trim(),
      tip: 'Custom personal item',
      checked: false,
      isCustom: true,
    };

    setItems(prev => [newItem, ...prev]);
    setNewItemTitle('');
    showToast('Item Added', `"${newItem.title}" added to your checklist.`, 'success');
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleResetChecklist = () => {
    if (tripType === 'umrah') {
      setItems(DEFAULT_UMRAH_ITEMS);
    } else {
      setItems(DEFAULT_NORTHERN_ITEMS);
    }
    showToast('Checklist Reset', 'All checkboxes restored to uncompleted state.', 'info');
  };

  const handlePrint = () => {
    window.print();
  };

  const totalItems = items.length;
  const completedItems = items.filter(i => i.checked).length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const filteredItems = items.filter(item => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Hero Banner */}
      <div className="bg-navy-900 pt-32 pb-20 relative overflow-hidden print:hidden">
        <div className="container mx-auto px-4 md:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-3 border border-cyan-400/30">
            <CheckSquare size={14} /> Interactive Travel Checklist Kit
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold mb-4 text-white tracking-tight">
            Travel &amp; Umrah Packing Kit
          </h1>
          <p className="text-gray-300 text-sm sm:text-base max-w-2xl mx-auto font-light leading-relaxed mb-6">
            Ensure you never forget religious essentials, unscented toiletries, emergency travel prescriptions, or mountain gear with our customizable checklist.
          </p>

          {/* Trip Selector Buttons */}
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => handleSwitchTripType('umrah')}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
                tripType === 'umrah'
                  ? 'bg-cyan-500 text-navy-900 shadow-xl scale-105'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Moon size={16} />
              <span>Executive Umrah Checklist</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTripType('northern')}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
                tripType === 'northern'
                  ? 'bg-cyan-500 text-navy-900 shadow-xl scale-105'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Map size={16} />
              <span>Northern Pakistan Expedition</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 -mt-10 relative z-20 max-w-4xl">
        {/* Progress & Quick Stats Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100 mb-8 print:border-none print:shadow-none">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <span className="text-xs font-bold uppercase text-gray-400 tracking-wider block mb-1">
                {tripType === 'umrah' ? '🕋 Umrah Pilgrimage Preparation' : '🏔️ Mountain Expedition Kit'}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-navy-900">
                {completedItems} of {totalItems} Items Packed ({progressPercent}%)
              </h2>
            </div>

            <div className="flex gap-2 w-full sm:w-auto print:hidden">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-navy-900 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Printer size={14} />
                <span>Print PDF Checklist</span>
              </button>
              <button
                type="button"
                onClick={handleResetChecklist}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:text-red-600 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                progressPercent === 100
                  ? 'bg-green-500'
                  : progressPercent > 50
                  ? 'bg-cyan-500'
                  : 'bg-navy-900'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {progressPercent === 100 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-xs text-green-800 font-bold">
              <CheckCircle2 size={16} className="text-green-600 shrink-0" />
              <span>All items packed! You are completely prepared for your journey with {BRAND_NAME}.</span>
            </div>
          )}
        </div>

        {/* Add Custom Item Box */}
        <form onSubmit={handleAddItem} className="bg-white rounded-3xl p-4 sm:p-6 shadow-md border border-gray-100 mb-8 flex flex-col sm:flex-row gap-3 print:hidden">
          <input
            type="text"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            placeholder="Add a custom item (e.g. Extra spectacles, specific prescription)..."
            aria-label="Add custom packing item"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-navy-900 outline-none focus:ring-2 focus:ring-cyan-500"
          />

          <select
            value={newItemCategory}
            onChange={(e) => setNewItemCategory(e.target.value as any)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-navy-900 outline-none"
          >
            <option value="religious">Religious / Sacred</option>
            <option value="documents">Documents &amp; Cash</option>
            <option value="clothing">Clothing &amp; Footwear</option>
            <option value="toiletries">Toiletries &amp; Hygiene</option>
            <option value="electronics">Electronics &amp; Power</option>
            <option value="medical">Medical &amp; First Aid</option>
          </select>

          <button
            type="submit"
            className="bg-navy-900 hover:bg-cyan-500 hover:text-navy-900 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus size={15} />
            <span>Add Item</span>
          </button>
        </form>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-6 print:hidden">
          {[
            { id: 'all', label: `All Items (${items.length})` },
            { id: 'religious', label: 'Sacred & Ihram' },
            { id: 'documents', label: 'Documents & Money' },
            { id: 'clothing', label: 'Clothing' },
            { id: 'toiletries', label: 'Toiletries' },
            { id: 'electronics', label: 'Electronics' },
            { id: 'medical', label: 'Medical' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeCategory === cat.id
                  ? 'bg-cyan-500 text-navy-900 shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Checklist Items List */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100 space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleToggleCheck(item.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                item.checked
                  ? 'bg-green-50/60 border-green-200'
                  : 'bg-gray-50/60 border-gray-150 hover:bg-gray-100/70'
              }`}
            >
              <div className="flex items-start gap-3 flex-1">
                <div className={`mt-0.5 shrink-0 ${item.checked ? 'text-green-600' : 'text-gray-400'}`}>
                  {item.checked ? <CheckSquare size={20} className="fill-green-100" /> : <Square size={20} />}
                </div>
                <div>
                  <h4 className={`text-xs sm:text-sm font-bold ${item.checked ? 'line-through text-gray-400' : 'text-navy-900'}`}>
                    {item.title}
                  </h4>
                  {item.tip && (
                    <p className={`text-[11px] mt-0.5 ${item.checked ? 'text-gray-400' : 'text-gray-500'}`}>
                      💡 {item.tip}
                    </p>
                  )}
                </div>
              </div>

              {item.isCustom && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteItem(item.id);
                  }}
                  className="text-gray-400 hover:text-red-500 p-1 transition-colors print:hidden"
                  aria-label={`Delete ${item.title}`}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PackingChecklistPage;
