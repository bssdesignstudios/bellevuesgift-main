import { useState, useEffect } from 'react';
import { Link, router } from '@inertiajs/react';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import bellevueLogo from '@/assets/bellevue-logo.webp';

export default function AccountLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, customer, loading: authLoading } = useCustomerAuth();

  // Redirect if already logged in - use useEffect to avoid render-time navigation
  useEffect(() => {
    if (!authLoading && customer) {
      router.visit('/account', { replace: true });
    }
  }, [customer, authLoading]);

  // Show nothing while checking auth or if customer exists (will redirect)
  if (authLoading || customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error.message || 'Failed to sign in');
      setLoading(false);
    } else {
      toast.success('Welcome back!');
      router.visit('/account');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <Link href="/">
            <img src={bellevueLogo} alt="Bellevue" className="h-12 mx-auto mb-6" />
          </Link>
          <h1 className="text-2xl font-bold">Customer Sign In</h1>
          <p className="text-muted-foreground mt-2">
            Access your orders, wishlist, and more
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end">
            <Link href="/account/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>
            Don't have an account?{' '}
            <Link href="/account/register" className="text-primary hover:underline font-medium">
              Create Account
            </Link>
          </p>
          <p>
            <Link href="/" className="hover:underline">← Back to Store</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
