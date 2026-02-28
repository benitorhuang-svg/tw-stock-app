// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

import svelte from '@astrojs/svelte';
import AstroPWA from '@vite-pwa/astro';

// GitHub Pages = static build (STATIC_BUILD=true)
// Local dev / production = SSR with Node adapter
const isStaticBuild = process.env.STATIC_BUILD === 'true';
const basePath = isStaticBuild ? '/tw-stock-app' : '';

// https://astro.build/config
export default defineConfig({
    // Static for GitHub Pages (pre-render all pages)
    // Server (SSR) for local dev / production
    output: isStaticBuild ? 'static' : 'server',

    // Always include adapter — Astro 5 requires it for prerender=false routes
    adapter: node({ mode: 'standalone' }),

    // GitHub Pages base path (repo name)
    ...(isStaticBuild && {
        base: '/tw-stock-app',
        site: 'https://benitorhuang-svg.github.io',
    }),

    server: {
        host: 'localhost',
        port: 3000,
    },

    vite: {
        plugins: [tailwindcss()],
        build: {
            // Chunk splitting: separate vendor from app code for better caching
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (id.includes('node_modules/sql.js')) return 'vendor-sqljs';
                        if (id.includes('node_modules/chartgpu')) return 'vendor-chart';
                        if (id.includes('node_modules/technicalindicators'))
                            return 'vendor-indicators';
                        if (id.includes('node_modules')) return 'vendor';
                    },
                },
                treeshake: {
                    moduleSideEffects: false,
                },
            },
            // Smaller output
            target: 'es2022',
            cssCodeSplit: true,
            minify: 'esbuild',
        },
        // Faster dev server
        optimizeDeps: {
            include: ['technicalindicators'],
        },
    },

    prefetch: {
        prefetchAll: false,
        defaultStrategy: 'hover',
    },

    integrations: [
        svelte(),
        AstroPWA({
            registerType: 'autoUpdate',
            workbox: {
                globDirectory: isStaticBuild ? 'dist/client' : 'dist/client',
                globPatterns: ['**/*.{js,css,html,ico,png,svg,json,db,wasm}'],
                maximumFileSizeToCacheInBytes: 300000000, // 300MB for parsing local db
                navigateFallback: basePath + '/index.html',
                navigateFallbackDenylist: [/^\/api/],
                runtimeCaching: [
                    {
                        urlPattern: /\/data\/.*\.(json|db|csv)/i,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'stock-data-cache',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                ],
            },
            manifest: {
                name: 'TW Stock Observer',
                short_name: 'TWStock',
                description: 'Professional Taiwanese Stock Market Observer',
                theme_color: '#0f172a',
                background_color: '#0f172a',
                display: 'standalone',
                orientation: 'portrait',
                start_url: basePath + '/',
                icons: [
                    {
                        src: 'icons/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: 'icons/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                ],
            },
        }),
    ],
});
