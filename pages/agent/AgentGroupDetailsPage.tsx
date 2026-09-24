import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useB2BAuth } from '../../context/B2BAuthContext';
import { airDeskAdapter } from '../../services/b2b/airdeskAdapter';
import { pricingEngine } from '../../services/b2b/pricingEngine';
import { b2bStore } from '../../services/b2b/b2bStore';
import { StandardGroupProduct, GroupDeparture, Passenger } from '../../types/b2b';
import { 
  ArrowLeft, 
  MapPin, 
  Users, 
  Check, 
  X, 
  Plane, 
  Hotel, 
  ShieldCheck, 
  AlertCircle, 
  Send, 
  Plus, 
  Trash2, 
  Building2, 
  FileCheck 
} from 'lucide-react';
import { FileUploadDropzone } from '../../components/FileUploadDropzone';

export const AgentGroupDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, isApprovedAgent } = useB2BAuth();

  const [product, setProduct] = useState<StandardGroupProduct | null>(null);
  const [selectedDeparture, setSelectedDeparture] = useState<GroupDeparture | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successBookingId, setSuccessBookingId] = useState<string | null>(null);

  // Booking Form State
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'CASH_DEPOSIT' | 'CREDIT_WALLET'>('BANK_TRANSFER');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [passengers, setPassengers] = useState<Passenger[]>([
    {
      id: 'p-init-1',
      title: 'Mr',
      firstName: '',
      lastName: '',
      passportNumber: '',
      passportExpiry: '',
      dob: '',
      nationality: 'Pakistani',
      gender: 'MALE',
      passengerType: 'ADULT'
    }
  ]);

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      try {
        if (id) {
          const found = await airDeskAdapter.getProductDetails(id);
          if (found) {
            setProduct(found);
            if (found.departures.length > 0) {
              setSelectedDeparture(found.departures[0]);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [id]);

  const addPassenger = () => {
    if (!selectedDeparture) return;
    if (passengers.length >= selectedDeparture.availableSeats) {
      alert(`Cannot add more passengers than available seats (${selectedDeparture.availableSeats}).`);
      return;
    }
    setPassengers(prev => [
      ...prev,
      {
        id: `p-new-${Date.now()}`,
        title: 'Mr',
        firstName: '',
        lastName: '',
        passportNumber: '',
        passportExpiry: '',
        dob: '',
        nationality: 'Pakistani',
        gender: 'MALE',
        passengerType: 'ADULT'
      }
    ]);
  };

  const removePassenger = (index: number) => {
    if (passengers.length <= 1) return;
    setPassengers(prev => prev.filter((_, i) => i !== index));
  };

  const updatePassenger = (index: number, field: keyof Passenger, value: any) => {
    setPassengers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const calculateTotal = () => {
    if (!product || !selectedDeparture) return { perSeat: 0, total: 0, ruleDesc: '' };
    const priceResult = pricingEngine.calculatePrice({
      supplierNetPricePKR: selectedDeparture.supplierNetPricePKR,
      supplierId: product.supplierId,
      product: { id: product.id, supplierProductId: product.supplierProductId, productType: product.productType },
      agent: currentUser ? { id: currentUser.id, agencyId: currentUser.agencyId } : undefined
    });
    return {
      perSeat: priceResult.calculatedSellingPricePKR,
      total: priceResult.calculatedSellingPricePKR * passengers.length,
      ruleDesc: priceResult.appliedRuleName
    };
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!product || !selectedDeparture) return;

    if (!isApprovedAgent) {
      setErrorMsg('Your agent account is currently pending verification. You can place test requests once approved by GNK.');
      return;
    }

    // Validate Passenger Info
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (!p.firstName.trim() || !p.lastName.trim() || !p.passportNumber.trim()) {
        setErrorMsg(`Please fill in required details (Name, Passport Number) for Passenger #${i + 1}`);
        return;
      }
    }

    setErrorMsg('');
    setSubmitting(true);

    try {
      const newBooking = await b2bStore.createBookingRequest({
        agent: currentUser,
        product,
        departureId: selectedDeparture.id,
        passengers,
        paymentMethod,
        paymentReferenceNumber: referenceNumber || undefined,
        paymentProofUrl: paymentProofUrl || (referenceNumber ? 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=800&auto=format&fit=crop' : undefined),
        specialRequests
      });

      setSuccessBookingId(newBooking.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit booking request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin mx-auto mb-3"></div>
        <p className="text-xs font-bold text-slate-400">Loading Product from AirDesk...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-slate-400 text-sm">Product not found.</p>
        <Link to="/agent/groups" className="text-cyan-400 text-xs font-bold">← Back to Groups</Link>
      </div>
    );
  }

  const totals = calculateTotal();

  if (successBookingId) {
    return (
      <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
          <Check size={32} />
        </div>

        <div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Booking Request Submitted
          </span>
          <h2 className="text-2xl font-black text-white mt-3">
            Request Reference: <span className="text-cyan-400 font-mono">{successBookingId}</span>
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Your booking request has been created in GNK Elite. GNK Operations will review payment and automatically submit the reservation to AirDesk.
          </p>
        </div>

        <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 text-left space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Tour / Departure:</span>
            <span className="text-white font-bold">{product.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Travel Date:</span>
            <span className="text-white font-bold">{selectedDeparture?.departureDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Total Passengers:</span>
            <span className="text-white font-bold">{passengers.length} Pax</span>
          </div>
          <div className="flex justify-between border-t border-slate-800 pt-2 text-sm">
            <span className="text-slate-300 font-bold">Total Amount (PKR):</span>
            <span className="text-cyan-400 font-black">PKR {totals.total.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/agent/bookings')}
            className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-6 py-3 rounded-xl text-sm transition-all"
          >
            View in My Bookings →
          </button>
          <Link
            to="/agent/groups"
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-6 py-3 rounded-xl text-sm transition-all"
          >
            Browse Other Departures
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back Button & Title */}
      <div className="flex items-center gap-3">
        <Link
          to="/agent/groups"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold text-cyan-400">{product.productType.replace('_', ' ')}</span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-400 font-mono">AirDesk ID: {product.supplierProductId}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">{product.title}</h1>
        </div>
      </div>

      {/* Grid: Left Product Details, Right Booking Action Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (8 cols): Info, Itinerary, Inclusions */}
        <div className="lg:col-span-7 space-y-6">
          <div className="relative rounded-2xl overflow-hidden h-72 border border-slate-800">
            <img src={product.heroImage} alt={product.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/40" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs">
              <span className="bg-slate-950/80 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5">
                <MapPin size={14} className="text-cyan-400" /> {product.destination}, {product.country}
              </span>
              <span className="bg-slate-950/80 px-3 py-1.5 rounded-lg font-bold">
                {product.durationDays} Days / {product.durationNights} Nights
              </span>
            </div>
          </div>

          {/* Overview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h2 className="text-base font-bold text-white">Tour Overview</h2>
            <p className="text-xs text-slate-300 leading-relaxed">{product.overview}</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-xs">
              {product.airline && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Plane size={15} className="text-cyan-400" />
                  <span>{product.airline}</span>
                </div>
              )}
              {product.hotelRating && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Hotel size={15} className="text-cyan-400" />
                  <span>{product.hotelRating}-Star Hotels</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck size={15} className="text-emerald-400" />
                <span>{product.visaIncluded ? 'Visa Included' : 'Visa Assistance'}</span>
              </div>
            </div>
          </div>

          {/* Inclusions & Exclusions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Check size={16} className="text-emerald-400" /> Inclusions
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                {product.inclusions.map((inc, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>{inc}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <X size={16} className="text-rose-400" /> Exclusions
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                {product.exclusions.map((exc, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <X size={13} className="text-rose-400 mt-0.5 flex-shrink-0" />
                    <span>{exc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Day by Day Itinerary */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Daily Itinerary</h2>
            <div className="space-y-4">
              {product.itinerary.map((item) => (
                <div key={item.day} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center border border-cyan-500/30">
                      {item.day}
                    </span>
                    <div className="w-0.5 flex-1 bg-slate-800 my-1" />
                  </div>
                  <div className="pb-3 flex-1">
                    <h4 className="text-xs font-bold text-white">{item.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Interactive Booking Request Panel */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleSubmitBooking} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 sticky top-24 shadow-2xl">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <FileCheck size={20} className="text-cyan-400" />
                Reserve Group Seats
              </h2>
              <p className="text-xs text-slate-400">GNK Elite B2B Direct Reservation</p>
            </div>

            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Departure Date Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Select Departure Date</label>
              <div className="space-y-2">
                {product.departures.map((dep) => {
                  const isSelected = selectedDeparture?.id === dep.id;
                  const depPrice = pricingEngine.calculatePrice({
                    supplierNetPricePKR: dep.supplierNetPricePKR,
                    supplierId: product.supplierId,
                    product: { id: product.id, supplierProductId: product.supplierProductId, productType: product.productType },
                    agent: currentUser ? { id: currentUser.id, agencyId: currentUser.agencyId } : undefined
                  });

                  return (
                    <div
                      key={dep.id}
                      onClick={() => setSelectedDeparture(dep)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">{dep.departureDate} → {dep.returnDate}</div>
                        <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                          <Users size={11} /> {dep.availableSeats} seats available
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-cyan-400">
                          PKR {depPrice.calculatedSellingPricePKR.toLocaleString()}
                        </div>
                        <span className="text-[9px] text-slate-500">per pax</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Passenger Details Form */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Passenger List ({passengers.length})
                </label>
                <button
                  type="button"
                  onClick={addPassenger}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <Plus size={13} /> Add Passenger
                </button>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {passengers.map((p, idx) => (
                  <div key={p.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                      <span>Passenger #{idx + 1}</span>
                      {passengers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePassenger(idx)}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <select
                        value={p.title}
                        onChange={(e) => updatePassenger(idx, 'title', e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-1.5 focus:outline-none"
                      >
                        <option value="Mr">Mr</option>
                        <option value="Mrs">Mrs</option>
                        <option value="Ms">Ms</option>
                        <option value="Mstr">Mstr</option>
                      </select>
                      <input
                        type="text"
                        placeholder="First Name"
                        value={p.firstName}
                        onChange={(e) => updatePassenger(idx, 'firstName', e.target.value)}
                        className="col-span-3 bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-1.5 focus:outline-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={p.lastName}
                        onChange={(e) => updatePassenger(idx, 'lastName', e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-1.5 focus:outline-none"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Passport Number"
                        value={p.passportNumber}
                        onChange={(e) => updatePassenger(idx, 'passportNumber', e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg p-1.5 focus:outline-none font-mono uppercase"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-bold text-slate-300">Payment Option (GNK Direct)</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('BANK_TRANSFER')}
                  className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                    paymentMethod === 'BANK_TRANSFER'
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Bank Transfer / Deposit
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CREDIT_WALLET')}
                  className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                    paymentMethod === 'CREDIT_WALLET'
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Agency Credit Wallet
                </button>
              </div>

              {paymentMethod === 'BANK_TRANSFER' && (
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-[11px] space-y-3 text-slate-300">
                  <div>
                    <p className="font-bold text-white flex items-center gap-1">
                      <Building2 size={13} className="text-cyan-400" /> GNK Official Wholesale Bank Account
                    </p>
                    <p className="text-slate-400 text-[10px]">Habib Bank Limited (HBL) • A/C: 0042-798201823901 • IBAN: PK36HABB0000427982018239</p>
                  </div>
                  <input
                    type="text"
                    placeholder="Bank Transfer / Slip Ref # (e.g. HBL-982014)"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl p-2.5 focus:outline-none font-mono"
                  />
                  <FileUploadDropzone
                    label="Attach Bank Deposit Slip / Wire Receipt"
                    helperText="Upload JPG, PNG, or PDF payment receipt for faster approval"
                    category="PAYMENT_SLIP"
                    value={paymentProofUrl}
                    onChange={(url) => setPaymentProofUrl(url)}
                  />
                </div>
              )}

              <div className="pt-2">
                <input
                  type="text"
                  placeholder="Special remarks / rooming requests (optional)"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:outline-none placeholder-slate-500"
                />
              </div>
            </div>

            {/* Price Summary & Submit */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Per Seat Price:</span>
                <span className="font-bold text-white">PKR {totals.perSeat.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Passengers:</span>
                <span className="font-bold text-white">{passengers.length} Pax</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>Applied Pricing:</span>
                <span className="text-cyan-400 font-semibold">{totals.ruleDesc}</span>
              </div>
              <div className="flex justify-between text-sm font-black border-t border-slate-800 pt-2">
                <span className="text-white">Total Amount:</span>
                <span className="text-cyan-400">PKR {totals.total.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !isApprovedAgent}
              className={`w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                isApprovedAgent
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              {submitting ? (
                <>Creating Booking Request...</>
              ) : (
                <>
                  <Send size={16} />
                  Submit Booking Request
                </>
              )}
            </button>

            {!isApprovedAgent && (
              <p className="text-[11px] text-amber-400 text-center">
                * Booking submission requires approved partner status.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
