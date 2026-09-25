import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input, Label, StatusBadge } from '@gnk/ui';
import { ChevronRight, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';

export function NewBookingPage() {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingRef, setBookingRef] = useState<string | null>(null);

  const [passengers, setPassengers] = useState([
    { type: 'ADULT', title: 'MR', firstName: '', lastName: '', gender: 'MALE', dateOfBirth: '', nationality: 'PK', passportNumber: '', passportExpiry: '' }
  ]);

  const addPassenger = () => {
    setPassengers([...passengers, { type: 'ADULT', title: 'MR', firstName: '', lastName: '', gender: 'MALE', dateOfBirth: '', nationality: 'PK', passportNumber: '', passportExpiry: '' }]);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call and idempotency delay
    await new Promise(r => setTimeout(r, 2000));
    setBookingRef(`GNK-2026-${Math.floor(100000 + Math.random() * 900000)}`);
    setStep(3);
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6 flex flex-col w-full pb-10 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Create Booking</h2>
        <p className="text-muted-foreground mt-1">
          Complete passenger details to secure your allocated seats.
        </p>
      </div>

      <div className="flex items-center gap-4 py-4">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-current text-sm font-bold">1</div>
          <span className="font-medium">Passengers</span>
        </div>
        <div className="h-px bg-border flex-1" />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-current text-sm font-bold">2</div>
          <span className="font-medium">Review</span>
        </div>
        <div className="h-px bg-border flex-1" />
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-current text-sm font-bold">3</div>
          <span className="font-medium">Confirmation</span>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 p-4 rounded-xl flex items-start gap-3 border border-blue-200 dark:border-blue-900">
            <Calendar className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Seats are held for 15 minutes.</p>
              <p className="text-sm mt-1">Please complete this form before the timer expires to guarantee availability at the quoted price.</p>
            </div>
          </div>

          {passengers.map((p, idx) => (
            <div key={idx} className="bg-surface border rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold border-b pb-2">Passenger {idx + 1}</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option>MR</option>
                    <option>MRS</option>
                    <option>MISS</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label>First Name</Label>
                  <Input placeholder="As per passport" />
                </div>
                <div className="space-y-2 md:col-span-4">
                  <Label>Last Name</Label>
                  <Input placeholder="As per passport" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Passport Number</Label>
                  <Input placeholder="e.g. AB1234567" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Passport Expiry</Label>
                  <Input type="date" />
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={addPassenger}>
              <Plus className="mr-2 h-4 w-4" /> Add Passenger
            </Button>
            <Button onClick={() => setStep(2)}>
              Continue to Review <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-surface border rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold border-b pb-2">Booking Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-muted-foreground">Product:</div>
              <div className="font-medium text-right">Dubai Luxury 7-Day</div>
              <div className="text-muted-foreground">Departure:</div>
              <div className="font-medium text-right">15 Oct 2026</div>
              <div className="text-muted-foreground">Passengers:</div>
              <div className="font-medium text-right">{passengers.length}</div>
              <div className="text-muted-foreground border-t pt-2 mt-2">Total Amount (PKR):</div>
              <div className="font-bold text-lg text-primary text-right border-t pt-2 mt-2">
                {(197000 * passengers.length).toLocaleString()}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back to Edit
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Securing Booking...' : 'Confirm & Submit'}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-surface border border-green-200 dark:border-green-900 rounded-xl p-10 shadow-sm text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold">Booking Request Submitted!</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your reference is <span className="font-bold text-foreground">{bookingRef}</span>. It is currently pending approval.
          </p>
          <div className="pt-6">
            <Button onClick={() => navigate('/bookings')}>
              Go to My Bookings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
