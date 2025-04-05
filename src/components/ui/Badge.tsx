
import { cn } from "@/lib/utils";
import { UserRank } from "@/types";
import { cva, type VariantProps } from "class-variance-authority";
import { Shield, Award, Star } from "lucide-react";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        default:
          "bg-ottoman-500/10 text-ottoman-300 ring-ottoman-500/20",
        primary:
          "bg-ottoman-500/10 text-ottoman-300 ring-ottoman-500/30",
        secondary:
          "bg-ottoman-600/10 text-ottoman-400 ring-ottoman-600/20",
        gold:
          "bg-gold-500/10 text-gold-500 ring-gold-500/20",
        destructive:
          "bg-destructive/10 text-destructive ring-destructive/20",
        user:
          "bg-ottoman-500/10 text-ottoman-300 ring-ottoman-500/20",
        admin:
          "bg-gold-700/10 text-gold-400 ring-gold-700/20",
        super:
          "bg-gold-500/10 text-gold-500 ring-gold-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  rank?: UserRank;
  showIcon?: boolean;
}

const getUserRankVariant = (
  rank: UserRank
): "user" | "admin" | "super" => {
  if (rank.startsWith("Super Admin")) {
    return "super";
  } else if (rank.startsWith("Admin")) {
    return "admin";
  } else {
    return "user";
  }
};

const Badge = ({
  className,
  variant,
  rank,
  showIcon = true,
  ...props
}: BadgeProps) => {
  // If a rank is provided, use it to determine the variant
  const badgeVariant = rank ? getUserRankVariant(rank) : variant;
  
  // Choose icon based on rank
  const renderIcon = () => {
    if (!showIcon || !rank) return null;
    
    if (rank.startsWith("Super Admin")) {
      return <Shield className="h-3 w-3 mr-1" />;
    } else if (rank.startsWith("Admin")) {
      return <Award className="h-3 w-3 mr-1" />;
    } else if (rank === "Advance Collector" || rank === "Known Collector") {
      return <Star className="h-3 w-3 mr-1" />;
    }
    
    return null;
  };
  
  return (
    <div
      className={cn(badgeVariants({ variant: badgeVariant }), className)}
      {...props}
    >
      {renderIcon()}
      {props.children || rank}
    </div>
  );
};

export { Badge, badgeVariants };
