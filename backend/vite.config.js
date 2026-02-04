import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
            includeManifestDefaults: false,
            manifest: false, // We serve our own manifest.json from public/
            excludeAssets: [/\.ico$/, /manifest\.json$/],
            workbox: {
                // Precache the offline fallback page (served by Laravel, not in Vite output)
                additionalManifestEntries: [
                    { url: '/offline', revision: null },
                    { url: '/manifest.json', revision: null },
                ],
                // Don't precache Inertia page responses — use runtime caching instead
                navigateFallback: '/offline',
                // Only use navigate fallback for pure page loads that aren't auth or API
                navigateFallbackAllowlist: [/^(?!\/api\/|\/staff\/|\/admin|\/pos).*$/],
                // Runtime caching strategies
                runtimeCaching: [
                    // POS API: products & categories — stale-while-revalidate so POS works offline
                    {
                        urlPattern: /\/api\/pos\/(products|categories)/,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'pos-api-cache',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
                            },
                        },
                    },
                    // All other API calls: network-first with 5s timeout, fall back to cache
                    {
                        urlPattern: /\/api\//,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            networkTimeoutSeconds: 5,
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 24 * 60 * 60, // 1 day
                            },
                        },
                    },
                    // Google Fonts
                    {
                        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.+/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 365 * 24 * 60 * 60,
                            },
                        },
                    },
                    // Supabase REST/storage — network-first
                    {
                        urlPattern: /supabase\.co/,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'supabase-cache',
                            networkTimeoutSeconds: 5,
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 60 * 60, // 1 hour
                            },
                        },
                    },
                ],
            },
            devOptions: {
                enabled: true,
                type: 'module',
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'resources/js'),
            'react': path.resolve(__dirname, 'node_modules/react'),
            'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        },
    },
});