import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import bellevueLogo from '@/assets/bellevue-logo.webp';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);
    
    if (error) {
      toast.error(error.message || 'Failed to sign in');
      setLoading(false);
    } else {
      toast.success('Signed in successfully');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <Link to="/">
            <img src={bellevueLogo} alt="Bellevue" className="h-12 mx-auto mb-6" />
          </Link>
          <h1 className="text-2xl font-bold">Sign In</h1>
          <p className="text-muted-foreground mt-2">
            Staff login for POS and Admin access
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
              placeholder="name@example.com"
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

        <div className="border-t pt-6">
          <p className="text-sm text-muted-foreground text-center mb-4">
            Demo Accounts:
          </p>
          <div className="grid gap-2 text-sm">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">Cashier</p>
              <p className="text-muted-foreground">cashier1@demo.com / DemoPass123!</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">Admin</p>
              <p className="text-muted-foreground">admin1@demo.com / DemoPass123!</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">Warehouse Manager</p>
              <p className="text-muted-foreground">warehouse1@demo.com / DemoPass123!</p>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>
            <Link to="/staff/login" className="text-primary hover:underline font-medium">Staff Login with Demo Accounts →</Link>
          </p>
          <p>
            <Link to="/" className="hover:underline">← Back to Store</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
