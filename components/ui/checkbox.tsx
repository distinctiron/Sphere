"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"

import { cn } from "@/lib/utils"

/** Hand-drawn box; checked shows a red-pen tick (drawn by .sk-ck[data-state=checked]). */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn("sk-ck peer disabled:cursor-not-allowed disabled:opacity-50", className)}
    {...props}
  />
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
