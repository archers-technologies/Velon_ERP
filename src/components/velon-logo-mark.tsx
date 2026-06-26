import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Velon "V" mark — square with fixed 6px corners (never a circle). */
const logoMarkVariants = cva(
  "flex shrink-0 items-center justify-center font-bold leading-none [aspect-ratio:1/1] rounded-[6px]",
  {
    variants: {
      size: {
        xs: "h-6 w-6 min-h-6 min-w-6 text-[11px]",
        sm: "h-8 w-8 min-h-8 min-w-8 text-sm",
        md: "h-11 w-11 min-h-11 min-w-11 text-base",
        lg: "h-12 w-12 min-h-12 min-w-12 text-lg",
      },
      variant: {
        default: "bg-foreground text-background",
        platform: "bg-amber-500 text-black",
        sidebar: "bg-white text-sidebar",
      },
    },
    defaultVariants: {
      size: "sm",
      variant: "default",
    },
  },
);

type VelonLogoMarkProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof logoMarkVariants>;

export function VelonLogoMark({ size, variant, className, ...props }: VelonLogoMarkProps) {
  return (
    <div className={cn(logoMarkVariants({ size, variant }), className)} aria-hidden {...props}>
      V
    </div>
  );
}
