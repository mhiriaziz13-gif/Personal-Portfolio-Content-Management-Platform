export const dynamic = "force-dynamic";

import { ResetPasswordForm } from "@/components/admin/password-forms";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminResetPasswordPage() {
  let recoveryReady = false;

  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    recoveryReady = Boolean(data.user);
  } catch {
    recoveryReady = false;
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen px-6 py-28"
    >
      <ResetPasswordForm recoveryReady={recoveryReady} />
    </main>
  );
}
