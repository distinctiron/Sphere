import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const session = await auth();

  // Redirect authenticated users to dashboard
  if (session) {
    redirect("/dashboard");
  }

  return (
    <AuthShell>
      <Suspense fallback={<p className="text-center font-hand text-[22px] text-pencil">Loading...</p>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}

