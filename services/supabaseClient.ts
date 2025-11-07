import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://slmkfqjpqrztkmuleerv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsbWtmcWpwcXJ6dGttdWxlZXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODczNTksImV4cCI6MjA3ODA2MzM1OX0.Z9Kgs85ZSu4O_mqa27fCHstvJULdGxRQDOAy-tJuKUQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
