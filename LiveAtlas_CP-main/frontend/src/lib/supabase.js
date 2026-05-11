import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://afbuvjoemgjmptxzltsm.supabase.co';

const supabaseAnonKey = sb_publishable_lk6YI9eml6ewFsE9tRYY0g_hOkg-mXu

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);