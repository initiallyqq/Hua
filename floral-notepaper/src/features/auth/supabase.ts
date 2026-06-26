import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://eqqclrtjlrusrgmhnspx.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxcWNscnRqbHJ1c3JnbWhuc3B4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NDE4NTQsImV4cCI6MjA5ODAxNzg1NH0.WrWiKrico5TusHIlkDRj2xrlfQcUcfnTLYz6_JaFalw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
