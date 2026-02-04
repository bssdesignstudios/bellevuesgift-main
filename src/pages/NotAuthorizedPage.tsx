import { Button } from '@/components/ui/button';
import { ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotAuthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-4">
        <ShieldX className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Not Authorized</h1>
        <p className="text-muted-foreground mb-6">
          You don't have permission to access the Admin Dashboard. 
          Only administrators and warehouse managers can access this area.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link to="/pos">Go to POS</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">Back to Store</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
