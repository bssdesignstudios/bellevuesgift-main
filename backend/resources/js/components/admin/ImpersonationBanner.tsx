import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, XCircle } from "lucide-react";

export function ImpersonationBanner() {
  const { impersonating, staff, impersonate } = useAuth();

  if (!impersonating) return null;

  return (
    <div className="bg-amber-500 text-black px-4 py-2 flex items-center justify-between sticky top-0 z-50 shadow-md">
      <div className="flex items-center gap-2 font-medium">
        <AlertCircle className="h-5 w-5" />
        <span>
          Currently impersonating <strong>{staff?.name}</strong> ({staff?.role})
        </span>
      </div>
      <Button 
        variant="destructive" 
        size="sm" 
        className="bg-black text-white hover:bg-black/80"
        onClick={() => impersonate(null)}
      >
        <XCircle className="h-4 w-4 mr-2" />
        Stop Impersonation
      </Button>
    </div>
  );
}
