"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, calculatePtRevenueSplit, calculateOutstandingBalance } from "@/lib/calculations";
import {
  Dumbbell,
  UserPlus,
  Search,
  Filter,
  Download,
  Calendar,
  CreditCard,
  UserCheck,
  TrendingUp,
  Percent,
  CheckCircle2,
  ChevronRight,
  Target,
  FileText,
} from "lucide-react";

export default function PersonalTrainingPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [trainerFilter, setTrainerFilter] = useState("ALL");
  const [goalFilter, setGoalFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);

  // Add PT Client Form
  const [addForm, setAddForm] = useState({
    memberId: "",
    newMemberName: "",
    newMemberPhone: "",
    trainerId: "",
    goalCategory: "WEIGHT_LOSS",
    goalDescription: "",
    packageBasis: "MONTHLY",
    totalSessions: 16,
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    contractAmount: 12000,
    discount: 0,
    amountPaid: 12000,
    paymentMethod: "UPI",
    referenceNumber: "",
    notes: "",
  });

  // PT Payment Form
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMethod: "UPI",
    referenceNumber: "",
    notes: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/api/pt-contracts?trainerId=${trainerFilter}&goal=${goalFilter}&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      const data = await res.json();
      setContracts(data.contracts || []);
      setSummary(data.summary || {});

      if (trainers.length === 0) {
        const staffRes = await fetch("/api/staff");
        const staffData = await staffRes.json();
        const ptTrainers = staffData.staff?.filter((s: any) => s.role === "PERSONAL_TRAINER" || s.role === "GYM_TRAINER") || [];
        setTrainers(ptTrainers);
        if (ptTrainers.length > 0) {
          setAddForm((prev) => ({ ...prev, trainerId: ptTrainers[0].id }));
        }
      }

      if (members.length === 0) {
        const memRes = await fetch("/api/members?status=ACTIVE");
        const memData = await memRes.json();
        setMembers(memData.members || []);
        if (memData.members?.length > 0) {
          setAddForm((prev) => ({ ...prev, memberId: memData.members[0].id }));
        }
      }
    } catch (err) {
      console.error("Failed to load PT contracts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [trainerFilter, goalFilter, statusFilter, search]);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        trainerId: addForm.trainerId,
        goalCategory: addForm.goalCategory,
        goalDescription: addForm.goalDescription,
        packageBasis: addForm.packageBasis,
        totalSessions: Number(addForm.totalSessions),
        startDate: addForm.startDate,
        endDate: addForm.endDate,
        contractAmount: Number(addForm.contractAmount),
        discount: Number(addForm.discount || 0),
        amountPaid: Number(addForm.amountPaid || 0),
        paymentMethod: addForm.paymentMethod,
        referenceNumber: addForm.referenceNumber,
        notes: addForm.notes,
      };

      if (addForm.memberId === "NEW") {
        payload.newMemberData = {
          fullName: addForm.newMemberName,
          phone: addForm.newMemberPhone,
        };
      } else {
        payload.memberId = addForm.memberId;
      }

      const res = await fetch("/api/pt-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to create PT contract");
        return;
      }

      setShowAddModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRecordPtPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;
    try {
      const res = await fetch(`/api/pt-contracts/${selectedContract.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentForm),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to record PT payment");
        return;
      }

      setShowPaymentModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Export PT CSV
  const handleExportCSV = () => {
    const headers = [
      "PT Code",
      "Member Name",
      "Trainer",
      "Goal",
      "Package Basis",
      "Sessions",
      "Contract Amount",
      "Paid",
      "Outstanding Balance",
      "Trainer Share (70%)",
      "Gym Share (30%)",
      "Status",
    ];

    const rows = contracts.map((c) => [
      c.contractCode,
      `"${c.member?.fullName || ""}"`,
      `"${c.trainer?.fullName || ""}"`,
      c.goalCategory,
      c.packageBasis,
      `${c.completedSessions}/${c.totalSessions || 0}`,
      c.finalPayable,
      c.amountPaid,
      c.outstandingBalance,
      (c.amountPaid * (c.trainerSharePercent / 100)).toFixed(2),
      (c.amountPaid * (c.gymSharePercent / 100)).toFixed(2),
      c.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e: any[]) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pt_roster_${new Date().toISOString().split("T")[0]}.csv`);
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
            Personal Training & Revenue Sharing (70:30)
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            Individualized training programs, custom client pricing, and verified trainer commissions
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={handleExportCSV}>
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <UserPlus className="w-3.5 h-3.5" />
            Add PT Client
          </Button>
        </div>
      </div>

      {/* PT Revenue Sharing Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Active PT Clients</span>
            <Dumbbell className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-ink-primary">
            {summary.totalActivePt || 0}
          </div>
          <div className="text-[11px] text-ink-secondary mt-1">Ongoing contracts</div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Eligible Revenue</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl font-bold text-ink-primary">
            {formatCurrency(summary.totalEligiblePtRevenue || 0)}
          </div>
          <div className="text-[11px] text-ink-secondary mt-1">Cash received from PT</div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Trainers Share (70%)</span>
            <Percent className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-blue-700">
            {formatCurrency(summary.totalTrainerShareEarned || 0)}
          </div>
          <div className="text-[11px] text-ink-secondary mt-1">Calculated commission</div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Gym Share (30%)</span>
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl font-bold text-primary">
            {formatCurrency(summary.totalGymShareRetained || 0)}
          </div>
          <div className="text-[11px] text-ink-secondary mt-1">Gym retained margin</div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Pending Payouts</span>
            <CreditCard className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-600">
            {formatCurrency(summary.pendingCommissionPayouts || 0)}
          </div>
          <div className="text-[11px] text-ink-secondary mt-1">To settle in payroll</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search member, trainer, PT code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg bg-background text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
            <span className="font-medium text-[11px] uppercase tracking-wider">Trainer:</span>
            <select
              value={trainerFilter}
              onChange={(e) => setTrainerFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Trainers</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
            <span className="font-medium text-[11px] uppercase tracking-wider">Goal:</span>
            <select
              value={goalFilter}
              onChange={(e) => setGoalFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Goals</option>
              <option value="WEIGHT_LOSS">Weight Loss</option>
              <option value="MUSCLE_GAIN">Muscle Gain</option>
              <option value="STRENGTH">Strength Training</option>
              <option value="GENERAL_FITNESS">General Fitness</option>
              <option value="BODY_TRANSFORMATION">Body Transformation</option>
              <option value="REHAB">Rehabilitation</option>
              <option value="CUSTOM">Custom Goal</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
            <span className="font-medium text-[11px] uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-ink-secondary">
          Showing <strong className="text-ink-primary">{contracts.length}</strong> PT contracts
        </div>
      </div>

      {/* PT Clients Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-background text-ink-secondary border-b border-border uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3 font-semibold">Contract</th>
                <th className="py-3 px-3 font-semibold">Member</th>
                <th className="py-3 px-3 font-semibold">Assigned Trainer</th>
                <th className="py-3 px-3 font-semibold">Goal</th>
                <th className="py-3 px-3 font-semibold">Agreed Price</th>
                <th className="py-3 px-3 font-semibold">Paid</th>
                <th className="py-3 px-3 font-semibold">Due</th>
                <th className="py-3 px-3 font-semibold">Trainer Share (70%)</th>
                <th className="py-3 px-3 font-semibold">Gym Share (30%)</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-xs text-ink-muted">
                    Loading PT roster...
                  </td>
                </tr>
              ) : contracts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-xs text-ink-muted">
                    No PT contracts found matching your filters.
                  </td>
                </tr>
              ) : (
                contracts.map((c) => {
                  const hasDue = c.outstandingBalance > 0;
                  const trainerShare = (c.amountPaid * (c.trainerSharePercent / 100));
                  const gymShare = (c.amountPaid * (c.gymSharePercent / 100));

                  return (
                    <tr key={c.id} className="hover:bg-background/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-medium text-ink-primary">
                        {c.contractCode}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-ink-primary">{c.member?.fullName}</div>
                        <div className="text-[10px] text-ink-secondary">{c.member?.memberCode}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-ink-primary">{c.trainer?.fullName}</div>
                        <div className="text-[10px] text-ink-secondary">{c.trainer?.staffCode}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                          {c.goalCategory.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-ink-primary">
                        {formatCurrency(c.finalPayable)}
                      </td>
                      <td className="py-3 px-3 font-medium text-emerald-700">
                        {formatCurrency(c.amountPaid)}
                      </td>
                      <td className="py-3 px-3">
                        {hasDue ? (
                          <span className="font-semibold text-amber-600">
                            {formatCurrency(c.outstandingBalance)}
                          </span>
                        ) : (
                          <span className="text-emerald-600">₹0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold text-blue-700">
                        {formatCurrency(trainerShare)}
                      </td>
                      <td className="py-3 px-3 font-medium text-primary">
                        {formatCurrency(gymShare)}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasDue && (
                            <button
                              onClick={() => {
                                setSelectedContract(c);
                                setPaymentForm({
                                  amount: c.outstandingBalance,
                                  paymentMethod: "UPI",
                                  referenceNumber: "",
                                  notes: "",
                                });
                                setShowPaymentModal(true);
                              }}
                              className="px-2 py-1 text-[11px] font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 rounded border border-amber-200"
                              title="Record Due Installment"
                            >
                              Pay Due
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              const res = await fetch(`/api/pt-contracts/${c.id}`);
                              const data = await res.json();
                              setSelectedContract(data.contract);
                              setShowProfileModal(true);
                            }}
                            className="p-1 text-ink-secondary hover:text-ink-primary hover:bg-background rounded"
                            title="View PT Profile & Progress"
                          >
                            <ChevronRight className="w-4 h-4" />
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

      {/* MODAL: ADD PT CLIENT */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create Customized Personal Training Contract"
        description="Individualized goals, agreed pricing, and 70:30 commission split"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateContract} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Select Member *</label>
              <select
                value={addForm.memberId}
                onChange={(e) => setAddForm({ ...addForm, memberId: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="NEW">+ Register New Member Inline</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.memberCode} - {m.phone})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Assign Trainer *</label>
              <select
                value={addForm.trainerId}
                onChange={(e) => setAddForm({ ...addForm, trainerId: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.staffCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {addForm.memberId === "NEW" && (
            <div className="p-3 bg-background border border-border rounded-lg grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-ink-primary mb-1">New Member Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Varun Dhawan"
                  value={addForm.newMemberName}
                  onChange={(e) => setAddForm({ ...addForm, newMemberName: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
                />
              </div>
              <div>
                <label className="block font-medium text-ink-primary mb-1">New Member Phone *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98200 99881"
                  value={addForm.newMemberPhone}
                  onChange={(e) => setAddForm({ ...addForm, newMemberPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
                />
              </div>
            </div>
          )}

          {/* Goal Setting */}
          <div className="border-t border-border pt-3">
            <h4 className="font-semibold text-ink-primary uppercase tracking-wider text-[11px] mb-2">
              Individualized Goal & Sessions
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-ink-primary mb-1">Primary Goal</label>
                <select
                  value={addForm.goalCategory}
                  onChange={(e) => setAddForm({ ...addForm, goalCategory: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="WEIGHT_LOSS">Weight Loss</option>
                  <option value="MUSCLE_GAIN">Muscle Gain</option>
                  <option value="STRENGTH">Strength Training</option>
                  <option value="GENERAL_FITNESS">General Fitness</option>
                  <option value="BODY_TRANSFORMATION">Body Transformation</option>
                  <option value="REHAB">Rehabilitation</option>
                  <option value="CUSTOM">Custom Goal</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-ink-primary mb-1">Package Basis</label>
                <select
                  value={addForm.packageBasis}
                  onChange={(e) => setAddForm({ ...addForm, packageBasis: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="MONTHLY">Monthly (16 sessions)</option>
                  <option value="FIXED_DURATION">Fixed Package (24 sessions)</option>
                  <option value="PER_SESSION">Per Session Rate</option>
                  <option value="CUSTOM">Custom Duration</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-ink-primary mb-1">Total Sessions</label>
                <input
                  type="number"
                  value={addForm.totalSessions}
                  onChange={(e) => setAddForm({ ...addForm, totalSessions: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="block font-medium text-ink-primary mb-1">Custom Goal Notes & Instructions</label>
              <input
                type="text"
                placeholder="e.g. Focus on shoulder rehab and mobility, 4 sessions/week"
                value={addForm.goalDescription}
                onChange={(e) => setAddForm({ ...addForm, goalDescription: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Pricing & 70/30 Split Calculation */}
          <div className="border-t border-border pt-3">
            <h4 className="font-semibold text-ink-primary uppercase tracking-wider text-[11px] mb-2">
              Customized Pricing & Split Preview
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block font-medium text-ink-primary mb-1">Agreed Price (₹) *</label>
                <input
                  type="number"
                  required
                  value={addForm.contractAmount}
                  onChange={(e) => setAddForm({ ...addForm, contractAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block font-medium text-ink-primary mb-1">Discount (₹)</label>
                <input
                  type="number"
                  value={addForm.discount}
                  onChange={(e) => setAddForm({ ...addForm, discount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block font-medium text-ink-primary mb-1">Amount Paid Now (₹)</label>
                <input
                  type="number"
                  value={addForm.amountPaid}
                  onChange={(e) => setAddForm({ ...addForm, amountPaid: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block font-medium text-ink-primary mb-1">Payment Method</label>
                <select
                  value={addForm.paymentMethod}
                  onChange={(e) => setAddForm({ ...addForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Credit/Debit Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
            </div>

            {/* Split Preview Banner */}
            <div className="mt-3 p-3 bg-background border border-border rounded-lg flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-ink-secondary">Eligible Received: </span>
                <strong className="text-ink-primary">₹{addForm.amountPaid}</strong>
                <span className="text-ink-muted ml-2">
                  (Balance Due: ₹{calculateOutstandingBalance(addForm.contractAmount - addForm.discount, addForm.amountPaid)})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-blue-700 font-semibold">
                  Trainer (70%): ₹{(addForm.amountPaid * 0.7).toFixed(2)}
                </span>
                <span className="text-primary font-semibold">
                  Gym (30%): ₹{(addForm.amountPaid * 0.3).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create PT Contract</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: RECORD PT PAYMENT */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record PT Installment Payment"
        description={`Record payment for ${selectedContract?.contractCode} (${selectedContract?.member?.fullName})`}
        maxWidth="md"
      >
        <form onSubmit={handleRecordPtPayment} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="text-amber-800">
              Outstanding PT Due:{" "}
              <strong className="font-bold text-sm text-amber-900">
                {formatCurrency(selectedContract?.outstandingBalance || 0)}
              </strong>
            </div>
          </div>

          <div>
            <label className="block font-medium text-ink-primary mb-1">Payment Amount (₹) *</label>
            <input
              type="number"
              required
              min={1}
              max={selectedContract?.outstandingBalance}
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary font-bold text-base focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {paymentForm.amount > 0 && (
            <div className="p-2.5 bg-background rounded-lg text-xs space-y-1">
              <div className="font-medium text-ink-primary">Automatic Commission Allocation:</div>
              <div className="text-blue-700">
                Trainer Share (70%): ₹{(paymentForm.amount * 0.7).toFixed(2)}
              </div>
              <div className="text-primary">
                Gym Retained Share (30%): ₹{(paymentForm.amount * 0.3).toFixed(2)}
              </div>
            </div>
          )}

          <div>
            <label className="block font-medium text-ink-primary mb-1">Payment Method</label>
            <select
              value={paymentForm.paymentMethod}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Credit/Debit Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Record Payment & Generate Commission</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: PT CLIENT PROFILE */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title={selectedContract?.contractCode || "PT Contract Details"}
        description={`Member: ${selectedContract?.member?.fullName} | Trainer: ${selectedContract?.trainer?.fullName}`}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3 p-3 bg-background rounded-lg">
            <div>
              <span className="text-ink-secondary">Goal:</span>{" "}
              <strong className="text-ink-primary">{selectedContract?.goalCategory?.replace(/_/g, " ")}</strong>
            </div>
            <div>
              <span className="text-ink-secondary">Sessions:</span>{" "}
              <strong className="text-ink-primary">
                {selectedContract?.completedSessions} / {selectedContract?.totalSessions} completed
              </strong>
            </div>
            <div>
              <span className="text-ink-secondary">Contract Amount:</span>{" "}
              <strong className="text-ink-primary">{formatCurrency(selectedContract?.finalPayable || 0)}</strong>
            </div>
            <div>
              <span className="text-ink-secondary">Balance Due:</span>{" "}
              <strong className="text-amber-600">{formatCurrency(selectedContract?.outstandingBalance || 0)}</strong>
            </div>
          </div>

          {/* Audit trail of commission records */}
          <div>
            <h4 className="font-semibold text-ink-primary uppercase tracking-wider text-[11px] mb-2">
              Auditable Commission Transactions (70/30 Split)
            </h4>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-background text-ink-secondary border-b border-border">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Amount Received</th>
                    <th className="py-2 px-3">Trainer (70%)</th>
                    <th className="py-2 px-3">Gym (30%)</th>
                    <th className="py-2 px-3">Payroll Settlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedContract?.commissionRecords?.map((r: any) => (
                    <tr key={r.id}>
                      <td className="py-2 px-3 text-ink-secondary">
                        {new Date(r.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-2 px-3 font-medium text-ink-primary">
                        {formatCurrency(r.paymentAmountReceived)}
                      </td>
                      <td className="py-2 px-3 font-semibold text-blue-700">
                        {formatCurrency(r.trainerShareEarned)}
                      </td>
                      <td className="py-2 px-3 font-medium text-primary">
                        {formatCurrency(r.gymShareRetained)}
                      </td>
                      <td className="py-2 px-3">
                        <StatusBadge status={r.settlementStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
