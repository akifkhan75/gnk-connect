import React from 'react';
import { Check, X, Sparkles } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

interface PackageComparisonProps {
  onSelectPackage: (pkgName: string) => void;
}

export const PackageComparison: React.FC<PackageComparisonProps> = ({ onSelectPackage }) => {
  const { formatPrice } = useCurrency();

  const features = [
    { name: 'Hotel Proximity in Makkah', economy: '350m to Courtyard', executive: 'Direct Clock Tower (Haram View)', group: '150m from Gate' },
    { name: 'Hotel Category', economy: '3-Star Standard', executive: '5-Star Luxury VIP', group: '4-Star Premium' },
    { name: 'Ground Transportation', economy: 'Shared AC Coach', executive: 'Private VIP GMC Suburban', group: 'Luxury Executive Bus' },
    { name: 'Umrah E-Visa & Insurance', economy: true, executive: true, group: true },
    { name: 'Sacred Makkah & Madinah Ziarat', economy: 'Standard Group Tour', executive: 'Private Scholar Guided Tour', group: 'Comprehensive Group' },
    { name: 'Meal Plan Inclusions', economy: 'Breakfast Only', executive: 'Full Board Buffet', group: 'Half Board' },
    { name: 'Complimentary Ihram & Kits', economy: false, executive: true, group: true },
    { name: '24/7 On-Ground Concierge', economy: true, executive: true, group: true },
  ];

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-xl overflow-hidden">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-bold uppercase tracking-wider mb-2 border border-cyan-200">
          <Sparkles size={14} /> Side-by-Side Comparison
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight">
          Compare Executive Umrah Packages
        </h3>
        <p className="text-gray-600 text-xs sm:text-sm mt-1">
          Review key distinctions in hotel proximity, private GMC transfers, and scholar guidance across our pilgrimage tiers.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[650px]">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">
                Package Feature
              </th>
              <th className="py-4 px-4 text-center">
                <span className="block font-bold text-navy-900 text-base">Economy Package</span>
                <span className="text-xs font-extrabold text-cyan-600">{formatPrice(950)}</span>
                <span className="text-[10px] text-gray-400 block">15 Days</span>
              </th>
              <th className="py-4 px-4 text-center bg-cyan-50/70 rounded-t-2xl border-t-2 border-x-2 border-cyan-400">
                <span className="inline-block px-2 py-0.5 rounded-full bg-cyan-500 text-navy-900 text-[10px] font-extrabold uppercase mb-1">
                  Most Popular
                </span>
                <span className="block font-bold text-navy-900 text-base">Executive VIP</span>
                <span className="text-xs font-extrabold text-cyan-700">{formatPrice(1800)}</span>
                <span className="text-[10px] text-gray-500 block">10 Days</span>
              </th>
              <th className="py-4 px-4 text-center">
                <span className="block font-bold text-navy-900 text-base">Premium Group</span>
                <span className="text-xs font-extrabold text-cyan-600">{formatPrice(1200)}</span>
                <span className="text-[10px] text-gray-400 block">21 Days</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
            {features.map((f, idx) => (
              <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-gray-800">
                  {f.name}
                </td>
                
                {/* Economy */}
                <td className="py-3.5 px-4 text-center text-gray-600">
                  {typeof f.economy === 'boolean' ? (
                    f.economy ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-gray-300 mx-auto" />
                  ) : (
                    f.economy
                  )}
                </td>

                {/* Executive VIP */}
                <td className="py-3.5 px-4 text-center font-bold text-navy-900 bg-cyan-50/40 border-x-2 border-cyan-400">
                  {typeof f.executive === 'boolean' ? (
                    f.executive ? <Check className="w-5 h-5 text-cyan-600 mx-auto" /> : <X className="w-5 h-5 text-gray-300 mx-auto" />
                  ) : (
                    <span className="text-cyan-900">{f.executive}</span>
                  )}
                </td>

                {/* Premium Group */}
                <td className="py-3.5 px-4 text-center text-gray-600">
                  {typeof f.group === 'boolean' ? (
                    f.group ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-gray-300 mx-auto" />
                  ) : (
                    f.group
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td className="py-4 px-4"></td>
              <td className="py-4 px-4 text-center">
                <button
                  type="button"
                  onClick={() => onSelectPackage('Economy Package ($950)')}
                  className="w-full py-2 px-3 rounded-xl border border-navy-900 text-navy-900 text-xs font-bold hover:bg-navy-900 hover:text-white transition-all"
                >
                  Choose Economy
                </button>
              </td>
              <td className="py-4 px-4 text-center bg-cyan-50/70 rounded-b-2xl border-b-2 border-x-2 border-cyan-400">
                <button
                  type="button"
                  onClick={() => onSelectPackage('Executive VIP Package ($1,800)')}
                  className="w-full py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-navy-900 text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
                >
                  Book Executive VIP
                </button>
              </td>
              <td className="py-4 px-4 text-center">
                <button
                  type="button"
                  onClick={() => onSelectPackage('Premium Group Package ($1,200)')}
                  className="w-full py-2 px-3 rounded-xl border border-navy-900 text-navy-900 text-xs font-bold hover:bg-navy-900 hover:text-white transition-all"
                >
                  Choose Premium Group
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default PackageComparison;
