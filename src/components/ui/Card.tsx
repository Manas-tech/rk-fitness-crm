import React, { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export function Card({ children, className = "", title, subtitle, action }: CardProps) {
  return (
    <div className={`bg-surface border border-border rounded-xl shadow-xs overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            {title && <h3 className="text-sm font-semibold text-ink-primary tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-ink-secondary mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
