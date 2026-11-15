"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategorySelector } from "@/components/auth/category-selector";
import { AuthCard, AuthNotice, HandLink, OAuthButton, OrDivider, penMessage } from "@/components/auth/auth-shell";

const registerSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string(),
    categories: z.array(z.string()).min(1, "Please select at least one category"),
    articleCount: z.enum(["5", "10", "20", "50", "100"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      categories: [],
      articleCount: "20",
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          categories: values.categories,
          articleCount: parseInt(values.articleCount, 10),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError("This email is already registered");
        } else {
          setError(data.error || "Registration failed. Please try again.");
        }
        setIsLoading(false);
        return;
      }

      // Auto-login after successful registration
      const signInResult = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (signInResult?.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        // Registration succeeded but auto-login failed - redirect to login
        router.push("/login?registered=true");
      }
    } catch (err) {
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
      setError(`Failed to initiate ${name} sign-up. Please try again.`);
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      seed="register-card"
      titleId="reg-h"
      title="Create an account"
      underline={300}
      subtitle="Sign up with your existing account for faster onboarding, or create a new account with email"
    >
      {error && (
        <AuthNotice tone="error" seed="register-error">
          {error}
        </AuthNotice>
      )}

      {/* OAuth Providers - Primary signup method */}
      <div className="flex flex-col gap-2.5">
        <p className="m-0 font-hand text-[22px]">Sign up faster with your existing account</p>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr))]">
          <OAuthButton letter="G" label="Sign up with Google" seed="reg-google" onClick={oauth("google", "Google")} disabled={isLoading} />
          <OAuthButton letter="A" label="Sign up with Apple" seed="reg-apple" onClick={oauth("apple", "Apple")} disabled={isLoading} />
          <OAuthButton letter="F" label="Sign up with Facebook" seed="reg-facebook" onClick={oauth("facebook", "Facebook")} disabled={isLoading} />
        </div>
      </div>

      <OrDivider label="Or create account with email" seed="reg-or" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-[22px]">
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

          <div className="grid gap-x-6 gap-y-[18px] [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="mb-1 block">Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormDescription className="sk-help mt-1.5">
                    At least 8 characters, with an uppercase letter, a lowercase letter and a number.
                  </FormDescription>
                  <FormMessage className={penMessage} />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="mb-1 block">Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage className={penMessage} />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="categories"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="mb-1 block">Research Interests</FormLabel>
                <FormDescription className="sk-help">
                  Select the categories you&apos;re interested in. We&apos;ll fetch papers from these areas.
                </FormDescription>
                <FormControl>
                  <CategorySelector
                    selectedCategories={field.value}
                    onCategoriesChange={field.onChange}
                    className="mt-2"
                  />
                </FormControl>
                <FormMessage className={penMessage} />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="articleCount"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="mb-1 block">Initial Articles</FormLabel>
                <FormDescription className="sk-help">
                  How many articles would you like to start with?
                </FormDescription>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="max-w-[260px]">
                      <SelectValue placeholder="Select article count" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="5">5 articles</SelectItem>
                    <SelectItem value="10">10 articles</SelectItem>
                    <SelectItem value="20">20 articles</SelectItem>
                    <SelectItem value="50">50 articles</SelectItem>
                    <SelectItem value="100">100 articles</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className={penMessage} />
              </FormItem>
            )}
          />

          <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating account and fetching papers..." : "Create account"}
          </Button>
        </form>
      </Form>

      <p className="m-0 text-center">
        Already have an account? <HandLink href="/login">Sign in</HandLink>
      </p>
    </AuthCard>
  );
}
