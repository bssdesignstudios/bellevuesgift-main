import './bootstrap';
import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { CustomerAuthProvider } from './contexts/CustomerAuthContext';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PWAInstallBanner } from '@/components/PWAInstallBanner';

const queryClient = new QueryClient();

createInertiaApp({
    resolve: (name) => resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob('./Pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(
            <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                    <AuthProvider>
                        {/* <CustomerAuthProvider> */}
                            <CartProvider>
                                <App {...props} />
                                <Toaster position="top-center" richColors />
                                <PWAInstallBanner />
                            </CartProvider>
                        {/* </CustomerAuthProvider> */}
                    </AuthProvider>
                </TooltipProvider>
            </QueryClientProvider>
        );
    },
});

// PWA Service Worker registration — served at /sw.js with root scope
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .then((registration) => {
                // Check for updates every 60s
                setInterval(() => registration.update(), 60 * 1000);
            })
            .catch(() => {
                // SW registration failed — app still works, just no offline support
            });
    });
}