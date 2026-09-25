import { useState } from 'react';
import { AuthLayout, Stepper, Button, Input, Label } from '@gnk/ui';
import { authApi, uploadsApi } from '@gnk/api-client';

export function RegisterPage() {
  const [step, setStep] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dtsFile, setDtsFile] = useState<File | null>(null);
  const [cnicFile, setCnicFile] = useState<File | null>(null);

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
              {dtsFile ? (
                <div className="mt-4 p-2 bg-muted rounded flex items-center justify-between">
                  <span className="text-sm truncate max-w-[200px]">{dtsFile.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => setDtsFile(null)}>Remove</Button>
                </div>
              ) : (
                <div className="mt-4">
                  <Input 
                    type="file" 
                    id="dts-upload"
                    className="hidden" 
                    onChange={(e) => setDtsFile(e.target.files?.[0] || null)}
                    accept="application/pdf,image/jpeg,image/png"
                  />
                  <Label htmlFor="dts-upload" className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                    Select File
                  </Label>
                </div>
              )}
            </div>
            <div className="rounded-xl border border-dashed p-6 text-center">
              <div className="text-sm font-medium text-foreground">Upload Owner CNIC</div>
              <p className="mt-1 text-xs text-muted-foreground">PDF, JPEG, or PNG up to 10MB</p>
              {cnicFile ? (
                <div className="mt-4 p-2 bg-muted rounded flex items-center justify-between">
                  <span className="text-sm truncate max-w-[200px]">{cnicFile.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => setCnicFile(null)}>Remove</Button>
                </div>
              ) : (
                <div className="mt-4">
                  <Input 
                    type="file" 
                    id="cnic-upload"
                    className="hidden" 
                    onChange={(e) => setCnicFile(e.target.files?.[0] || null)}
                    accept="application/pdf,image/jpeg,image/png"
                  />
                  <Label htmlFor="cnic-upload" className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                    Select File
                  </Label>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleBack} disabled={step === 0 || isUploading}>
            Back
          </Button>
          {step < 2 ? (
            <Button onClick={handleNext}>Next Step</Button>
          ) : (
            <Button 
              disabled={!dtsFile || !cnicFile || isUploading}
              onClick={async () => {
                setIsUploading(true);
                try {
                  const emailInput = document.getElementById('email') as HTMLInputElement;
                  const passwordInput = document.getElementById('password') as HTMLInputElement;
                  const agencyInput = document.getElementById('agencyName') as HTMLInputElement;
                  const licenseInput = document.getElementById('license') as HTMLInputElement;
                  const cityInput = document.getElementById('city') as HTMLInputElement;
                  
                  const dtsRes = await uploadsApi.uploadDocument(dtsFile!, 'DTS_LICENSE');
                  const cnicRes = await uploadsApi.uploadDocument(cnicFile!, 'CNIC_FRONT');
                  
                  await authApi.register({
                    accountType: 'AGENCY',
                    email: emailInput.value,
                    password: passwordInput.value,
                    fullName: agencyInput.value, // using agency name as full name for owner placeholder
                    legalName: agencyInput.value,
                    dtsLicenseNo: licenseInput.value,
                    city: cityInput.value,
                    dtsFileId: dtsRes.file.id,
                    cnicFileId: cnicRes.file.id,
                  });
                  
                  alert('Application Submitted successfully! Your files have been uploaded.');
                  window.location.href = '/login';
                } catch (e: any) {
                  alert(e.message || 'Failed to submit application');
                } finally {
                  setIsUploading(false);
                }
              }}
            >
              {isUploading ? 'Uploading...' : 'Submit Application'}
            </Button>
          )}
        </div>
      </div>
      
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account? <a href="/login" className="text-primary font-medium hover:underline">Log in</a>
      </p>
    </AuthLayout>
  );
}
