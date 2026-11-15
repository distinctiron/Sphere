import * as React from "react"
import { Slot, Slottable } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { SketchFrame } from "@/components/sketch"

/*
 * Sketchbook button: a pencil-framed label in Caveat. "default" is always painted
 * with the yellow brush; the others get the brush swept in on hover.
 */
const buttonVariants = cva(
  "sk-btn [&_svg:not(.sk-frame)]:pointer-events-none [&_svg:not(.sk-frame)]:size-[18px] [&_svg:not(.sk-frame)]:shrink-0",
  {
    variants: {
      variant: {
        default: "primary",
        destructive: "danger",
        outline: "",
        secondary: "",
        ghost: "ghost",
        link: "ghost !min-h-0 !px-0 sk-uline",
      },
      size: {
        default: "",
        sm: "small",
        lg: "large",
        icon: "!w-11 !min-h-11 !px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const framed = variant !== "ghost" && variant !== "link"
    const seed = typeof children === "string" ? children : `${variant ?? "default"}-${size ?? "md"}`
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
        {variant !== "link" && <span className="sk-bsw" aria-hidden="true" />}
        {framed && <SketchFrame seed={seed} w={180} h={46} tone={variant === "destructive" ? "red" : undefined} />}
        <Slottable>{children}</Slottable>
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
