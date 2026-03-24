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

        {step === 'select' ? (
          <div className="grid gap-3">
            {registers.map((register) => (
              <Card
                key={register.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleRegisterClick(register)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Monitor className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold">{register.name}</div>
                      <div className="text-sm text-muted-foreground">{register.location}</div>
                    </div>
                  </div>
                  {register.current_session ? (
                    <div className="text-right">
                      <div className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full mb-1">
                        Open Session
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Joined: {register.current_session.staff?.name}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-semibold px-2 py-1 bg-muted text-muted-foreground rounded-full">
                      Ready to Open
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center text-muted-foreground font-medium">
              Opening Register: {registers.find(r => r.id === selectedRegister)?.name}
            </div>
            <div className="space-y-2">
              <Label htmlFor="opening-balance">Opening Cash Balance</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="opening-balance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="pl-9 text-lg"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Count the cash in the drawer and enter the total amount
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'balance' && (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              Back
            </Button>
          )}
          {step === 'balance' && (
            <Button onClick={handleConfirm} className="flex-1">
              Open Register
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
