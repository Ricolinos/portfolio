import "server-only";
import { createClient } from "@supabase/supabase-js";
import { PORTFOLIO_MEDIA_BUCKET } from "@/lib/storageConfig";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY para Supabase Storage (ver .env.example).",
  );
}

// Cliente ADMIN de Supabase: SUPABASE_SECRET_KEY salta Row Level Security
// por completo. El guard "server-only" de arriba rompe el build si algún
// componente cliente llega a importar este módulo (transitivamente):
// autorización real vive en Clerk (auth() en la server action que use este
// cliente), NUNCA en políticas RLS de Supabase — los usuarios de la
// plataforma no tienen JWT de Supabase, así que RLS por auth.uid() no
// aplica aquí (ver actions/media.ts, createSignedUpload).
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export { PORTFOLIO_MEDIA_BUCKET };
