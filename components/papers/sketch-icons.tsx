import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

/*
 * Hand-drawn icons for the paper reader. Each is a single loose pencil stroke
 * (plus a lighter second pass on some), drawn in currentColor.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, className, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("flex-none fill-none stroke-current", className)}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

const s1 = { strokeWidth: 2 };
const s2 = { strokeWidth: 1.2, opacity: 0.55 };

export const BackIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...s1} d="M19 12.3 C 14 12, 9 12.4, 5 12 M10.5 6.5 C 8.5 8.6, 7 10.4, 5 12 C 7 13.7, 8.6 15.5, 10.3 17.6" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...s1} d="M4 13 C 6 15, 8 17, 9.5 19 C 13 12.5, 16.5 8, 20.5 4.5" />
  </Icon>
);

export const SparkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...s1} d="M12 3 C 12.5 8, 13.5 10, 19 11.5 C 13.5 13, 12.5 15, 12 21 C 11.4 15, 10.4 13, 5 11.6 C 10.5 10, 11.4 8, 12 3 Z" />
  </Icon>
);

export const ChatIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...s1} d="M4 5 C 9 4.6, 15 4.4, 20 5 C 20.4 8.5, 20.3 12, 20 15 C 15 15.3, 12 15.2, 9 15 L 5 19 L 5.5 15 C 4.8 15, 4.2 14.8, 4 14.5 C 3.7 11, 3.7 8, 4 5 Z" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon size={18} {...p}>
    <path {...s1} d="M6 6.5 C 10 10, 14 14.5, 18 18 M18 6 C 14 10.5, 10 14, 6.2 18" />
    <path {...s2} d="M6.6 6 C 10.5 10.5, 14.4 14, 17.6 18.6" />
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path {...s1} d="M4 6.5 C 9 6.2, 15 6.3, 20 6.6 M9 6.4 C 9 5, 9.5 4, 12 4 C 14.5 4, 15 5, 15 6.4 M6 6.8 C 6.5 11, 6.8 15, 7.3 20 C 10.5 20.3, 13.5 20.2, 16.7 20 C 17.2 15, 17.5 11, 18 6.8" />
    <path {...s2} d="M10 10 L 10.4 16.5 M14 10 L 13.6 16.5" />
  </Icon>
);

export const SendIcon = (p: IconProps) => (
  <Icon size={18} {...p}>
    <path {...s1} d="M4 12 C 9 11.6, 14 11.8, 19.5 12 M14 6.5 C 16 8.5, 17.6 10.3, 19.5 12 C 17.6 13.8, 16 15.6, 14.2 17.5" />
  </Icon>
);

export const ChevronIcon = ({ direction = "right", ...p }: IconProps & { direction?: "right" | "left" }) => (
  <Icon size={16} {...p}>
    <path {...s1} d={direction === "right" ? "M9 5 C 11.5 7.5, 13.5 9.8, 16 12 C 13.6 14.4, 11.4 16.6, 9 19" : "M15 5 C 12.5 7.5, 10.5 9.8, 8 12 C 10.4 14.4, 12.6 16.6, 15 19"} />
  </Icon>
);

export const CopyIcon = (p: IconProps) => (
  <Icon size={16} {...p}>
    <path {...s1} d="M8.5 8.4 C 12 8.2, 16 8.3, 19.6 8.5 C 19.8 12, 19.7 16, 19.5 19.6 C 16 19.8, 12 19.7, 8.6 19.5 C 8.3 16, 8.3 12, 8.5 8.4 Z" />
    <path {...s2} d="M15.5 5.5 C 15.4 4.9, 15.2 4.5, 14.8 4.4 C 11.5 4.2, 8 4.3, 4.6 4.5 C 4.3 8, 4.3 11.5, 4.5 14.8 C 4.7 15.3, 5 15.5, 5.6 15.5" />
  </Icon>
);

export const PageIcon = (p: IconProps) => (
  <Icon size={16} {...p}>
    <path {...s1} d="M6 3.5 C 9 3.3, 12 3.4, 14 3.6 L 18.6 8 C 18.8 12, 18.7 16.5, 18.5 20.5 C 14.5 20.7, 10 20.7, 6 20.4 C 5.7 15, 5.7 9, 6 3.5 Z M14 3.8 C 13.9 5.5, 14 7, 14.2 8.2 C 15.8 8.3, 17.2 8.2, 18.4 8.1" />
    <path {...s2} d="M9 12.5 L 15.5 12.3 M9 16 L 14 15.8" />
  </Icon>
);

/** A small pencil loop that keeps redrawing itself: the sketchbook's loading spinner. */
export function PencilSpinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={cn("flex-none", className)}>
      <path
        className="sk-draw thin sk-loop"
        pathLength={1}
        d="M12 3.5 C 17 3.4, 20.6 7, 20.5 12 C 20.4 17, 16.8 20.6, 12 20.5 C 7 20.4, 3.4 16.8, 3.5 12 C 3.6 8, 6 5, 9.5 4"
      />
    </svg>
  );
}
