// src/lib/supabase.ts (Exemplo - ajuste se seu arquivo for diferente)

import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js'

// --- Interfaces (Mantenha ou importe de onde estiverem) ---
export interface Profile {
  id: string; // UUID from auth.users
  updated_at?: string;
  full_name?: string;
  avatar_url?: string;
  // Adicione outros campos do seu perfil aqui
  role?: string; 
  plan?: string;
}

export interface UserPlan {
  id: string; // UUID da tabela user_plans
  user_id: string; // Foreign key to auth.users.id
  plan_name: string; // Ex: 'free', 'assistente_resultados', etc.
  created_at?: string;
  updated_at?: string;
  expires_at: string; // Ou Date, dependendo de como você usa
}

// Interface para Assistentes (se definida aqui)
export interface Assistant {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: string; // Identificador único (usado na URL e user_plans.plan_name)
  webhook_url?: string; // URL do webhook N8N (Opcional, pode ser buscada de outra forma)
}
// --- Fim das Interfaces ---


// --- Inicialização do Cliente com Logs ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log ESSENCIAL para verificar se as variáveis foram carregadas do .env
console.log('[Supabase Client Init] VITE_SUPABASE_URL:', supabaseUrl ? supabaseUrl : '!!! VAZIA/NÃO DEFINIDA !!!');
console.log('[Supabase Client Init] VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '******' : '!!! VAZIA/NÃO DEFINIDA !!!');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("ERRO CRÍTICO: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não estão definidas. Verifique seu arquivo .env e reinicie o servidor Vite.");
  // Lançar um erro pode ser apropriado aqui para parar a aplicação se as chaves faltarem
  // throw new Error("Configuração do Supabase incompleta.");
}

// Cria o cliente
export const supabase: SupabaseClient = createClient(supabaseUrl!, supabaseAnonKey!);

// Log para confirmar a criação do objeto cliente
console.log('[Supabase Client Init] Objeto Supabase foi criado:', supabase ? 'Sim' : 'Não');

// Exporta tipos também se precisar deles em outros lugares
export type { User, Session, Profile, UserPlan, Assistant }; 
