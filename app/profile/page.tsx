import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SketchCard } from "@/components/sketch";
import { AppHeader } from "@/components/sketch/app-header";
import { PageTitle } from "@/components/payment/sketch-marks";
import { PaymentPage } from "@/components/payment/payment-page";

export default async function ProfilePage() {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login?callbackUrl=/profile");
  }

  // Use email to look up user (email is always available in session)
  const userEmail = session.user.email;
  if (!userEmail) {
    redirect("/login");
  }

  // Fetch user data from database using email
  const user = await db.user.findUnique({
    where: { email: userEmail },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    // User not found (shouldn't happen, but handle gracefully)
    redirect("/login");
  }

  // Format dates
  const createdAt = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-6 pb-16 pt-6">
      <AppHeader />

      <PageTitle title="Account" subtitle="Manage your account and payment settings" />

      <PaymentPage
        accountCard={
        <SketchCard seed="account-info" w={590} h={330} hover wedge as="section" aria-labelledby="acct-h" wrapClassName="h-full" className="h-full px-7 pb-7 pt-[26px]">
          <h2 id="acct-h" className="m-0 font-hand text-[34px] font-bold leading-none">Account Information</h2>
          <p className="sk-muted mb-5 mt-1 text-sm">Your account details and settings</p>
          <dl className="m-0 grid gap-3.5">
            <div>
              <dt className="sk-muted font-hand text-xl font-bold leading-none">Email Address</dt>
              <dd className="mt-0.5 text-base">{user.email}</dd>
            </div>

            {user.name && (
              <div>
                <dt className="sk-muted font-hand text-xl font-bold leading-none">Name</dt>
                <dd className="mt-0.5 text-base">{user.name}</dd>
              </div>
            )}

            <div>
              <dt className="sk-muted font-hand text-xl font-bold leading-none">Account Created</dt>
              <dd className="mt-0.5 text-base">{createdAt}</dd>
            </div>
          </dl>
        </SketchCard>
        }
      />
    </div>
  );
}
