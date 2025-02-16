
import { supabase } from "@/integrations/supabase/client";

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  // Include full_name in the signup metadata
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}
