import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Loader2, RefreshCw, Database, Shield, Server } from 'lucide-react';
import { isDemoModeEnabled, enableDemoMode, getDemoSession } from '@/lib/demoSession';
import bellevueLogo from '@/assets/bellevue-logo.webp';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

export default function SupabaseStatus() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [overallStatus, setOverallStatus] = useState<'pending' | 'connected' | 'unreachable'>('pending');

  const runTests = async () => {
    setTesting(true);
    setOverallStatus('pending');
    
    const newResults: TestResult[] = [
      { name: 'SUPABASE_URL present', status: 'pending' },
      { name: 'auth.getSession works', status: 'pending' },
      { name: 'Database query works', status: 'pending' },
    ];
    setResults([...newResults]);

    // Test 1: Check if SUPABASE_URL is present
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    newResults[0] = {
      name: 'SUPABASE_URL present',
      status: supabaseUrl ? 'success' : 'error',
      message: supabaseUrl ? 'Environment variable configured' : 'Missing VITE_SUPABASE_URL',
    };
    setResults([...newResults]);

    // Test 2: Check auth.getSession with 6s timeout
    try {
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout after 6s')), 6000)
      );
      
      const result = await Promise.race([sessionPromise, timeoutPromise]) as any;
      
      newResults[1] = {
        name: 'auth.getSession works',
        status: result.error ? 'error' : 'success',
        message: result.error ? result.error.message : 'Session check successful',
      };
    } catch (error: any) {
      newResults[1] = {
        name: 'auth.getSession works',
        status: 'error',
        message: error.message || 'Failed to check session',
      };
    }
    setResults([...newResults]);

    // Test 3: Simple DB query with 6s timeout
    try {
      const queryPromise = supabase.from('categories').select('id').limit(1);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout after 6s')), 6000)
      );
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      newResults[2] = {
        name: 'Database query works',
        status: result.error ? 'error' : 'success',
        message: result.error ? result.error.message : 'Query successful',
      };
    } catch (error: any) {
      newResults[2] = {
        name: 'Database query works',
        status: 'error',
        message: error.message || 'Failed to query database',
      };
    }
    setResults([...newResults]);

    // Determine overall status
    const hasError = newResults.some(r => r.status === 'error');
    setOverallStatus(hasError ? 'unreachable' : 'connected');
    setTesting(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const demoSession = getDemoSession();
  const demoModeActive = isDemoModeEnabled();

  return (
    <div className="min-h-screen bg-muted p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <img src={bellevueLogo} alt="Bellevue" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">System Status</h1>
          <p className="text-muted-foreground">Supabase Connection Diagnostics</p>
        </div>

        {/* Overall Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-4 py-6">
              {overallStatus === 'pending' && (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                  <span className="text-xl text-muted-foreground">Testing connection...</span>
                </>
              )}
              {overallStatus === 'connected' && (
                <>
                  <CheckCircle className="h-12 w-12 text-emerald-500" />
                  <span className="text-xl font-semibold text-emerald-600">✅ Connected</span>
                </>
              )}
              {overallStatus === 'unreachable' && (
                <>
                  <XCircle className="h-12 w-12 text-destructive" />
                  <span className="text-xl font-semibold text-destructive">❌ Unreachable</span>
                </>
              )}
            </div>
            
            {overallStatus === 'unreachable' && (
              <p className="text-center text-muted-foreground text-sm mb-4">
                Demo Mode will be used automatically for testing.
              </p>
            )}

            <Button 
              onClick={runTests} 
              disabled={testing} 
              variant="outline" 
              className="w-full"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Run Test
            </Button>
          </CardContent>
        </Card>

        {/* Individual Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.map((result, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  {result.status === 'pending' && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                  {result.status === 'success' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                  {result.status === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
                  <div>
                    <p className="font-medium">{result.name}</p>
                    {result.message && (
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                    )}
                  </div>
                </div>
                <Badge variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}>
                  {result.status === 'success' ? 'Yes' : result.status === 'error' ? 'No' : '...'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Demo Mode Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Demo Mode Status
            </CardTitle>
            <CardDescription>
              Demo mode provides reliable access when Supabase is unavailable
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span>Demo Mode Active</span>
              <Badge variant={demoModeActive ? 'default' : 'secondary'}>
                {demoModeActive ? 'Yes' : 'No'}
              </Badge>
            </div>
            
            {demoSession && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium">Current Demo Session:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Role:</span>
                  <span className="font-medium capitalize">{demoSession.role}</span>
                  <span className="text-muted-foreground">Name:</span>
                  <span>{demoSession.name}</span>
                  <span className="text-muted-foreground">Email:</span>
                  <span>{demoSession.email}</span>
                </div>
              </div>
            )}

            {!demoModeActive && (
              <Button 
                onClick={() => {
                  enableDemoMode();
                  window.location.reload();
                }} 
                variant="secondary" 
                className="w-full"
              >
                Enable Demo Mode
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Demo Entry Points</CardTitle>
            <CardDescription>One-click access for shareholder demo</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <a href="/pos/kiosk">
                <span className="text-2xl">🛒</span>
                <span>Cashier POS</span>
              </a>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <a href="/warehouse/kiosk">
                <span className="text-2xl">📦</span>
                <span>Warehouse</span>
              </a>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <a href="/admin/kiosk">
                <span className="text-2xl">⚙️</span>
                <span>Admin</span>
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
