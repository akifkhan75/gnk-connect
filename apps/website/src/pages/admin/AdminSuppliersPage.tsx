import React, { useState, useEffect } from 'react';
import { airDeskAdapter } from '../../services/b2b/airdeskAdapter';
import { StandardGroupProduct } from '../../types/b2b';
import { 
  Radio, 
  RefreshCw, 
  CheckCircle2, 
  Zap, 
  Building, 
  Plane, 
  Moon 
} from 'lucide-react';

export const AdminSuppliersPage: React.FC = () => {
  const [groups, setGroups] = useState<StandardGroupProduct[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const load = async () => {
      const list = await airDeskAdapter.getProducts();
      setGroups(list);
    };
    load();
  }, []);

  const handleSyncNow = async () => {
    setSyncing(true);
    await new Promise(r => setTimeout(r, 600));
    const list = await airDeskAdapter.getProducts();
    setGroups(list);
    setLastSync(new Date().toLocaleTimeString());
    setSyncing(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Radio className="text-amber-400" size={24} />
            Supplier Adapters & Inventory Engine
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Unified adapter layer (`ISupplierAdapter`) keeps GNK Connect completely supplier-agnostic from day one
          </p>
        </div>

        <button
          onClick={handleSyncNow}
          disabled={syncing}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing AirDesk...' : 'Re-Sync AirDesk API'}
        </button>
      </div>

      {/* Primary Active Supplier: AirDesk */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-black">
              AD
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">AirDesk Groups Engine</h3>
                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 size={11} /> Connected & Active
                </span>
              </div>
              <p className="text-xs text-slate-400">Adapter: <code>AirDeskSupplierAdapter</code> • API Version: <code>v2.4-groups</code></p>
            </div>
          </div>

          <div className="text-xs text-right text-slate-400">
            <div>Last Polled: <strong className="text-white">{lastSync}</strong></div>
            <div className="text-emerald-400 font-semibold mt-0.5">{groups.length} Active Group Series Synced</div>
          </div>
        </div>

        {/* Synced Products Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Live Synced Products</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {groups.map((g) => (
              <div key={g.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-white">{g.title}</h5>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {g.supplierProductId} • {g.departures.length} Departures • {g.destination}
                  </p>
                </div>
                <span className="bg-slate-800 text-cyan-400 px-2 py-1 rounded font-mono font-bold text-[11px]">
                  Net PKR {g.departures[0]?.supplierNetPricePKR.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Future Supplier Slot Previews (Extensibility Demonstration) */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Zap size={18} className="text-purple-400" />
            Plug-and-Play Future Vendor Integrations
          </h3>
          <p className="text-xs text-slate-400">
            Because GNK uses a supplier abstraction, these vendor adapters can be activated without altering the Agent Portal or Pricing Engine
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-3 opacity-80 hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Building size={20} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">HotelBeds / Agoda Direct</h4>
              <p className="text-xs text-slate-400 mt-1">Wholesale worldwide hotel inventory & room allotments adapter.</p>
            </div>
            <span className="inline-block text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Architecture Ready (Phase 8)
            </span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-3 opacity-80 hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Moon size={20} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Saudi Umrah Direct API</h4>
              <p className="text-xs text-slate-400 mt-1">Nusuk / Ground handling & Makkah Clock Tower direct connectivity.</p>
            </div>
            <span className="inline-block text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Architecture Ready (Phase 8)
            </span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-3 opacity-80 hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Plane size={20} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Amadeus / Sabre NDC Flights</h4>
              <p className="text-xs text-slate-400 mt-1">Direct airline series group blocks and instant PNR issuance.</p>
            </div>
            <span className="inline-block text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Architecture Ready (Phase 8)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
