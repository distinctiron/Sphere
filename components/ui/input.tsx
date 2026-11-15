import * as React from "react"

import { cn } from "@/lib/utils"
import { SketchFrame } from "@/components/sketch"

/** Text input inside a pencil frame; the frame turns red-pen on focus or when aria-invalid. */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <span className={cn("sk-field", props["aria-invalid"] && props["aria-invalid"] !== "false" && "invalid")}>
        <SketchFrame seed={props.id ?? props.name ?? "input"} w={400} h={46} />
        <input
          type={type}
          className={cn("sk-inp file:border-0 file:bg-transparent file:text-sm file:font-medium", className)}
          ref={ref}
          {...props}
        />
      </span>
    )
  }
)
Input.displayName = "Input"

export { Input }
