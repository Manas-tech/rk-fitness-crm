import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "neutral" | "primary" | "info";
  className?: string;
}

export function Badge({ children, variant = "neutral", className = "" }: BadgeProps) {
  const styles = {
    success: "bg-status-success-bg text-status-success-text border-status-success-border",
    warning: "bg-status-warning-bg text-status-warning-text border-status-warning-border",
    danger: "bg-status-danger-bg text-status-danger-text border-status-danger-border",
    neutral: "bg-status-neutral-bg text-status-neutral-text border-status-neutral-border",
    primary: "bg-primary-light text-primary border-primary/20",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Standard status badge helper based on entity state
 */
export function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase() || "UNKNOWN";

  if (s === "ACTIVE" || s === "COMPLETED" || s === "PAID" || s === "PRESENT" || s === "CONVERTED") {
    return <Badge variant="success">{status}</Badge>;
  }
  if (s === "PENDING" || s === "FOLLOW_UP_REQUIRED" || s === "HALF_DAY" || s === "PARTIALLY_PAID" || s === "TRIAL_SCHEDULED") {
    return <Badge variant="warning">{status}</Badge>;
  }
  if (s === "EXPIRED" || s === "DEACTIVATED" || s === "CANCELLED" || s === "ABSENT" || s === "LOST" || s === "UNPAID") {
    return <Badge variant="danger">{status}</Badge>;
  }
  return <Badge variant="neutral">{status}</Badge>;
}
