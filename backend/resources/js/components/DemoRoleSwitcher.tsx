import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronDown } from 'lucide-react';
import { getDemoSession, setDemoSession, DemoRole, isDemoModeEnabled } from '@/lib/demoSession';

const ROLE_LABELS: Record<DemoRole, string> = {
  admin: 'Admin',
  warehouse: 'Warehouse Manager',
  cashier: 'Cashier',
};

const ROLE_COLORS: Record<DemoRole, string> = {
  admin: 'bg-primary text-primary-foreground',
  warehouse: 'bg-amber-500 text-white',
  cashier: 'bg-emerald-500 text-white',
};

export function DemoRoleSwitcher() {
  const session = getDemoSession();
  const [currentRole, setCurrentRole] = useState<DemoRole | null>(session?.role || null);

  // Only show if demo mode is enabled
  if (!isDemoModeEnabled() || !session?.enabled) {
    return null;
  }

  const handleRoleSwitch = (newRole: DemoRole) => {
    setDemoSession(newRole);
    setCurrentRole(newRole);

    router.visit(newRole === 'cashier' ? '/pos' : '/admin');
  };

  return (
    <div className="fixed top-2 right-2 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 bg-background/95 backdrop-blur shadow-lg border-2">
            <Badge className={ROLE_COLORS[currentRole || 'admin']}>
              DEMO
            </Badge>
            <Users className="h-4 w-4" />
            <span className="font-medium">{ROLE_LABELS[currentRole || 'admin']}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {(Object.keys(ROLE_LABELS) as DemoRole[]).map((role) => (
            <DropdownMenuItem
              key={role}
              onClick={() => handleRoleSwitch(role)}
              className={currentRole === role ? 'bg-accent' : ''}
            >
              <Badge className={`mr-2 ${ROLE_COLORS[role]}`} variant="secondary">
                {role.charAt(0).toUpperCase()}
              </Badge>
              {ROLE_LABELS[role]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
