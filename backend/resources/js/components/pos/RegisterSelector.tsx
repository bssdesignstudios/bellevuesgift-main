import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Monitor, DollarSign } from 'lucide-react';

interface Register {
  id: string;
  name: string;
  location: string;
  current_session?: {
    id: string;
    staff?: {
      name: string;
    };
  } | null;
}

interface RegisterSelectorProps {
  open: boolean;
  registers: Register[];
  onSelect: (registerId: string, openingBalance: number) => void;
  onJoin: (sessionId: string) => void;
  onClose: () => void;
}

export function RegisterSelector({ open, registers, onSelect, onJoin, onClose }: RegisterSelectorProps) {
  const [selectedRegister, setSelectedRegister] = useState<string | null>(null);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [step, setStep] = useState<'select' | 'balance'>('select');

  const handleRegisterClick = (register: Register) => {
    if (register.current_session) {
      onJoin(register.current_session.id);
    } else {
      setSelectedRegister(register.id);
      setStep('balance');
    }
  };

  const handleConfirm = () => {
    if (selectedRegister) {
      onSelect(selectedRegister, parseFloat(openingBalance) || 0);
      setStep('select');
      setSelectedRegister(null);
      setOpeningBalance('0');
    }
  };

  const handleBack = () => {
    setStep('select');
    setSelectedRegister(null);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {step === 'select' ? 'Select Register' : 'Enter Opening Balance'}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <div className="grid gap-3 py-4">
            {registers.map((register) => (
              <Card
                key={register.id}
                className={`cursor-pointer transition-all hover:border-primary ${selectedRegister === register.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : ''}`}
                onClick={() => handleRegisterClick(register)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${selectedRegister === register.id ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                      <Monitor className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        {register.name}
                        <span className={`h-2 w-2 rounded-full ${register.current_session ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        {!register.current_session && <span className="text-[10px] text-red-500/70 font-bold uppercase ml-1">Offline</span>}
                      </div>
                      <div className="text-sm text-muted-foreground">{register.location}</div>
                    </div>
                  </div>
                  {register.current_session && (
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Cashier: {register.current_session.staff?.name}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {step === 'balance' && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Confirming Register</div>
              <div className="text-lg font-bold">{registers.find(r => r.id === selectedRegister)?.name}</div>
            </div>
            <div className="space-y-3">
              <Label htmlFor="opening-balance" className="text-xs font-bold uppercase text-muted-foreground">Opening Cash Float</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="opening-balance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="pl-10 h-14 text-2xl font-bold bg-muted/50 border-0 focus-visible:ring-primary"
                  autoFocus
                />
              </div>
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Open the cash drawer and count the physical cash today. Enter the total amount to start your session.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex sm:justify-between gap-2 mt-2">
          {step === 'balance' ? (
            <>
              <Button variant="ghost" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button onClick={handleConfirm} className="flex-1 shadow-lg shadow-primary/20">
                Open Register
              </Button>
            </>
          ) : (
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={onClose}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

  );
}
