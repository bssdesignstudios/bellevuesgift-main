import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import bellevueLogo from '@/assets/bellevue-logo.webp';
import { Delete, Monitor, DollarSign, ArrowLeft } from 'lucide-react';

interface RegisterData {
  id: string;
  name: string;
  location: string;
}

interface StaffData {
  id: number;
  staff_uuid: string;
  name: string;
  role: string;
}

type Step = 'pin' | 'register';

export default function PosLoginPage() {
  const [step, setStep] = useState<Step>('pin');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Register selection state
  const [staff, setStaff] = useState<StaffData | null>(null);
  const [registers, setRegisters] = useState<RegisterData[]>([]);
  const [selectedRegister, setSelectedRegister] = useState<string>('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingSession, setOpeningSession] = useState(false);

  const handlePinSubmit = useCallback(async (fullPin: string) => {
    setLoading(true);
    setError('');

    try {
      const { data } = await axios.post('/pos/pin-login', { pin: fullPin });
      setStaff(data.staff);
      toast.success(`Welcome, ${data.staff.name}!`);

      // Fetch available registers for this user
      const regResponse = await axios.get('/api/pos/registers');
      const availableRegisters = regResponse.data as RegisterData[];
      setRegisters(availableRegisters);

      if (availableRegisters.length === 1) {
        setSelectedRegister(availableRegisters[0].id);
      }

      setStep('register');
      setLoading(false);
    } catch (err: any) {
      const msg = err?.response?.data?.errors?.pin?.[0]
        ?? err?.response?.data?.message
        ?? 'Invalid PIN';
      setError(msg);
      setPin('');
      setLoading(false);
    }
  }, []);

  const handleDigit = (digit: string) => {
    if (loading) return;
    setError('');
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4) {
      handlePinSubmit(newPin);
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    setPin(p => p.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    if (loading) return;
    setPin('');
    setError('');
  };

  const handleOpenSession = async () => {
    if (!selectedRegister || !staff) return;

    // Find if the selected register already has an active session
    const register = registers.find(r => r.id === selectedRegister);
    const activeSession = (register as any)?.current_session;

    // If no active session, we MUST have an opening balance
    if (!activeSession && !openingBalance) {
      toast.error('Please enter an opening cash amount');
      return;
    }

    setOpeningSession(true);
    try {
      if (activeSession) {
        // JOIN existing session
        await axios.post('/api/pos/session/join', {
          session_id: activeSession.id,
          staff_id: staff.staff_uuid,
        });
        toast.success('Joined active register session');
      } else {
        // OPEN new session
        await axios.post('/api/pos/session', {
          register_id: selectedRegister,
          staff_id: staff.staff_uuid,
          opening_balance: parseFloat(openingBalance),
        });
        toast.success('Register session opened');
      }

      // Store active register in localStorage for POSPage
      localStorage.setItem('bellevue_active_register', JSON.stringify({
        registerId: selectedRegister,
        registerName: register?.name || '',
      }));

      window.location.href = '/pos';
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to initialize register session';
      toast.error(msg);
      setOpeningSession(false);
    }
  };

  const handleBackToPin = () => {
    setStep('pin');
    setPin('');
    setError('');
    setStaff(null);
    setSelectedRegister('');
    setOpeningBalance('');
    // Logout current session
    axios.post('/staff/logout').catch(() => {});
  };

  if (step === 'register') {
    const selectedRegData = registers.find(r => r.id === selectedRegister);
    const hasActiveSession = !!(selectedRegData as any)?.current_session;

    return (
      <div className="min-h-screen bg-[#00005D] flex flex-col items-center justify-center p-4">
        <div className="mb-8">
          <img src={bellevueLogo} alt="Bellevue" className="h-14 brightness-0 invert" />
        </div>

        <h1 className="text-white text-2xl font-semibold mb-1">
          {hasActiveSession ? 'Join Register' : 'Open Register'}
        </h1>
        <p className="text-white/60 text-sm mb-8">
          {staff?.name} — {hasActiveSession ? 'this register is active' : 'enter opening cash to start'}
        </p>

        <div className="w-full max-w-sm space-y-4">
          {/* Register Selection */}
          <div className="space-y-2">
            {registers.length === 0 ? (
              <div className="bg-white/10 rounded-xl p-6 text-center">
                <p className="text-white/70 text-sm">No registers assigned to you.</p>
                <p className="text-white/50 text-xs mt-1">Contact an admin to be assigned a register.</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {registers.map((reg) => {
                  const isActive = !!(reg as any).current_session;
                  return (
                    <button
                      key={reg.id}
                      onClick={() => setSelectedRegister(reg.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl transition-all relative ${
                        selectedRegister === reg.id
                          ? 'bg-white text-[#00005D]'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <Monitor className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium flex items-center gap-2">
                          {reg.name}
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} title={isActive ? 'Session Active' : 'Session Closed'} />
                        </div>
                        <div className={`text-xs ${selectedRegister === reg.id ? 'text-[#00005D]/60' : 'text-white/50'}`}>
                          {reg.location} {isActive && '• Active'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Opening Cash Amount - ONLY if register is NOT active */}
          {selectedRegister && !hasActiveSession && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-white/80 text-sm font-medium">Opening Cash Amount</label>
                <span className="text-white/40 text-[10px] uppercase tracking-wider">Start of Day</span>
              </div>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-lg font-mono placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Info Card - if register IS active */}
          {selectedRegister && hasActiveSession && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-white/60 text-xs">
                Register session started at {new Date((selectedRegData as any).current_session.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-white/40 text-[10px] mt-1 italic">
                You are joining the current active drawer.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleBackToPin}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={handleOpenSession}
              disabled={!selectedRegister || (!hasActiveSession && !openingBalance) || openingSession}
              className="flex-1 py-3 rounded-xl bg-white text-[#00005D] font-semibold hover:bg-white/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wide text-sm"
            >
              {openingSession 
                ? 'Processing...' 
                : (hasActiveSession ? 'Join active Register' : 'Open Register Session')
              }
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#00005D] flex flex-col items-center justify-center p-4">
      <div className="mb-8">
        <img src={bellevueLogo} alt="Bellevue" className="h-14 brightness-0 invert" />
      </div>

      <h1 className="text-white text-2xl font-semibold mb-2">POS Terminal</h1>
      <p className="text-white/60 text-sm mb-8">Enter your 4-digit PIN to start</p>

      <div className="flex gap-4 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-150 ${
              i < pin.length
                ? 'bg-white scale-110'
                : 'bg-white/20 border border-white/30'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-sm mb-4 animate-pulse">{error}</p>
      )}

      {loading && (
        <p className="text-white/60 text-sm mb-4">Signing in...</p>
      )}

      <div className="grid grid-cols-3 gap-3 max-w-[280px]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            onClick={() => handleDigit(digit)}
            disabled={loading || pin.length >= 4}
            className="w-20 h-20 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-2xl font-medium transition-all duration-100 disabled:opacity-40 select-none"
          >
            {digit}
          </button>
        ))}
        <button
          onClick={handleClear}
          disabled={loading}
          className="w-20 h-20 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 text-xs font-medium transition-all select-none"
        >
          Clear
        </button>
        <button
          onClick={() => handleDigit('0')}
          disabled={loading || pin.length >= 4}
          className="w-20 h-20 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-2xl font-medium transition-all duration-100 disabled:opacity-40 select-none"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          disabled={loading}
          className="w-20 h-20 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 transition-all flex items-center justify-center select-none"
        >
          <Delete className="h-6 w-6" />
        </button>
      </div>

      <p className="text-white/30 text-xs mt-10">
        Bellevue Gifts &amp; Supplies — Freeport, Grand Bahama
      </p>
    </div>
  );
}
