// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
    output: 'server',
    adapter: node({
        mode: 'standalone',
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
        prefetchAll: false,     // Don't prefetch all links — only data-astro-prefetch
        defaultStrategy: 'hover', // Prefetch on hover for faster perceived nav
    },
});
