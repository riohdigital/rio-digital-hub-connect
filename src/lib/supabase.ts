// src/lib/supabase.ts - VERSÃO ORIGINAL (CORRETA PARA ESTE SETUP)

import { createClient, User, Session } from '@supabase/supabase-js'; // Mantenha imports de tipos se usados aqui
// Importa a instância criada e configurada em client.ts
import { supabase as configuredSupabase } from '@/integrations/supabase/client'; 

// Use o cliente supabase da integração configurada
export const supabase = configuredSupabase;

// --- Interfaces (Mantenha ou mova para um arquivo de tipos dedicado) ---
export interface Profile {
  id: string; // UUID from auth.users
  updated_at?: string;
  full_name?: string;
  avatar_url?: string;
  role?: string; 
  plan?: string;
}

export interface UserPlan {
  id: string; // UUID da tabela user_plans
  user_id: string; // Foreign key to auth.users.id
  plan_name: string; 
  created_at?: string;
  updated_at?: string;
  expires_at: string; 
}

export interface Assistant {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: string; 
  webhook_url?: string;
}
// --- Fim das Interfaces ---

// Exporta tipos também se precisar deles em outros lugares
export type { User, Session }; 
