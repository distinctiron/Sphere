"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { ring } from "@/lib/sketch";
import { AuthCard, AuthNotice, HandLink, penMessage } from "@/components/auth/auth-shell";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  const token = searchParams.get("token");

  // Verify token on mount
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setTokenError("Missing reset token");
        setIsVerifying(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/reset-password/verify?token=${token}`);
        const data = await response.json();

        if (!response.ok || !data.valid) {
          setTokenError(data.error || "Invalid or expired reset link");
        }
      } catch (err) {
        console.error("Token verification error:", err);
        setTokenError("An error occurred while verifying the reset link");
      } finally {
        setIsVerifying(false);
      }
    }

    verifyToken();
  }, [token]);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!token) {
      setError("Missing reset token");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "An error occurred. Please try again.");
        setIsLoading(false);
        return;
      }

      // Success - redirect to login with success message
      router.push("/login?reset=success");
    } catch (err) {
      console.error("Reset password error:", err);
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  if (isVerifying) {
    return (
      <AuthCard seed="reset-card" titleId="rp-h" title="Reset your password" underline={260}>
        <p className="m-0 flex items-center gap-2 font-hand text-[22px] text-pencil" role="status">
          <svg width={26} height={26} viewBox="0 0 26 26" aria-hidden="true" className="flex-none overflow-visible">
            <path className="sk-draw sk-loop" strokeWidth={1.6} pathLength={1} d={ring(13, 13, 10, 271, 1.05)} />
          </svg>
          Verifying reset link...
        </p>
      </AuthCard>
    );
  }

  if (tokenError) {
    return (
      <AuthCard
        seed="reset-card"
        titleId="rp-h"
        title="Reset your password"
        underline={260}
        subtitle="Invalid or expired reset link"
      >
        <AuthNotice tone="error" seed="reset-token-error">
          {tokenError}
        </AuthNotice>
        <HandLink href="/forgot-password" className="self-center text-[21px]">
          Request a new reset link
        </HandLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      seed="reset-card"
      titleId="rp-h"
      title="Reset your password"
      underline={260}
      subtitle="Enter your new password below."
    >
      {error && (
        <AuthNotice tone="error" seed="reset-error">
          {error}
        </AuthNotice>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="mb-1 block">New Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage className={penMessage} />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="mb-1 block">Confirm New Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage className={penMessage} />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Resetting password..." : "Reset password"}
          </Button>
        </form>
      </Form>

      <HandLink href="/login" className="self-center text-[21px]">
        Back to login
      </HandLink>
    </AuthCard>
  );
}
