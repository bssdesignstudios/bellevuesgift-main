import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import bellevueLogo from '@/assets/bellevue-logo.webp';

const DEMO_ACCOUNTS = [
  { email: 'cashier1@bellevue.demo', password: 'DemoPass123!', role: 'Cashier', name: 'Maria Santos' },
  { email: 'cashier2@bellevue.demo', password: 'DemoPass123!', role: 'Cashier', name: 'James Williams' },
  { email: 'admin1@demo.com', password: 'DemoPass123!', role: 'Admin', name: 'Admin User' },
  { email: 'warehouse1@demo.com', password: 'DemoPass123!', role: 'Warehouse', name: 'Warehouse Manager' },
];

export default function StaffLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<'success' | 'error' | null>(null);
  const { signIn, staff } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const showSeedButton = searchParams.get('seed') === '1';

  // Check Supabase connection
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('staff').select('count').limit(1);
        setSupabaseConnected(!error);
      } catch {
        setSupabaseConnected(false);
      }
    };
    checkConnection();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        toast.error('Email confirmation required. For demo, add ?seed=1 to URL to initialize accounts.');
      } else {
        toast.error('Login failed: ' + error.message);
      }
      setLoading(false);
      return;
    }

    toast.success('Login successful!');
    // Redirect based on role - cashiers go to POS, admins can go to admin
    setTimeout(() => {
      // Always redirect to POS first, let the POS page handle role-based access
      window.location.href = '/pos';
    }, 500);
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setLoading(true);
    
    const { error } = await signIn(demoEmail, demoPassword);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Demo accounts not initialized. Click "Initialize Demo Accounts" button below.');
      } else {
        toast.error('Login failed: ' + error.message);
      }
      setLoading(false);
      return;
    }

    toast.success('Login successful!');
    // Redirect to POS for all staff
    setTimeout(() => {
      window.location.href = '/pos';
    }, 500);
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    setSeedResult(null);
    
    try {
      const response = await supabase.functions.invoke('seed-demo-data');
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      setSeedResult('success');
      toast.success('Demo accounts and data initialized! You can now log in.');
    } catch (error: any) {
      console.error('Seed error:', error);
      setSeedResult('error');
      toast.error('Failed to seed demo data: ' + error.message);
    }
    
    setSeeding(false);
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
          
          {/* Supabase connection status */}
          <div className="mt-2 text-xs">
          {supabaseConnected === null && <span className="text-muted-foreground">Checking connection...</span>}
          {supabaseConnected === true && <span className="text-success flex items-center justify-center gap-1"><CheckCircle className="h-3 w-3" /> Database connected</span>}
          {supabaseConnected === false && <span className="text-destructive flex items-center justify-center gap-1"><AlertCircle className="h-3 w-3" /> Database connection issue</span>}
          </div>
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Demo Accounts
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                variant="outline"
                className="w-full justify-between"
                onClick={() => handleDemoLogin(account.email, account.password)}
                disabled={loading}
              >
                <span className="font-medium">{account.name}</span>
                <span className="text-muted-foreground text-sm">{account.role}</span>
              </Button>
            ))}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Password for all demo accounts: <code className="bg-muted px-1 rounded">DemoPass123!</code>
          </p>
          
          {/* Seed button - only visible with ?seed=1 */}
          {showSeedButton && (
            <div className="pt-4 border-t">
              <Button 
                onClick={handleSeedDemo} 
                variant="secondary" 
                className="w-full"
                disabled={seeding}
              >
                {seeding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Initializing Demo Data...
                  </>
                ) : seedResult === 'success' ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2 text-success" />
                    Demo Data Initialized!
                  </>
                ) : seedResult === 'error' ? (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2 text-destructive" />
                    Retry Initialize Demo
                  </>
                ) : (
                  'Initialize Demo Accounts & Data'
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                This creates demo users, products, orders, and more.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
