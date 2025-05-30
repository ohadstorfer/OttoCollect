
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { UserRank } from "@/types"
import { Shield, Award, Star } from "lucide-react"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-0.5 py-0.5 text-xs font-medium ring-1 ring-gray-400 sm:px-2 sm:py-1",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        primary:
          "bg-ottoman-500/10 text-ottoman-300 ring-ottoman-500/30",
        gold:
          "bg-gold-500/10 text-gold-500 ring-gold-500/20",
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
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  rank?: UserRank;
  showIcon?: boolean;
}

const getUserRankVariant = (
  rank: UserRank
): "user" | "admin" | "super" => {
  if (rank.includes('Super Admin')) {
    return "super";
  } else if (rank.includes('Admin')) {
    return "admin";
  } else {
    return "user";
  }
};

function Badge({
  className,
  variant,
  rank,
  showIcon = true,
  ...props
}: BadgeProps) {
  // If a rank is provided, use it to determine the variant
  const badgeVariant = rank ? getUserRankVariant(rank) : variant;
  
  // Choose icon based on rank
  const renderIcon = () => {
    if (!showIcon || !rank) return null;
    
    if (rank.includes('Super Admin')) {
      return <Shield className="h-3 w-3 mr-1" />;
    } else if (rank.includes('Admin')) {
      return <Award className="h-3 w-3 mr-1" />;
    } else if (rank === "Advance Collector" || rank === "Known Collector" || 
               rank === "Master Collector") {
      return <Star className="h-3 w-3 mr-1" />;
    }
    
    return null;
  };
  
  return (
    <div className={cn(badgeVariants({ variant: badgeVariant }), className)} {...props}>
      {renderIcon()}
      {props.children || rank}
    </div>
  )
}

export { Badge, badgeVariants }
