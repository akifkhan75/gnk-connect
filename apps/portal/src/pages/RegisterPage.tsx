import { useState } from 'react';
import { AuthLayout, Stepper, Button, Input, Label } from '@gnk/ui';

export function RegisterPage() {
  const [step, setStep] = useState(0);

  const steps = [
    { title: 'Account Details' },
    { title: 'Agency Profile' },
    { title: 'KYC Documents' }
  ];

  const handleNext = () => setStep(s => Math.min(s + 1, 2));
  const handleBack = () => setStep(s => Math.max(s - 1, 0));

  return (
    <AuthLayout
      title="Create Partner Account"
      subtitle="Join GNK Connect to access wholesale B2B groups and exclusive rates."
      logo={<div className="font-bold text-2xl text-primary">GNK Connect</div>}
      imageSlot={<img src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop" alt="Travel" className="w-full h-full object-cover" />}
    >
      <div className="mb-8">
        <Stepper steps={steps} currentStep={step} />
      </div>

      <div className="space-y-6">
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@agency.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="agencyName">Agency Name</Label>
              <Input id="agencyName" placeholder="e.g. ABC Travels" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="license">DTS License Number</Label>
              <Input id="license" placeholder="DTS-..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" placeholder="Karachi" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-dashed p-6 text-center">
              <div className="text-sm font-medium text-foreground">Upload DTS License</div>
              <p className="mt-1 text-xs text-muted-foreground">PDF, JPEG, or PNG up to 10MB</p>
              <Button variant="outline" className="mt-4">Select File</Button>
            </div>
            <div className="rounded-xl border border-dashed p-6 text-center">
              <div className="text-sm font-medium text-foreground">Upload Owner CNIC</div>
              <p className="mt-1 text-xs text-muted-foreground">PDF, JPEG, or PNG up to 10MB</p>
              <Button variant="outline" className="mt-4">Select File</Button>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleBack} disabled={step === 0}>
            Back
          </Button>
          {step < 2 ? (
            <Button onClick={handleNext}>Next Step</Button>
          ) : (
            <Button>Submit Application</Button>
          )}
        </div>
      </div>
      
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account? <a href="/login" className="text-primary font-medium hover:underline">Log in</a>
      </p>
    </AuthLayout>
  );
}
