"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/calculations";
import {
  UserCheck,
  Calendar,
  Users,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Download,
  PlusCircle,
  CreditCard,
  Lock,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState<"attendance" | "payroll" | "roster">("payroll");

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [attendanceCounts, setAttendanceCounts] = useState<any>({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Payroll state
  const now = new Date();
  const [payrollMonth, setPayrollMonth] = useState(now.getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(now.getFullYear());
  const [payrollData, setPayrollData] = useState<any>(null);
  const [payrollLoading, setPayrollLoading] = useState(false);

  // Roster state
  const [staffList, setStaffList] = useState<any[]>([]);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);

  // Modals state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);

  // Payout Form
  const [payoutForm, setPayoutForm] = useState({
    amount: 0,
    paymentMethod: "BANK_TRANSFER",
    referenceNumber: "",
    notes: "",
  });

  // Add Staff Form
  const [staffForm, setStaffForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    role: "PERSONAL_TRAINER",
    salaryModel: "ATTENDANCE_BASED",
    baseSalary: 15000,
    scheduledWorkingDays: 30,
    bankDetails: "",
    notes: "",
  });

  // 1. Fetch Attendance
  const fetchAttendance = async () => {
    setAttendanceLoading(true);
    try {
      const res = await fetch(`/api/attendance?date=${attendanceDate}`);
      const data = await res.json();
      setAttendanceList(data.staffAttendance || []);
      setAttendanceCounts(data.counts || {});
    } catch (err) {
      console.error(err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  // 2. Fetch Payroll
  const fetchPayroll = async () => {
    setPayrollLoading(true);
    try {
      const res = await fetch(`/api/payroll?month=${payrollMonth}&year=${payrollYear}`);
      const data = await res.json();
      setPayrollData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setPayrollLoading(false);
    }
  };

  // 3. Fetch Staff Roster
  const fetchRoster = async () => {
    try {
      const res = await fetch("/api/staff");
      const data = await res.json();
      setStaffList(data.staff || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === "attendance") fetchAttendance();
    if (activeTab === "payroll") fetchPayroll();
    if (activeTab === "roster") fetchRoster();
  }, [activeTab, attendanceDate, payrollMonth, payrollYear]);

  // Mark Individual Attendance
  const handleMarkAttendance = async (staffId: string, status: string) => {
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          date: attendanceDate,
          status,
        }),
      });
      if (!res.ok) throw new Error("Failed to mark attendance");
      fetchAttendance();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Mark All Present
  const handleMarkAllPresent = async () => {
    if (!confirm(`Mark all active staff as PRESENT for ${attendanceDate}?`)) return;
    try {
      const res = await fetch("/api/attendance/mark-all-present", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: attendanceDate }),
      });
      if (!res.ok) throw new Error("Failed to mark all present");
      fetchAttendance();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Finalize Payroll
  const handleFinalizePayroll = async () => {
    if (
      !confirm(
        `Finalize payroll for ${payrollMonth}/${payrollYear}? This will lock calculations and link PT commissions to this payroll.`
      )
    )
      return;

    try {
      const res = await fetch("/api/payroll/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: payrollMonth,
          year: payrollYear,
          staffPayrolls: payrollData?.payroll,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to finalize payroll");

      alert("Payroll finalized and locked successfully!");
      fetchPayroll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Record Salary Payout
  const handleRecordPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayroll?.payrollId) {
      alert("Payroll must be finalized before recording salary payouts");
      return;
    }

    try {
      const res = await fetch(`/api/payroll/${selectedPayroll.payrollId}/payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payoutForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record payout");

      setShowPayoutModal(false);
      fetchPayroll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Add Staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffForm),
      });

      if (!res.ok) throw new Error("Failed to create staff member");
      setShowAddStaffModal(false);
      fetchRoster();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Export Payroll CSV
  const handleExportPayrollCSV = () => {
    const headers = [
      "Staff Code",
      "Full Name",
      "Role",
      "Model",
      "Present",
      "Half-Days",
      "Leave",
      "Absent",
      "Units",
      "Daily Rate",
      "Base Earnings",
      "PT Commission",
      "Gross Payable",
      "Net Payable",
      "Paid",
      "Remaining Balance",
      "Status",
    ];

    const rows = (payrollData?.payroll || []).map((p: any) => [
      p.staffCode,
      `"${p.fullName}"`,
      p.role,
      p.salaryModel,
      p.presentDays,
      p.halfDays,
      p.paidLeaveDays,
      p.absentDays,
      p.attendanceUnitsEarned,
      p.dailyRate,
      p.attendanceEarnings,
      p.ptCommissionEarned,
      p.grossPayable,
      p.netSalaryPayable,
      p.amountPaid,
      p.remainingBalance,
      p.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e: any[]) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payroll_${payrollYear}_${payrollMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-xl font-bold text-ink-primary tracking-tight">
            Staff Attendance & Monthly Payroll Workspace
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            Transparent daily attendance, configurable compensation policies, and unified PT commission integration
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeTab === "payroll" && (
            <>
              <Button variant="secondary" size="sm" onClick={handleExportPayrollCSV}>
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </Button>
              {!payrollData?.isAllFinalized && (
                <Button size="sm" onClick={handleFinalizePayroll}>
                  <Lock className="w-3.5 h-3.5" />
                  Finalize & Lock Payroll
                </Button>
              )}
            </>
          )}

          {activeTab === "attendance" && (
            <Button size="sm" onClick={handleMarkAllPresent}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mark All Present
            </Button>
          )}

          {activeTab === "roster" && (
            <Button size="sm" onClick={() => setShowAddStaffModal(true)}>
              <PlusCircle className="w-3.5 h-3.5" />
              Add Staff Member
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("payroll")}
          className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "payroll"
              ? "border-primary text-primary"
              : "border-transparent text-ink-secondary hover:text-ink-primary"
          }`}
        >
          Monthly Salary & Payroll
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "attendance"
              ? "border-primary text-primary"
              : "border-transparent text-ink-secondary hover:text-ink-primary"
          }`}
        >
          Daily Attendance Management
        </button>
        <button
          onClick={() => setActiveTab("roster")}
          className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "roster"
              ? "border-primary text-primary"
              : "border-transparent text-ink-secondary hover:text-ink-primary"
          }`}
        >
          Staff Profiles & Compensation Models
        </button>
      </div>

      {/* SECTION 1: PAYROLL WORKSPACE */}
      {activeTab === "payroll" && (
        <div className="space-y-4">
          {/* Month/Year selector & KPI Summary */}
          <div className="bg-surface border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                Payroll Period:
              </span>
              <select
                value={payrollMonth}
                onChange={(e) => setPayrollMonth(Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {[
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ].map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={payrollYear}
                onChange={(e) => setPayrollYear(Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              {payrollData?.isAllFinalized ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Lock className="w-3 h-3" /> Locked & Finalized
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-3 h-3" /> Preliminary Draft
                </span>
              )}
            </div>

            <div className="flex items-center gap-6 text-xs">
              <div>
                <span className="text-ink-secondary">Base Compensation:</span>{" "}
                <strong className="text-ink-primary font-bold">
                  {formatCurrency(payrollData?.summary?.totalBasePaid || 0)}
                </strong>
              </div>
              <div>
                <span className="text-ink-secondary">PT Commissions:</span>{" "}
                <strong className="text-blue-700 font-bold">
                  {formatCurrency(payrollData?.summary?.totalCommissions || 0)}
                </strong>
              </div>
              <div>
                <span className="text-ink-secondary">Total Net Payable:</span>{" "}
                <strong className="text-primary font-bold text-sm">
                  {formatCurrency(payrollData?.summary?.totalGross || 0)}
                </strong>
              </div>
            </div>
          </div>

          {/* Payroll Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-background text-ink-secondary border-b border-border uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-3 font-semibold">Staff Member</th>
                    <th className="py-3 px-3 font-semibold">Model</th>
                    <th className="py-3 px-3 font-semibold">Present</th>
                    <th className="py-3 px-3 font-semibold">Half-Days</th>
                    <th className="py-3 px-3 font-semibold">Absent</th>
                    <th className="py-3 px-3 font-semibold">Daily Rate</th>
                    <th className="py-3 px-3 font-semibold">Base Earnings</th>
                    <th className="py-3 px-3 font-semibold">PT Commission</th>
                    <th className="py-3 px-3 font-semibold">Net Payable</th>
                    <th className="py-3 px-3 font-semibold">Paid</th>
                    <th className="py-3 px-3 font-semibold">Balance</th>
                    <th className="py-3 px-3 font-semibold">Status</th>
                    <th className="py-3 px-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payrollLoading ? (
                    <tr>
                      <td colSpan={13} className="py-8 text-center text-xs text-ink-muted">
                        Calculating monthly payroll...
                      </td>
                    </tr>
                  ) : (
                    payrollData?.payroll?.map((p: any) => {
                      const hasBalance = p.remainingBalance > 0;
                      return (
                        <tr key={p.staffId} className="hover:bg-background/40 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-ink-primary">{p.fullName}</div>
                            <div className="text-[10px] text-ink-secondary">
                              {p.staffCode} • {p.role.replace(/_/g, " ")}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-background border border-border">
                              {p.salaryModel.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-medium text-emerald-700">{p.presentDays}</td>
                          <td className="py-3 px-3 text-amber-700">{p.halfDays}</td>
                          <td className="py-3 px-3 text-red-600">{p.absentDays}</td>
                          <td className="py-3 px-3 text-ink-secondary">{formatCurrency(p.dailyRate)}</td>
                          <td className="py-3 px-3 font-medium text-ink-primary">
                            {formatCurrency(p.attendanceEarnings)}
                          </td>
                          <td className="py-3 px-3 font-semibold text-blue-700">
                            {formatCurrency(p.ptCommissionEarned)}
                          </td>
                          <td className="py-3 px-3 font-bold text-ink-primary">
                            {formatCurrency(p.netSalaryPayable)}
                          </td>
                          <td className="py-3 px-3 text-emerald-700">{formatCurrency(p.amountPaid)}</td>
                          <td className="py-3 px-3">
                            {hasBalance ? (
                              <span className="font-semibold text-amber-600">
                                {formatCurrency(p.remainingBalance)}
                              </span>
                            ) : (
                              <span className="text-emerald-600">₹0 (Paid)</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <StatusBadge status={p.status} />
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {p.isFinalized && hasBalance && (
                                <button
                                  onClick={() => {
                                    setSelectedPayroll(p);
                                    setPayoutForm({
                                      amount: p.remainingBalance,
                                      paymentMethod: "BANK_TRANSFER",
                                      referenceNumber: "",
                                      notes: "",
                                    });
                                    setShowPayoutModal(true);
                                  }}
                                  className="px-2 py-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200"
                                >
                                  Pay Salary
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedPayroll(p);
                                  setShowSlipModal(true);
                                }}
                                className="p-1 text-ink-secondary hover:text-ink-primary hover:bg-background rounded"
                                title="View / Print Salary Statement"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* SECTION 2: DAILY ATTENDANCE MANAGEMENT */}
      {activeTab === "attendance" && (
        <div className="space-y-4">
          {/* Date Selector & Attendance Counters */}
          <div className="bg-surface border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-ink-secondary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                Attendance Date:
              </span>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="text-emerald-700 font-semibold">
                Present: {attendanceCounts.present || 0}
              </span>
              <span className="text-amber-700 font-semibold">
                Half-Day: {attendanceCounts.halfDay || 0}
              </span>
              <span className="text-blue-700 font-semibold">
                Leave: {attendanceCounts.leave || 0}
              </span>
              <span className="text-red-600 font-semibold">
                Absent: {attendanceCounts.absent || 0}
              </span>
              <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Not Marked: {attendanceCounts.notMarked || 0}
              </span>
            </div>
          </div>

          {/* Attendance Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-background text-ink-secondary border-b border-border uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-3 font-semibold">Staff Member</th>
                    <th className="py-3 px-3 font-semibold">Role</th>
                    <th className="py-3 px-3 font-semibold">Pay Model</th>
                    <th className="py-3 px-3 font-semibold">Current Status</th>
                    <th className="py-3 px-3 font-semibold">Check-in / Out</th>
                    <th className="py-3 px-3 font-semibold text-right">Quick Mark Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {attendanceLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-ink-muted">
                        Loading attendance for {attendanceDate}...
                      </td>
                    </tr>
                  ) : (
                    attendanceList.map((item) => (
                      <tr key={item.staffId} className="hover:bg-background/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-ink-primary">{item.fullName}</div>
                          <div className="text-[10px] text-ink-secondary">{item.staffCode}</div>
                        </td>
                        <td className="py-3 px-3 text-ink-secondary">{item.role.replace(/_/g, " ")}</td>
                        <td className="py-3 px-3 text-ink-secondary">
                          {item.salaryModel.replace(/_/g, " ")}
                        </td>
                        <td className="py-3 px-3">
                          {item.attendanceStatus === "NOT_MARKED" ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Not Marked
                            </span>
                          ) : (
                            <StatusBadge status={item.attendanceStatus} />
                          )}
                        </td>
                        <td className="py-3 px-3 text-ink-secondary">
                          {item.checkInTime ? `${item.checkInTime} - ${item.checkOutTime}` : "—"}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleMarkAttendance(item.staffId, "PRESENT")}
                              className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors ${
                                item.attendanceStatus === "PRESENT"
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : "bg-surface hover:bg-emerald-50 text-emerald-700 border-border"
                              }`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(item.staffId, "HALF_DAY")}
                              className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors ${
                                item.attendanceStatus === "HALF_DAY"
                                  ? "bg-amber-600 text-white border-amber-600"
                                  : "bg-surface hover:bg-amber-50 text-amber-700 border-border"
                              }`}
                            >
                              Half-Day
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(item.staffId, "LEAVE")}
                              className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors ${
                                item.attendanceStatus === "LEAVE"
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-surface hover:bg-blue-50 text-blue-700 border-border"
                              }`}
                            >
                              Leave
                            </button>
                            <button
                              onClick={() => handleMarkAttendance(item.staffId, "ABSENT")}
                              className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors ${
                                item.attendanceStatus === "ABSENT"
                                  ? "bg-red-600 text-white border-red-600"
                                  : "bg-surface hover:bg-red-50 text-red-600 border-border"
                              }`}
                            >
                              Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* SECTION 3: STAFF ROSTER & COMPENSATION */}
      {activeTab === "roster" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-background text-ink-secondary border-b border-border uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3 font-semibold">Staff Code</th>
                  <th className="py-3 px-3 font-semibold">Full Name</th>
                  <th className="py-3 px-3 font-semibold">Role</th>
                  <th className="py-3 px-3 font-semibold">Phone / Email</th>
                  <th className="py-3 px-3 font-semibold">Compensation Model</th>
                  <th className="py-3 px-3 font-semibold">Base Monthly (₹)</th>
                  <th className="py-3 px-3 font-semibold">Scheduled Days</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {staffList.map((s) => (
                  <tr key={s.id} className="hover:bg-background/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-ink-primary">{s.staffCode}</td>
                    <td className="py-3 px-3 font-semibold text-ink-primary">{s.fullName}</td>
                    <td className="py-3 px-3 text-ink-secondary">{s.role.replace(/_/g, " ")}</td>
                    <td className="py-3 px-3 text-ink-secondary">
                      <div>{s.phone}</div>
                      {s.email && <div className="text-[10px]">{s.email}</div>}
                    </td>
                    <td className="py-3 px-3 font-medium text-ink-primary">
                      {s.salaryModel.replace(/_/g, " ")}
                    </td>
                    <td className="py-3 px-3 font-semibold text-primary">{formatCurrency(s.baseSalary)}</td>
                    <td className="py-3 px-3 text-ink-secondary">{s.scheduledWorkingDays} days</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={s.employmentStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL 1: RECORD SALARY PAYOUT */}
      <Modal
        isOpen={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        title="Record Salary Payout"
        description={`Payout to ${selectedPayroll?.fullName} (${payrollMonth}/${payrollYear})`}
        maxWidth="md"
      >
        <form onSubmit={handleRecordPayout} className="space-y-4 text-xs">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
            <div className="text-emerald-800">
              Remaining Balance Payable:{" "}
              <strong className="text-sm font-bold text-emerald-900">
                {formatCurrency(selectedPayroll?.remainingBalance || 0)}
              </strong>
            </div>
            <div className="text-ink-secondary mt-1">
              Includes Base Attendance Earnings + 70% PT Commissions
            </div>
          </div>

          <div>
            <label className="block font-medium text-ink-primary mb-1">Payout Amount (₹) *</label>
            <input
              type="number"
              required
              min={1}
              max={selectedPayroll?.remainingBalance}
              value={payoutForm.amount}
              onChange={(e) => setPayoutForm({ ...payoutForm, amount: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary font-bold text-base focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block font-medium text-ink-primary mb-1">Payment Method</label>
            <select
              value={payoutForm.paymentMethod}
              onChange={(e) => setPayoutForm({ ...payoutForm, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-ink-primary mb-1">Bank Reference / UTR Number</label>
            <input
              type="text"
              placeholder="e.g. HDFC-NEFT-998822"
              value={payoutForm.referenceNumber}
              onChange={(e) => setPayoutForm({ ...payoutForm, referenceNumber: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setShowPayoutModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Record Salary Payout</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: PRINTABLE SALARY SLIP */}
      <Modal
        isOpen={showSlipModal}
        onClose={() => setShowSlipModal(false)}
        title="Official Salary Statement"
        description={`Period: ${payrollMonth}/${payrollYear}`}
        maxWidth="lg"
      >
        <div className="p-6 bg-white border border-border rounded-xl space-y-6 text-xs text-ink-primary font-sans">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h3 className="text-base font-bold text-ink-primary">IronPulse Fitness Club</h3>
              <p className="text-[11px] text-ink-secondary">Bandra West, Mumbai • Salary Statement</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-primary">
                Period: {payrollMonth}/{payrollYear}
              </span>
              <p className="text-[10px] text-ink-muted">Ref: {selectedPayroll?.staffCode}</p>
            </div>
          </div>

          {/* Employee Meta */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-background rounded-lg text-xs">
            <div>
              <span className="text-ink-secondary">Employee Name:</span>{" "}
              <strong>{selectedPayroll?.fullName}</strong>
            </div>
            <div>
              <span className="text-ink-secondary">Role:</span>{" "}
              <strong>{selectedPayroll?.role?.replace(/_/g, " ")}</strong>
            </div>
            <div>
              <span className="text-ink-secondary">Compensation Model:</span>{" "}
              <strong>{selectedPayroll?.salaryModel?.replace(/_/g, " ")}</strong>
            </div>
            <div>
              <span className="text-ink-secondary">Base Rate:</span>{" "}
              <strong>{formatCurrency(selectedPayroll?.baseSalary || 0)} / month</strong>
            </div>
          </div>

          {/* Attendance Units Breakdown */}
          <div>
            <h4 className="font-semibold text-ink-primary uppercase tracking-wider text-[11px] mb-2">
              Attendance Units & Daily Rate Breakdown
            </h4>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-background text-ink-secondary border-b border-border">
                  <tr>
                    <th className="py-2 px-3">Metric</th>
                    <th className="py-2 px-3">Days / Units</th>
                    <th className="py-2 px-3 text-right">Calculation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-2 px-3">Scheduled Working Days</td>
                    <td className="py-2 px-3">{selectedPayroll?.scheduledWorkingDays} days</td>
                    <td className="py-2 px-3 text-right">Basis</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Daily Rate</td>
                    <td className="py-2 px-3 font-semibold">{formatCurrency(selectedPayroll?.dailyRate || 0)}</td>
                    <td className="py-2 px-3 text-right text-ink-secondary">Base ÷ Scheduled Days</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Present Days</td>
                    <td className="py-2 px-3 text-emerald-700">{selectedPayroll?.presentDays} days (1.0 unit)</td>
                    <td className="py-2 px-3 text-right">{selectedPayroll?.presentDays} units</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Half-Days</td>
                    <td className="py-2 px-3 text-amber-700">{selectedPayroll?.halfDays} days (0.5 unit)</td>
                    <td className="py-2 px-3 text-right">{(selectedPayroll?.halfDays || 0) * 0.5} units</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Unpaid Absences</td>
                    <td className="py-2 px-3 text-red-600">{selectedPayroll?.absentDays} days</td>
                    <td className="py-2 px-3 text-right">0 units</td>
                  </tr>
                  <tr className="bg-background font-semibold">
                    <td className="py-2 px-3">Attendance Earnings</td>
                    <td className="py-2 px-3">{selectedPayroll?.attendanceUnitsEarned} total units</td>
                    <td className="py-2 px-3 text-right text-emerald-700">
                      {formatCurrency(selectedPayroll?.attendanceEarnings || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* PT Commissions Included */}
          {selectedPayroll?.ptCommissionEarned > 0 && (
            <div>
              <h4 className="font-semibold text-ink-primary uppercase tracking-wider text-[11px] mb-2">
                Personal Training Commissions Earned (70% Split)
              </h4>
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg flex items-center justify-between">
                <span>Total 70% PT Commissions from actual cash received:</span>
                <strong className="text-blue-700 text-sm">
                  {formatCurrency(selectedPayroll?.ptCommissionEarned)}
                </strong>
              </div>
            </div>
          )}

          {/* Net Summary */}
          <div className="pt-4 border-t border-border flex items-center justify-between text-sm font-bold">
            <div>Net Salary Payable:</div>
            <div className="text-primary text-base">
              {formatCurrency(selectedPayroll?.netSalaryPayable || 0)}
            </div>
          </div>

          <div className="no-print pt-4 flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" />
              Print Slip
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: ADD STAFF ROSTER PROFILE */}
      <Modal
        isOpen={showAddStaffModal}
        onClose={() => setShowAddStaffModal(false)}
        title="Add Staff Member"
        description="Register employee profile and configure compensation model"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Aditya Roy"
                value={staffForm.fullName}
                onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
              />
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                placeholder="+91 98200 12345"
                value={staffForm.phone}
                onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Staff Role *</label>
              <select
                value={staffForm.role}
                onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
              >
                <option value="PERSONAL_TRAINER">Personal Trainer</option>
                <option value="GYM_TRAINER">Gym Trainer (Floor)</option>
                <option value="RECEPTIONIST">Receptionist</option>
                <option value="MANAGER">Manager</option>
                <option value="CLEANER">Housekeeping</option>
                <option value="OTHER">Other Staff</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Salary Model *</label>
              <select
                value={staffForm.salaryModel}
                onChange={(e) => setStaffForm({ ...staffForm, salaryModel: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
              >
                <option value="ATTENDANCE_BASED">Attendance-Based (Daily Unit Formula)</option>
                <option value="FIXED_MONTHLY">Fixed Monthly (Prorated for Absences)</option>
                <option value="HYBRID">Hybrid (Base Attendance + Commissions)</option>
                <option value="COMMISSION_ONLY">Commission Only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Base Monthly Salary (₹)</label>
              <input
                type="number"
                value={staffForm.baseSalary}
                onChange={(e) => setStaffForm({ ...staffForm, baseSalary: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary font-bold text-primary"
              />
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Scheduled Working Days</label>
              <input
                type="number"
                value={staffForm.scheduledWorkingDays}
                onChange={(e) => setStaffForm({ ...staffForm, scheduledWorkingDays: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-ink-primary mb-1">Bank Payout Details (Protected)</label>
            <input
              type="text"
              placeholder="e.g. HDFC Bank - A/C 50100998877 - IFSC HDFC0000123"
              value={staffForm.bankDetails}
              onChange={(e) => setStaffForm({ ...staffForm, bankDetails: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setShowAddStaffModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Staff Profile</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
