"use client";

import React, { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

interface AppShellProps {
  children: ReactNode;
  user?: {
    name: string;
    email: string;
    role: string;
  } | null;
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar userRole={user?.role || "OWNER"} userName={user?.name || "Vikramaditya"} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Navbar user={user} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
