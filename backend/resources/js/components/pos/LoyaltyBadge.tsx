import { Star, Crown, Building2, GraduationCap, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface LoyaltyBadgeProps {
  tier: string;
  points?: number;
  discount?: number;
  isFavorite?: boolean;
  size?: 'sm' | 'md';
}

const TIER_CONFIG = {
  retail: {
    label: 'Retail',
    icon: User,
    color: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  },
  school: {
    label: 'School',
    icon: GraduationCap,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
  corporate: {
    label: 'Corporate',
    icon: Building2,
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  },
  vip: {
    label: 'VIP',
    icon: Crown,
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  },
};

export function LoyaltyBadge({ tier, points, discount, isFavorite, size = 'md' }: LoyaltyBadgeProps) {
  const config = TIER_CONFIG[tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.retail;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      {isFavorite && (
        <Tooltip>
          <TooltipTrigger>
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          </TooltipTrigger>
          <TooltipContent>Favorite Customer</TooltipContent>
        </Tooltip>
      )}
      
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className={`${config.color} ${size === 'sm' ? 'text-xs px-1.5 py-0' : ''}`}>
            <Icon className={`${size === 'sm' ? 'h-3 w-3 mr-0.5' : 'h-3.5 w-3.5 mr-1'}`} />
            {config.label}
            {discount && discount > 0 && (
              <span className="ml-1">({discount}% off)</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{config.label} Customer</p>
            {points !== undefined && <p>Loyalty Points: {points.toLocaleString()}</p>}
            {discount !== undefined && discount > 0 && <p>Tier Discount: {discount}%</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
