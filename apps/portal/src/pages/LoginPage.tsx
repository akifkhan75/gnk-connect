import { AuthLayout, Button, Input, Label } from '@gnk/ui';

export function LoginPage() {
  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Log in to your GNK Connect partner account."
      logo={<div className="font-bold text-2xl text-primary">GNK Connect</div>}
      imageSlot={<img src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop" alt="Travel" className="w-full h-full object-cover" />}
    >
      <div className="space-y-6">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@agency.com" />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <a href="#" className="text-sm text-primary hover:underline font-medium">Forgot password?</a>
          </div>
          <Input id="password" type="password" />
        </div>

        <Button className="w-full" size="lg">Log In</Button>
      </div>
      
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account? <a href="/register" className="text-primary font-medium hover:underline">Apply now</a>
      </p>
    </AuthLayout>
  );
}
