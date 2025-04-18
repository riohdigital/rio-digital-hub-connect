import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// Remova ou mantenha o lovable-tagger conforme sua necessidade
// import { componentTagger } from "lovable-tagger"; 

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Seção proxy removida
  },
  plugins: [
    react(),
    // Adicione o lovable-tagger de volta se necessário
    // mode === 'development' && componentTagger(), 
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
