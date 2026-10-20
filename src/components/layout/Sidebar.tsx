"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Receipt,
  Globe2,
  UserCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CalendarCheck,
  TrendingUp,
} from "lucide-react";

interface SidebarProps {
  userRole?: string;
  userName?: string;
}

export function Sidebar({ userRole = "OWNER", userName = "Vikramaditya" }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: "All Members",
      href: "/members",
      icon: Users,
      badge: null,
    },
    {
      name: "Personal Training",
      href: "/personal-training",
      icon: Dumbbell,
      badge: "70/30",
    },
    {
      name: "Sales & Expenses",
      href: "/finance",
      icon: Receipt,
      badge: null,
    },
    {
      name: "Website Enquiries",
      href: "/enquiries",
      icon: Globe2,
      badge: "CRM",
    },
    {
      name: "Staff & Payroll",
      href: "/staff",
      icon: UserCheck,
      badge: null,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside
      className={`relative flex flex-col bg-surface border-r border-border transition-all duration-200 z-30 select-none ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {!collapsed ? (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
              IP
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-ink-primary tracking-tight text-sm">
                IronPulse CRM
              </span>
              <span className="text-[11px] text-ink-secondary">
                Fitness & Athletic Club
              </span>
            </div>
          </Link>
        ) : (
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm mx-auto">
            IP
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-md text-ink-secondary hover:text-ink-primary hover:bg-background transition-colors ${
            collapsed ? "hidden" : "block"
          }`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className={`px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted ${collapsed ? "text-center" : ""}`}>
          {!collapsed ? "Core Modules" : "•"}
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary-light text-primary font-semibold shadow-xs"
                  : "text-ink-secondary hover:text-ink-primary hover:bg-background"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-ink-secondary"}`} />
              {!collapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-background text-ink-secondary border border-border">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle for collapsed mode */}
      {collapsed && (
        <div className="p-2 border-t border-border flex justify-center">
          <button
            onClick={() => setCollapsed(false)}
            className="p-1.5 rounded-md text-ink-secondary hover:text-ink-primary hover:bg-background"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* User Status Footer */}
      <div className="p-3 border-t border-border bg-[#FAFBFC]">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
                {userName.charAt(0)}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-ink-primary truncate">
                  {userName}
                </span>
                <span className="text-[10px] text-ink-secondary flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-primary inline" />
                  {userRole}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs mx-auto">
            {userName.charAt(0)}
          </div>
        )}
      </div>
    </aside>
  );
}
