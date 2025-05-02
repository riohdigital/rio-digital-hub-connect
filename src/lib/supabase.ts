
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
  google_email?: string;
  agent_access?: boolean;
  whatsapp_jid?: string; // Adicionando esta propriedade que existe na tabela profiles
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

// --- Funções auxiliares para a administração ---

// Função para obter todos os perfis de usuário (para administradores)
export const getAllUserProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar todos os perfis:', error);
    throw error;
  }

  return data || [];
};

// Função para atualizar o perfil de um usuário específico (para administradores)
export const updateUserProfile = async (
  userId: string, 
  updates: Partial<Profile>
): Promise<Profile> => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar perfil:', error);
    throw error;
  }

  return data;
};

// Função para verificar se um usuário é administrador
export const isUserAdmin = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erro ao verificar função de administrador:', error);
      return false;
    }

    return data?.role === 'admin';
  } catch (error) {
    console.error('Erro ao verificar função de administrador:', error);
    return false;
  }
};

// Função para obter os assistentes disponíveis
export const getAvailableAssistants = async (): Promise<Assistant[]> => {
  // No futuro, você pode buscar isso do Supabase
  // Por enquanto, retornamos os assistentes hardcoded
  return [
    {
      id: "1",
      name: "Resultados Esportivos Oficiais",
      description: "Obtenha os resultados mais atualizados de partidas esportivas em tempo real.",
      icon: "🏆",
      type: "assistente_de_resultados_esportivos",
    },
    {
      id: "2",
      name: "DigiRioh",
      description: "Assistente digital para otimização de processos e tomada de decisão.",
      icon: "⚙️",
      type: "digirioh",
    },
    {
      id: "3",
      name: "Agente do Booking",
      description: "Otimize suas reservas e maximize sua ocupação com nosso assistente especializado.",
      icon: "🏨",
      type: "agente_do_booking",
    },
    {
      id: "4",
      name: "Agente de Airbnb",
      description: "Maximize o potencial de seus imóveis no Airbnb com recomendações personalizadas.",
      icon: "🏠",
      type: "agente_de_airbnb",
    }
  ];
};

// --- Fim das Interfaces ---

// Exporta tipos também se precisar deles em outros lugares
export type { User, Session };
