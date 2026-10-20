"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/calculations";
import {
  TrendingUp,
  CreditCard,
  Dumbbell,
  Receipt,
  Users,
  Wallet,
  Calendar,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  ChevronRight,
  Filter,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export default function DashboardPage() {
  const [period, setPeriod] = useState("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const fetchDashboard = async (selectedPeriod: string) => {
    setLoading(true);
    try {
      let url = `/api/finance/dashboard?period=${selectedPeriod}`;
      if (selectedPeriod === "custom" && customStart && customEnd) {
        url += `&customStart=${customStart}&customEnd=${customEnd}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(period);
  }, [period]);

  const kpis = dashboardData?.kpis || {
    grossCollections: 0,
    membershipCollections: 0,
    ptCollections: 0,
    otherSales: 0,
    totalExpenses: 0,
    netOperatingCashFlow: 0,
    totalOutstandingDues: 0,
    trainerCommissionEarned: 0,
    trainerCommissionPaid: 0,
    pendingTrainerCommission: 0,
  };

  const periodButtons = [
    { id: "today", label: "Today" },
    { id: "this_week", label: "This Week" },
    { id: "this_month", label: "This Month" },
    { id: "this_fy", label: "This FY" },
    { id: "this_cy", label: "This CY" },
    { id: "previous_month", label: "Prev Month" },
    { id: "previous_year", label: "Prev Year" },
    { id: "custom", label: "Custom" },
  ];

  const pieColors = ["#167D5A", "#2563EB", "#F59E0B", "#8B5CF6", "#EC4899"];

  return (
    <AppShell>
      {/* Top Header & Reporting Period Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary-light px-2 py-0.5 rounded">
              Financial Overview
            </span>
            <span className="text-xs text-ink-secondary">
              Period: <strong className="text-ink-primary font-semibold">{dashboardData?.periodLabel || "This Month"}</strong>
            </span>
          </div>
          <h2 className="text-xl font-bold text-ink-primary tracking-tight mt-1">
            Executive Financial Dashboard
          </h2>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-surface p-1 rounded-xl border border-border">
          {periodButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setPeriod(btn.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                period === btn.id
                  ? "bg-primary text-white shadow-xs font-semibold"
                  : "text-ink-secondary hover:text-ink-primary hover:bg-background"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range Picker if Custom is selected */}
      {period === "custom" && (
        <div className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl">
          <Calendar className="w-4 h-4 text-ink-secondary" />
          <span className="text-xs font-medium text-ink-secondary">Select Range:</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-border rounded-lg bg-background text-ink-primary"
          />
          <span className="text-xs text-ink-muted">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-border rounded-lg bg-background text-ink-primary"
          />
          <Button size="sm" onClick={() => fetchDashboard("custom")}>
            Apply Range
          </Button>
        </div>
      )}

      {/* 10 Required KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* KPI 1: Gross Collections */}
        <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Gross Collections</span>
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl font-bold text-ink-primary tracking-tight">
            {formatCurrency(kpis.grossCollections)}
          </div>
          <div className="text-[11px] text-ink-secondary mt-1">
            Cash received in period
          </div>
        </div>

        {/* KPI 2: Membership Collections */}
        <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Memberships</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl font-bold text-ink-primary tracking-tight">
            {formatCurrency(kpis.membershipCollections)}
          </div>
          <div className="text-[11px] text-ink-secondary mt-1">
            Plan subscription fees
          </div>
        </div>

        {/* KPI 3: PT Collections */}
        <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">PT Collections</span>
            <Dumbbell className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-ink-primary tracking-tight">
            {formatCurrency(kpis.ptCollections)}
          </div>
          <div className="text-[11px] text-ink-secondary mt-1">
            Personal training cash
          </div>
        </div>

        {/* KPI 4: Other Sales */}
        <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Other Sales</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-ink-primary tracking-tight">
            {formatCurrency(kpis.otherSales)}
          </div>
          <div className="text-[11px] text-ink-secondary mt-1">
            Supplements & passes
          </div>
        </div>

        {/* KPI 5: Total Expenses */}
        <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Expenses</span>
            <Receipt className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-xl font-bold text-red-600 tracking-tight">
            {formatCurrency(kpis.totalExpenses)}
          </div>
          <div className="text-[11px] text-ink-secondary mt-1">
            Rent, utilities & payouts
          </div>
        </div>

        {/* KPI 6: Net Operating Cash Flow */}
        <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Net Cash Flow</span>
            <CreditCard className="w-4 h-4 text-primary" />
          </div>
          <div className={`text-xl font-bold tracking-tight ${kpis.netOperatingCashFlow >= 0 ? "text-primary" : "text-red-600"}`}>
            {formatCurrency(kpis.netOperatingCashFlow)}
          </div>
          <div className="text-[11px] text-ink-secondary mt-1">
            Collections − Expenses
          </div>
        </div>

        {/* KPI 7: Outstanding Member Dues */}
        <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Member Dues</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-600 tracking-tight">
            {formatCurrency(kpis.totalOutstandingDues)}
          </div>
          <div className="text-[11px] text-ink-secondary mt-1">
            Unpaid receivables
          </div>
        </div>

        {/* KPI 8: PT Commission Earned */}
        <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">PT Comm. Earned</span>
            <Dumbbell className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-ink-primary tracking-tight">
            {formatCurrency(kpis.trainerCommissionEarned)}
          </div>
          <div className="text-[11px] text-ink-secondary mt-1">
            70% share of cash recd
          </div>
        </div>

        {/* KPI 9: PT Commission Paid */}
        <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">PT Comm. Paid</span>
            <Receipt className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl font-bold text-ink-primary tracking-tight">
            {formatCurrency(kpis.trainerCommissionPaid)}
          </div>
          <div className="text-[11px] text-ink-secondary mt-1">
            Settled to trainers
          </div>
        </div>

        {/* KPI 10: Pending Commission */}
        <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Pending Comm.</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-600 tracking-tight">
            {formatCurrency(kpis.pendingTrainerCommission)}
          </div>
          <div className="text-[11px] text-ink-secondary mt-1">
            Unsettled trainer share
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Collections vs Expenses */}
        <Card
          className="lg:col-span-2"
          title="Cash Collections vs Operating Expenses"
          subtitle="Direct comparison of actual money received against expenses paid"
        >
          <div className="h-72 w-full pt-4">
            {dashboardData?.charts?.collectionsVsExpenses?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData.charts.collectionsVsExpenses}>
                  <defs>
                    <linearGradient id="colGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#167D5A" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#167D5A" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="expGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#DC2626" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#DC2626" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6E8EC" vertical={false} />
                  <XAxis dataKey="date" stroke="#697386" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#697386"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val / 1000}k`}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), ""]}
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#E6E8EC",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="collections"
                    name="Collections"
                    stroke="#167D5A"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#DC2626"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#expGradient)"
                  />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-ink-muted">
                No financial movement recorded for this date range
              </div>
            )}
          </div>
        </Card>

        {/* Chart 2: Revenue Breakdown */}
        <Card title="Revenue Stream Split" subtitle="Composition of collections in this period">
          <div className="h-72 w-full flex flex-col items-center justify-center">
            {dashboardData?.charts?.revenueBreakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.charts.revenueBreakdown}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {dashboardData.charts.revenueBreakdown.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), "Revenue"]}
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#E6E8EC",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-ink-muted">No collections recorded</div>
            )}
          </div>
        </Card>
      </div>

      {/* Second Row: Expense Breakdown & Membership Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 3: Expense Breakdown */}
        <Card title="Operating Expense Categories" subtitle="Breakdown of paid gym overheads">
          <div className="h-64 w-full pt-2">
            {dashboardData?.charts?.expenseBreakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.charts.expenseBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E6E8EC" />
                  <XAxis
                    type="number"
                    stroke="#697386"
                    fontSize={11}
                    tickFormatter={(val) => `₹${val / 1000}k`}
                  />
                  <YAxis type="category" dataKey="name" stroke="#697386" fontSize={11} width={100} />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), "Amount"]}
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#E6E8EC",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="value" name="Amount" fill="#DC2626" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-ink-muted">
                No expenses logged for this period
              </div>
            )}
          </div>
        </Card>

        {/* Chart 5: Membership Acquisition & Renewals */}
        <Card title="Membership Period Lifecycle" subtitle="Acquisitions, renewals, and expiries">
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData?.charts?.membershipPerformance || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E8EC" />
                <XAxis dataKey="name" stroke="#697386" fontSize={11} />
                <YAxis stroke="#697386" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E6E8EC",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" name="Members" fill="#167D5A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Financial Transactions Table */}
      <Card
        title="Recent Financial Transactions"
        subtitle="Latest 10 payment and payout ledger records"
        action={
          <a
            href="/finance"
            className="text-xs font-medium text-primary hover:text-primary-hover flex items-center gap-1"
          >
            Full Ledger <ChevronRight className="w-3.5 h-3.5" />
          </a>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-background text-ink-secondary border-b border-border uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Txn Code</th>
                <th className="py-2.5 px-3 font-semibold">Date</th>
                <th className="py-2.5 px-3 font-semibold">Description</th>
                <th className="py-2.5 px-3 font-semibold">Member / Payee</th>
                <th className="py-2.5 px-3 font-semibold">Type</th>
                <th className="py-2.5 px-3 font-semibold">Method</th>
                <th className="py-2.5 px-3 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {dashboardData?.recentTransactions?.map((t: any) => (
                <tr key={t.id} className="hover:bg-background/50 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-medium text-ink-primary">
                    {t.transactionCode}
                  </td>
                  <td className="py-2.5 px-3 text-ink-secondary">
                    {new Date(t.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-ink-primary max-w-xs truncate">
                    {t.description}
                  </td>
                  <td className="py-2.5 px-3 text-ink-secondary">
                    {t.member ? `${t.member.fullName} (${t.member.memberCode})` : "General / Vendor"}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        t.type === "COLLECTION"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-ink-secondary">{t.paymentMethod}</td>
                  <td className="py-2.5 px-3 font-semibold text-right">
                    <span className={t.type === "COLLECTION" ? "text-primary" : "text-red-600"}>
                      {t.type === "COLLECTION" ? "+" : "-"}
                      {formatCurrency(t.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
