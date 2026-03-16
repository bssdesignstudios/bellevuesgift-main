import { useState } from 'react';
import { Link } from '@inertiajs/react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import bellevueLogo from '@/assets/bellevue-logo.webp';

export default function AccountForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post('/forgot-password', { email });
      setSent(true);
      toast.success('Reset link sent to your email');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reset email');
    }

    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8 animate-fade-in text-center">
          <Link href="/">
            <img src={bellevueLogo} alt="Bellevue" className="h-12 mx-auto mb-6" />
          </Link>

          <div className="bg-success/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>

          <div>
            <h1 className="text-2xl font-bold">Check Your Email</h1>
            <p className="text-muted-foreground mt-2">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
          </div>

          <div className="space-y-4">
            <Button variant="outline" asChild className="w-full">
              <Link href="/account/login">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Link>
            </Button>

            <p className="text-sm text-muted-foreground">
              Didn't receive the email?{' '}
              <button
                onClick={() => setSent(false)}
                className="text-primary hover:underline"
              >
                Try again
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <Link href="/">
            <img src={bellevueLogo} alt="Bellevue" className="h-12 mx-auto mb-6" />
          </Link>
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-muted-foreground mt-2">
            Enter your email and we'll send you a reset link
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          <Link href="/account/login" className="hover:underline flex items-center justify-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
