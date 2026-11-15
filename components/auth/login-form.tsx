"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AuthCard, AuthNotice, HandLink, OAuthButton, OrDivider, penMessage } from "@/components/auth/auth-shell";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for registration, password reset, or OAuth error messages
  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      // Registration was successful, user can now log in
      // We can optionally show a success message here if needed
    }
    if (searchParams.get("reset") === "success") {
      // Password reset was successful
      // We'll show a success message in the form
    }
    // Handle OAuth errors
    const oauthError = searchParams.get("error");
    if (oauthError) {
      let errorMessage = "Authentication failed. Please try again.";
      if (oauthError === "OAuthSignin") {
        errorMessage = "Error initiating OAuth sign-in. Please try again.";
      } else if (oauthError === "OAuthCallback") {
        errorMessage = "Error processing OAuth callback. Please try again.";
      } else if (oauthError === "OAuthCreateAccount") {
        errorMessage = "Could not create account. Please try again.";
      } else if (oauthError === "EmailCreateAccount") {
        errorMessage = "Could not create account with this email. Please try again.";
      } else if (oauthError === "Callback") {
        errorMessage = "Error in OAuth callback. Please try again.";
      } else if (oauthError === "OAuthAccountNotLinked") {
        errorMessage = "This account is already linked to another email. Please sign in with your original method.";
      } else if (oauthError === "EmailSignin") {
        errorMessage = "Error sending email. Please try again.";
      } else if (oauthError === "CredentialsSignin") {
        errorMessage = "Invalid credentials. Please check your email and password.";
      } else if (oauthError === "SessionRequired") {
        errorMessage = "Please sign in to access this page.";
      }
      setError(errorMessage);
    }
  }, [searchParams]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    setError(null);

    try {
      // Get the callback URL (where user wanted to go originally)
      const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false, // Handle redirect manually to show errors
      });

      if (result?.error) {
        // Generic error message (doesn't reveal whether email exists or password is wrong)
        setError("Invalid email or password");
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        // Successfully logged in, trigger arXiv fetch (async, don't wait)
        fetch("/api/arxiv/fetch", {
          method: "POST",
        }).catch((err) => {
          // Silently handle errors - fetch happens in background
          console.error("Background arXiv fetch failed:", err);
        });

        // Redirect to dashboard or intended destination
        router.push(callbackUrl);
        router.refresh(); // Refresh to update session state
      } else {
        // Handle case where result is neither error nor ok
        setError("Invalid email or password");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  const oauth = (provider: "google" | "apple" | "facebook", name: string) => async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn(provider, { callbackUrl: "/dashboard", redirect: true });
    } catch (err) {
      setError(`Failed to initiate ${name} sign-in. Please try again.`);
      setIsLoading(false);
    }
  };

  return (
    <>
      {searchParams.get("reset") === "success" && (
        <AuthNotice tone="success" seed="login-reset-note">
          Password reset successful. Please log in with your new password.
        </AuthNotice>
      )}
      <AuthCard
        seed="login-card"
        titleId="signin-h"
        title="Sign in"
        subtitle="Enter your email and password to access your account"
      >
        {error && (
          <AuthNotice tone="error" seed="login-error">
            {error}
          </AuthNotice>
        )}

        {/* OAuth Providers */}
        <div className="flex flex-col gap-3">
          <OAuthButton letter="G" label="Sign in with Google" seed="login-google" onClick={oauth("google", "Google")} disabled={isLoading} />
          <OAuthButton letter="A" label="Sign in with Apple" seed="login-apple" onClick={oauth("apple", "Apple")} disabled={isLoading} />
          <OAuthButton letter="F" label="Sign in with Facebook" seed="login-facebook" onClick={oauth("facebook", "Facebook")} disabled={isLoading} />
        </div>

        <OrDivider label="Or continue with email" seed="login-or" />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="mb-1 block">Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage className={penMessage} />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <FormLabel className="mb-1 block">Password</FormLabel>
                    <a href="/forgot-password" className="font-hand text-[20px]">
                      Forgot password?
                    </a>
                  </div>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage className={penMessage} />
                </FormItem>
              )}
            />

            <Button type="submit" className="mt-1 w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Form>

        <p className="m-0 mt-1 text-center">
          Don&apos;t have an account? <HandLink href="/register">Sign up</HandLink>
        </p>
      </AuthCard>
    </>
  );
}
