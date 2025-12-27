import React from "react";
import { LucideIcon, LucideProps, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SafeIconProps extends Omit<LucideProps, "ref"> {
  icon: LucideIcon;
  fallback?: LucideIcon;
}

/**
 * SafeIcon - A wrapper component that ensures Lucide icons render correctly
 * with proper fallback handling to prevent broken "C" characters
 */
export function SafeIcon({ 
  icon: Icon, 
  fallback: FallbackIcon = Circle,
  className,
  ...props 
}: SafeIconProps) {
  // Verify Icon is a valid component
  if (!Icon || typeof Icon !== "function") {
    return <FallbackIcon className={cn("shrink-0", className)} {...props} />;
  }

  return <Icon className={cn("shrink-0", className)} {...props} />;
}

/**
 * IconBadge - An icon with a circular background for status indicators
 */
interface IconBadgeProps extends SafeIconProps {
  variant?: "default" | "success" | "active" | "pending" | "error";
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
}

export function IconBadge({ 
  icon, 
  variant = "default", 
  size = "md",
  pulse = false,
  className,
  ...props 
}: IconBadgeProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const variantClasses = {
    default: "bg-muted border-border text-muted-foreground",
    success: "bg-success border-success text-success-foreground",
    active: "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30",
    pending: "bg-muted/50 border-border/50 text-muted-foreground/60",
    error: "bg-destructive/10 border-destructive text-destructive",
  };

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300",
        sizeClasses[size],
        variantClasses[variant],
        pulse && "animate-pulse",
        className
      )}
    >
      <SafeIcon icon={icon} className={iconSizes[size]} {...props} />
    </div>
  );
}
