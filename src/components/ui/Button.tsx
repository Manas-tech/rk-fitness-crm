import React, { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const variants = {
    primary: "bg-primary text-white hover:bg-primary-hover shadow-xs active:bg-primary-dark",
    secondary: "bg-surface text-ink-primary hover:bg-[#F0F2F5] border border-border shadow-xs",
    outline: "bg-transparent text-primary hover:bg-primary-light border border-primary/30",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-xs active:bg-red-800",
    ghost: "bg-transparent text-ink-secondary hover:text-ink-primary hover:bg-background",
  };

  const sizes = {
    sm: "px-2.5 py-1.5 text-xs gap-1.5",
    md: "px-3.5 py-2 text-xs md:text-sm gap-2",
    lg: "px-4.5 py-2.5 text-sm md:text-base gap-2.5",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
      ) : null}
      {children}
    </button>
  );
}
