
// src/integrations/supabase/client.ts - VERSÃO CORRIGIDA

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types'; // Mantenha se você usa tipos gerados

// Lê as variáveis do ambiente .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// --- Logs de Verificação ---
console.log('[Supabase Client Init @ integrations] VITE_SUPABASE_URL:', supabaseUrl ? supabaseUrl : '!!! VAZIA/NÃO DEFINIDA !!!');
console.log('[Supabase Client Init @ integrations] VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '******' : '!!! VAZIA/NÃO DEFINIDA !!!');

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = "ERRO CRÍTICO: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não estão definidas. Verifique as Variáveis de Ambiente no ambiente de deploy/preview (Lovable) ou seu arquivo .env local e reinicie.";
  console.error(errorMsg);
  // Lança um erro para impedir a aplicação de continuar sem configuração
  throw new Error(errorMsg); 
}
// --- Fim dos Logs ---

// Cria e exporta o cliente usando as variáveis de ambiente e configurações explícitas
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: localStorage, // Especificar explicitamente o storage para evitar inconsistências
    detectSessionInUrl: true
  }
});

// Log de confirmação
console.log('[Supabase Client Init @ integrations] Cliente Supabase criado com configurações explícitas de auth'); 
