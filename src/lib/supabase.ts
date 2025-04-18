
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// Note: You'll need to update these with your actual Supabase credentials after connecting to Supabase
export const supabaseUrl = 'YOUR_SUPABASE_URL';
export const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);

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
