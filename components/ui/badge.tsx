import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { brushClass, type BrushColor } from "@/lib/sketch"

/*
 * Badges are paintbrush strokes with the label inside. The colour follows the
 * variant, or pass `brush` (an arXiv category or a colour name) to choose one.
 */
const badgeVariants = cva("sk-tag sm", {
  variants: {
    variant: {
      default: "",
      secondary: "",
      destructive: "",
      outline: "",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

const VARIANT_COLOR: Record<string, BrushColor> = {
  default: "yellow",
  secondary: "blue",
  destructive: "pink",
  outline: "green",
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  brush?: string
}

function Badge({ className, variant, brush, children, ...props }: BadgeProps) {
  const key = brush ?? VARIANT_COLOR[variant ?? "default"]
  const seed = typeof children === "string" ? children : key
  return (
    <span className={cn(badgeVariants({ variant }), brushClass(key, seed), className)} {...props}>
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
