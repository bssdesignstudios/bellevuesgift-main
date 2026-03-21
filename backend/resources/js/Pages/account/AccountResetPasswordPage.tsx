import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import bellevueLogo from '@/assets/bellevue-logo.webp';

export default function AccountResetPasswordPage() {
  const pageProps = usePage().props as any;
  // token and email are passed via Inertia props from the GET route
  const token: string = pageProps.token ?? '';
  const emailFromProps: string = pageProps.email ?? '';

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (password !== passwordConfirmation) {
      setErrors({ password_confirmation: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      await axios.post('/reset-password', {
        token,
        email: emailFromProps,
        password,
        password_confirmation: passwordConfirmation,
      });
      setDone(true);
      toast.success('Password reset successfully');
    } catch (error: any) {
      const data = error.response?.data;
      if (data?.errors) {
        setErrors(data.errors as Record<string, string>);
      } else {
        toast.error(data?.message || 'Failed to reset password. The link may have expired.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (done) {
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
            <h1 className="text-2xl font-bold">Password Reset</h1>
            <p className="text-muted-foreground mt-2">
              Your password has been updated. You can now sign in with your new password.
            </p>
          </div>

          <Button asChild className="w-full">
            <Link href="/account/login">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <Link href="/">
            <img src={bellevueLogo} alt="Bellevue" className="h-12 mx-auto mb-6" />
          </Link>
          <p className="text-muted-foreground">
            This reset link is invalid or has already been used.
          </p>
          <Button variant="outline" asChild>
            <Link href="/account/forgot-password">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Request a new link
            </Link>
          </Button>
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
          <h1 className="text-2xl font-bold">Set New Password</h1>
          <p className="text-muted-foreground mt-2">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password_confirmation">Confirm New Password</Label>
            <Input
              id="password_confirmation"
              type={showPassword ? 'text' : 'password'}
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              placeholder="Re-enter your new password"
              required
              minLength={8}
            />
            {errors.password_confirmation && (
              <p className="text-sm text-destructive">{errors.password_confirmation}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Resetting…
              </>
            ) : (
              'Reset Password'
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
