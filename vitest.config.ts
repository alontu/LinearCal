import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        // Default to node; component tests opt into jsdom via a
        // `// @vitest-environment jsdom` comment at the top of the file.
        environment: 'node',
        globals: true,
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
