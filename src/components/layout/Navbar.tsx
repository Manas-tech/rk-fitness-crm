"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Bell,
  Clock,
  LogOut,
  User,
  Shield,
  AlertTriangle,
  Calendar,
  ExternalLink,
} from "lucide-react";

interface NavbarProps {
  user?: {
    name: string;
    email: string;
    role: string;
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [alerts, setAlerts] = useState<{
    expiring7Days: number;
    expiring30Days: number;
    pendingFollowUps: number;
  }>({
    expiring7Days: 0,
    expiring30Days: 1,
    pendingFollowUps: 2,
  });

  // Determine page title
  const getPageTitle = () => {
    if (pathname.startsWith("/members")) return "All Members";
    if (pathname.startsWith("/personal-training")) return "Personal Training & Commissions";
    if (pathname.startsWith("/finance")) return "Sales, Expenses & Financial Ledger";
    if (pathname.startsWith("/enquiries")) return "Website Enquiries & Leads";
    if (pathname.startsWith("/staff")) return "Staff Attendance & Payroll Workspace";
    if (pathname.startsWith("/settings")) return "System & Business Settings";
    return "Executive Financial Dashboard";
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <header className="h-16 bg-surface border-b border-border px-6 flex items-center justify-between z-20">
      {/* Title & Breadcrumb */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-ink-primary tracking-tight">
          {getPageTitle()}
        </h1>
        <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#F0F2F5] text-ink-secondary border border-border">
          <Calendar className="w-3 h-3 text-ink-secondary" />
          Asia/Kolkata (IST)
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Quick Website Form Link */}
        <Link
          href="/test-enquiry"
          target="_blank"
          className="hidden lg:flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover font-medium px-2.5 py-1.5 rounded-md hover:bg-primary-light transition-colors"
          title="Open Public Website Test Enquiry Form"
        >
          <span>Website Form Test</span>
          <ExternalLink className="w-3 h-3" />
        </Link>

        {/* Expiry & Operational Alerts */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="relative p-2 rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-background transition-colors"
            title="Operational Alerts & Expiries"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-surface rounded-xl shadow-lg border border-border py-3 px-4 z-50 animate-in fade-in-50 duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-semibold text-ink-primary uppercase tracking-wider">
                  Operational Alerts
                </span>
                <span className="text-[11px] text-ink-secondary">Real-time</span>
              </div>
              <div className="py-2 space-y-2 text-xs">
                <Link
                  href="/members?filter=expiring_30"
                  onClick={() => setShowNotifications(false)}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-background transition-colors text-ink-primary"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-xs">Membership Expiry Alerts</p>
                    <p className="text-[11px] text-ink-secondary">
                      Memberships expiring soon need renewal outreach.
                    </p>
                  </div>
                </Link>
                <Link
                  href="/enquiries?status=FOLLOW_UP_REQUIRED"
                  onClick={() => setShowNotifications(false)}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-background transition-colors text-ink-primary"
                >
                  <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-xs">Leads Awaiting Follow-Up</p>
                    <p className="text-[11px] text-ink-secondary">
                      Website inquiries awaiting contact today.
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-background transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">
              {user?.name ? user.name.charAt(0) : "A"}
            </div>
            <span className="hidden sm:inline text-xs font-medium text-ink-primary">
              {user?.name || "Vikramaditya"}
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-surface rounded-xl shadow-lg border border-border py-1.5 z-50">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-medium text-ink-primary truncate">
                  {user?.name || "Vikramaditya Singhania"}
                </p>
                <p className="text-[11px] text-ink-secondary truncate">
                  {user?.email || "owner@ironpulsefitness.com"}
                </p>
                <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 bg-primary-light text-primary rounded">
                  {user?.role || "OWNER"}
                </span>
              </div>
              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-ink-primary hover:bg-background transition-colors"
                >
                  <Shield className="w-3.5 h-3.5 text-ink-secondary" />
                  Gym Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
