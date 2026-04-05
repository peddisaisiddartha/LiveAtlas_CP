import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://afbuvjoemgjmptxzltsm.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmYnV2am9lbWdqbXB0eHpsdHNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMzMwNDAsImV4cCI6MjA5MDcwOTA0MH0.PjLlY9hhu4PAN-CxWkAtXrlquK7GSu2_tXFs0OSrUMc";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);