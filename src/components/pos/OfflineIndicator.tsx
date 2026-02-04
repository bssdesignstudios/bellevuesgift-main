import { WifiOff, Wifi, RefreshCw, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface OfflineIndicatorProps {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onSync: () => void;
}

export function OfflineIndicator({ isOnline, pendingCount, isSyncing, onSync }: OfflineIndicatorProps) {
  if (isOnline && pendingCount === 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-emerald-400">
            <Cloud className="h-4 w-4" />
            <span className="text-xs">Connected</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>All transactions synced</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-amber-400 animate-pulse">
          <WifiOff className="h-4 w-4" />
          <span className="text-xs">Offline</span>
        </div>
        {pendingCount > 0 && (
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-300">
            {pendingCount} pending
          </Badge>
        )}
      </div>
    );
  }

  // Online but has pending transactions
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-blue-400">
        <Wifi className="h-4 w-4" />
        <span className="text-xs">Online</span>
      </div>
      <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
        {pendingCount} pending
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={onSync}
        disabled={isSyncing}
        className="h-6 px-2 text-blue-400 hover:text-blue-300"
      >
        <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
        <span className="ml-1 text-xs">Sync</span>
      </Button>
    </div>
  );
}
