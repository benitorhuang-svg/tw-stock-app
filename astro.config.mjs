// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages = static build (STATIC_BUILD=true)
// Local dev / production = SSR with Node adapter
const isStaticBuild = process.env.STATIC_BUILD === 'true';

// https://astro.build/config
export default defineConfig({
    // Static for GitHub Pages (pre-render all pages)
    // Server (SSR) for local dev / production
    output: isStaticBuild ? 'static' : 'server',
    ...(!isStaticBuild && {
        adapter: node({ mode: 'standalone' }),
    }),
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
                        if (id.includes('node_modules/technicalindicators')) return 'vendor-indicators';
                        if (id.includes('node_modules')) return 'vendor';
                    },
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
});
