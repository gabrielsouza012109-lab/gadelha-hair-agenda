import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "A variável VITE_SUPABASE_URL não foi encontrada. Crie um arquivo .env na raiz do projeto.",
  );
}

if (!supabaseKey) {
  throw new Error(
    "A variável VITE_SUPABASE_PUBLISHABLE_KEY não foi encontrada. Crie um arquivo .env na raiz do projeto.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);