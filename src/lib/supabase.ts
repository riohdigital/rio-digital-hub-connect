
import { createClient } from '@supabase/supabase-js';
import { supabase as configuredSupabase } from '@/integrations/supabase/client';

// Use o cliente supabase da integração configurada
export const supabase = configuredSupabase;

export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  updated_at?: string;
  created_at?: string;
}

export interface UserPlan {
  id: string;
  user_id: string;
  plan_name: string;
  expires_at: string;
  status?: string;
}

export interface Assistant {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: string;
  webhook_url?: string;
}
