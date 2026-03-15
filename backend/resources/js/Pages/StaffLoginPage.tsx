import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import bellevueLogo from '@/assets/bellevue-logo.webp';
import { isPOSDomain } from '@/lib/domain';

export default function StaffLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error, staff: loggedInStaff } = await signIn(email, password);

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        toast.error('Email confirmation required. Please check your inbox.');
      } else {
        toast.error('Login failed: ' + error.message);
      }
      setLoading(false);
      return;
    }

    toast.success('Login successful!');

    // Full page navigation to ensure session cookie is established
    if (isPOSDomain()) {
      window.location.href = '/pos';
      return;
    }

    // On storefront domain, route by role
    const role = loggedInStaff?.role || '';
    switch (role) {
      case 'admin':
        window.location.href = '/admin';
        break;
      case 'finance':
        window.location.href = '/admin/reports';
        break;
      case 'warehouse':
      case 'warehouse_manager':
        window.location.href = '/admin/inventory';
        break;
      default:
        window.location.href = '/pos';
    }
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={bellevueLogo} alt="Bellevue" className="h-12" />
          </div>
          <CardTitle className="text-2xl">Staff Login</CardTitle>
          <CardDescription>
            Access POS and Admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="staff@bellevue.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
