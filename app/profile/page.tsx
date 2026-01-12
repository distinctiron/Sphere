import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <div className="container mx-auto p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Profile</h1>
        <p className="text-muted-foreground">View your account information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Your account details and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Email Address
            </label>
            <p className="text-base font-medium mt-1">{user.email}</p>
          </div>

          {user.name && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Name
              </label>
              <p className="text-base font-medium mt-1">{user.name}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Account Created
            </label>
            <p className="text-base font-medium mt-1">{createdAt}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

