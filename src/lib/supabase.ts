import { createClient } from '@supabase/supabase-js';

// AI-DEV: Centralized Supabase client configuration
// <scratchpad>Environment variables will be loaded from .env.local</scratchpad>

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);