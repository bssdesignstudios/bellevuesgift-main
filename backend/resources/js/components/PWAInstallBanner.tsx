import { Monitor, X, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { isPOSDomain } from '@/lib/domain';

export function PWAInstallBanner() {
  const { canInstall, install, dismiss, showSafariHint } = usePWAInstall();

  // Only show install prompt on the POS domain
  if (!isPOSDomain()) return null;
  if (!canInstall && !showSafariHint) return null;

  // Safari: show manual instructions
  if (showSafariHint) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-xl bg-[#00005D] p-4 text-white shadow-2xl">
        <button onClick={dismiss} className="absolute right-3 top-3 text-white/60 hover:text-white">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3">
          <Share className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
          <div>
            <p className="font-semibold text-sm">Install Bellevue POS</p>
            <p className="mt-1 text-xs text-white/80">
              Tap the <strong>Share</strong> button in Safari, then select <strong>"Add to Dock"</strong> to install this app.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Chrome/Edge: show install button
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-xl bg-[#00005D] p-4 text-white shadow-2xl">
      <button onClick={dismiss} className="absolute right-3 top-3 text-white/60 hover:text-white">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-3">
        <Monitor className="h-6 w-6 shrink-0 text-blue-300" />
        <div className="flex-1">
          <p className="font-semibold text-sm">Install Bellevue POS</p>
          <p className="text-xs text-white/80">Get quick access from your desktop</p>
        </div>
        <Button
          onClick={install}
          size="sm"
          className="bg-white text-[#00005D] hover:bg-white/90 font-semibold"
        >
          Install
        </Button>
      </div>
    </div>
  );
}
