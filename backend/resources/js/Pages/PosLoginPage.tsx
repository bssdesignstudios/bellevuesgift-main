import { useState, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import bellevueLogo from '@/assets/bellevue-logo.webp';
import { Delete } from 'lucide-react';

export default function PosLoginPage() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const csrfToken = () => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') ?? '' : '';
  };

  const handlePinSubmit = useCallback(async (fullPin: string) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/pos/pin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken(),
          Accept: 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ pin: fullPin }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.errors?.pin?.[0] ?? body?.message ?? 'Invalid PIN';
        setError(msg);
        setPin('');
        setLoading(false);
        return;
      }

      const data = await res.json();
      toast.success(`Welcome, ${data.staff.name}!`);
      router.visit('/pos');
    } catch {
      setError('Connection error. Please try again.');
      setPin('');
      setLoading(false);
    }
  }, []);

  const handleDigit = (digit: string) => {
    if (loading) return;
    setError('');
    const newPin = pin + digit;
    setPin(newPin);

    // Auto-submit when 4 digits entered
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

  return (
    <div className="min-h-screen bg-[#00005D] flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8">
        <img src={bellevueLogo} alt="Bellevue" className="h-14 brightness-0 invert" />
      </div>

      {/* Title */}
      <h1 className="text-white text-2xl font-semibold mb-2">POS Terminal</h1>
      <p className="text-white/60 text-sm mb-8">Enter your 4-digit PIN to start</p>

      {/* PIN dots */}
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

      {/* Error message */}
      {error && (
        <p className="text-red-400 text-sm mb-4 animate-pulse">{error}</p>
      )}

      {/* Loading indicator */}
      {loading && (
        <p className="text-white/60 text-sm mb-4">Signing in...</p>
      )}

      {/* Number pad */}
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
        {/* Bottom row: Clear, 0, Backspace */}
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

      {/* Footer */}
      <p className="text-white/30 text-xs mt-10">
        Bellevue Gifts &amp; Supplies — Freeport, Grand Bahama
      </p>
    </div>
  );
}
