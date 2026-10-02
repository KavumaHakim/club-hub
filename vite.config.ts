import path from 'path';
import fs from 'fs';
import { createHash } from 'crypto';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Stamps dist/sw.js with this build's id and the list of every file it emitted, so
 * the service worker saves the whole current build for offline use and each deploy
 * produces a new worker (see public/sw.js). Public files the worker shouldn't keep
 * (itself, robots.txt, sitemap.xml) are left out; source maps are skipped.
 */
const precacheServiceWorker = (): Plugin => {
    let outDir = 'dist';
    let publicDir = 'public';
    let emitted: string[] = [];
    return {
        name: 'clubhub-precache-sw',
        apply: 'build',
        configResolved(config) {
            outDir = path.resolve(config.root, config.build.outDir);
            publicDir = config.publicDir;
        },
        generateBundle(_options, bundle) {
            emitted = Object.keys(bundle).filter(file => !file.endsWith('.map'));
        },
        closeBundle() {
            const swPath = path.join(outDir, 'sw.js');
            if (!fs.existsSync(swPath)) return;
            const skip = new Set(['sw.js', 'robots.txt', 'sitemap.xml']);
            const publicFiles = fs.existsSync(publicDir)
                ? fs.readdirSync(publicDir).filter(file => !skip.has(file) && fs.statSync(path.join(publicDir, file)).isFile())
                : [];
            const urls = Array.from(new Set(['/', ...emitted, ...publicFiles].map(file => (file.startsWith('/') ? file : '/' + file)))).sort();
            const indexHtml = fs.existsSync(path.join(outDir, 'index.html')) ? fs.readFileSync(path.join(outDir, 'index.html'), 'utf8') : '';
            const buildId = createHash('sha256').update(urls.join('\n') + indexHtml).digest('hex').slice(0, 12);

            const source = fs.readFileSync(swPath, 'utf8');
            const stamped = source
                .replace("const BUILD_ID = 'dev';", `const BUILD_ID = '${buildId}';`)
                .replace('self.__PRECACHE_MANIFEST__ || []', JSON.stringify(urls));
            if (stamped === source) throw new Error('precacheServiceWorker: placeholders not found in sw.js');
            fs.writeFileSync(swPath, stamped);
            this.info?.(`sw.js stamped: build ${buildId}, ${urls.length} files to precache`);
        },
    };
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), precacheServiceWorker()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
