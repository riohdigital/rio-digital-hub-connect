import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080, // Sua porta atual
    proxy: {
      // Qualquer requisição para /n8n-api será redirecionada
      '/n8n-api': { 
        target: 'https://agentes-rioh-digital-n8n.sobntt.easypanel.host', // SUA URL BASE REAL N8N
        changeOrigin: true, // Necessário para hosts virtuais
        rewrite: (path) => path.replace(/^\/n8n-api/, ''), // Remove /n8n-api antes de enviar para o N8N
        // Opcional: log para depuração
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[VITE PROXY] Enviando requisição para o N8N:', proxyReq.method, proxyReq.path);
          });
           proxy.on('error', (err, _req, _res) => {
             console.error('[VITE PROXY] Erro no proxy:', err);
           });
        },
      },
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
