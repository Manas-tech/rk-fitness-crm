"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, calculateOutstandingBalance } from "@/lib/calculations";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  Calendar,
  AlertTriangle,
  CreditCard,
  RefreshCw,
  Phone,
  Mail,
  UserX,
  UserCheck,
  ChevronRight,
  Clock,
  History,
  Pencil,
} from "lucide-react";

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [expiryFilter, setExpiryFilter] = useState("");
  const [search, setSearch] = useState("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // Edit Member Form
  const [editMemberForm, setEditMemberForm] = useState({
    id: "",
    fullName: "",
    phone: "",
    email: "",
    gender: "Male",
    dateOfBirth: "",
    address: "",
    emergencyContact: "",
    assignedTrainerId: "",
    internalNotes: "",
  });

  // Add Member Form
  const [addForm, setAddForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    gender: "Male",
    dateOfBirth: "",
    address: "",
    emergencyContact: "",
    planId: "",
    startDate: new Date().toISOString().split("T")[0],
    price: 3000,
    discount: 0,
    amountPaid: 3000,
    paymentMethod: "UPI",
    assignedTrainerId: "",
    internalNotes: "",
    allowDuplicatePhone: false,
  });

  // Duplicate Phone Warning dialog
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

  // Payment Form
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMethod: "UPI",
    referenceNumber: "",
    notes: "",
  });

  // Renewal Form
  const [renewForm, setRenewForm] = useState({
    planId: "",
    startDate: new Date().toISOString().split("T")[0],
    price: 3000,
    discount: 0,
    amountPaid: 3000,
    paymentMethod: "UPI",
    referenceNumber: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/api/members?status=${statusFilter}&planId=${planFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (expiryFilter) url += `&expiry=${expiryFilter}`;

      const res = await fetch(url);
      const data = await res.json();
      setMembers(data.members || []);
      setCounts(data.counts || {});

      // Also fetch plans and trainers if not loaded
      if (plans.length === 0) {
        const planRes = await fetch("/api/settings/membership-plans");
        const planData = await planRes.json();
        setPlans(planData.plans || []);
        if (planData.plans?.length > 0) {
          setAddForm((prev) => ({
            ...prev,
            planId: planData.plans[0].id,
            price: planData.plans[0].defaultPrice,
            amountPaid: planData.plans[0].defaultPrice,
          }));
        }
      }

      if (trainers.length === 0) {
        const staffRes = await fetch("/api/staff");
        const staffData = await staffRes.json();
        setTrainers(staffData.staff?.filter((s: any) => s.role === "PERSONAL_TRAINER" || s.role === "GYM_TRAINER") || []);
      }
    } catch (err) {
      console.error("Failed to load members:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, planFilter, expiryFilter, search]);

  // Handle plan change in Add form to auto-update default price
  const handlePlanChange = (planId: string) => {
    const selected = plans.find((p) => p.id === planId);
    if (selected) {
      const finalAmt = Math.max(0, selected.defaultPrice - Number(addForm.discount || 0));
      setAddForm({
        ...addForm,
        planId,
        price: selected.defaultPrice,
        amountPaid: finalAmt,
      });
    }
  };

  // Handle member creation
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });

      const data = await res.json();

      if (res.status === 409 && data.warning === "DUPLICATE_PHONE") {
        setDuplicateWarning(data);
        return;
      }

      if (!res.ok) {
        alert(data.error || "Failed to create member");
        return;
      }

      setShowAddModal(false);
      setDuplicateWarning(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Network error");
    }
  };

  // Handle record payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    try {
      const res = await fetch(`/api/members/${selectedMember.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentForm),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to record payment");
        return;
      }
      setShowPaymentModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle renewal
  const handleRenewMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    try {
      const res = await fetch(`/api/members/${selectedMember.id}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(renewForm),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to renew membership");
        return;
      }
      setShowRenewModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Open Edit Member modal
  const handleOpenEditMember = (member: any) => {
    setEditMemberForm({
      id: member.id,
      fullName: member.fullName || "",
      phone: member.phone || "",
      email: member.email || "",
      gender: member.gender || "Male",
      dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth).toISOString().split("T")[0] : "",
      address: member.address || "",
      emergencyContact: member.emergencyContact || "",
      assignedTrainerId: member.assignedTrainerId || member.assignedTrainer?.id || "",
      internalNotes: member.internalNotes || "",
    });
    setShowEditMemberModal(true);
  };

  // Save Edit Member
  const handleSaveEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/members/${editMemberForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editMemberForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update member");
      setShowEditMemberModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Toggle member deactivation
  const handleToggleDeactivate = async (member: any) => {
    const isDeactivating = member.status === "ACTIVE";
    const reason = isDeactivating
      ? prompt("Enter reason for deactivation (e.g., Relocation, Medical, Pause):")
      : null;

    if (isDeactivating && reason === null) return;

    try {
      await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: isDeactivating ? "DEACTIVATED" : "ACTIVE",
          deactivationReason: isDeactivating ? reason : null,
        }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "Member ID",
      "Full Name",
      "Phone",
      "Email",
      "Membership Plan",
      "Start Date",
      "Expiry Date",
      "Status",
      "Amount Paid",
      "Outstanding Balance",
      "Assigned Trainer",
    ];

    const rows = members.map((m) => {
      const rec = m.membershipRecords?.[0];
      return [
        m.memberCode,
        `"${m.fullName}"`,
        m.phone,
        m.email || "",
        rec?.planName || "",
        rec?.startDate ? new Date(rec.startDate).toISOString().split("T")[0] : "",
        rec?.endDate ? new Date(rec.endDate).toISOString().split("T")[0] : "",
        m.status,
        rec?.amountPaid || 0,
        rec?.outstandingBalance || 0,
        m.assignedTrainer?.fullName || "None",
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e: any[]) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gym_members_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell>
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-xl font-bold text-ink-primary tracking-tight">
            Member Management & Subscriptions
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            Active rosters, membership renewal cycles, balances, and trainer assignments
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={handleExportCSV}>
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <UserPlus className="w-3.5 h-3.5" />
            Add New Member
          </Button>
        </div>
      </div>

      {/* Expiry Alert Quick Filters Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => {
            setExpiryFilter("");
            setStatusFilter("ACTIVE");
          }}
          className={`p-3 rounded-xl border text-left transition-all ${
            expiryFilter === "" && statusFilter === "ACTIVE"
              ? "bg-emerald-50/50 border-primary ring-1 ring-primary/20"
              : "bg-surface border-border hover:bg-background"
          }`}
        >
          <div className="flex items-center justify-between text-ink-secondary text-xs">
            <span>Active Members</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-lg font-bold text-ink-primary mt-1">
            {counts.active || 0}
          </div>
        </button>

        <button
          onClick={() => {
            setExpiryFilter("7_days");
            setStatusFilter("ALL");
          }}
          className={`p-3 rounded-xl border text-left transition-all ${
            expiryFilter === "7_days"
              ? "bg-amber-50/50 border-amber-500 ring-1 ring-amber-500/20"
              : "bg-surface border-border hover:bg-background"
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 text-xs">
            <span className="font-medium">Expiring in 7 Days</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-amber-600 mt-1">
            {counts.expiringIn7 || 0}
          </div>
        </button>

        <button
          onClick={() => {
            setExpiryFilter("30_days");
            setStatusFilter("ALL");
          }}
          className={`p-3 rounded-xl border text-left transition-all ${
            expiryFilter === "30_days"
              ? "bg-amber-50/50 border-amber-500 ring-1 ring-amber-500/20"
              : "bg-surface border-border hover:bg-background"
          }`}
        >
          <div className="flex items-center justify-between text-ink-secondary text-xs">
            <span>Expiring in 30 Days</span>
            <Clock className="w-4 h-4 text-ink-secondary" />
          </div>
          <div className="text-lg font-bold text-ink-primary mt-1">
            {counts.expiringIn30 || 0}
          </div>
        </button>

        <button
          onClick={() => {
            setExpiryFilter("expired");
            setStatusFilter("EXPIRED");
          }}
          className={`p-3 rounded-xl border text-left transition-all ${
            expiryFilter === "expired" || statusFilter === "EXPIRED"
              ? "bg-red-50/50 border-red-500 ring-1 ring-red-500/20"
              : "bg-surface border-border hover:bg-background"
          }`}
        >
          <div className="flex items-center justify-between text-red-700 text-xs">
            <span className="font-medium">Expired Members</span>
            <UserX className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-lg font-bold text-red-600 mt-1">
            {counts.expired || 0}
          </div>
        </button>
      </div>

      {/* Dual Independent Filter Bar & Search */}
      <div className="bg-surface border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search name, phone, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg bg-background text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Filter 1: Membership Status */}
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
            <span className="font-medium text-[11px] uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setExpiryFilter("");
              }}
              className="px-2.5 py-1.5 text-xs border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="NON_ACTIVE">Non-Active (Expired & Deactivated)</option>
              <option value="EXPIRED">Expired</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>
          </div>

          {/* Filter 2: Membership Plan */}
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
            <span className="font-medium text-[11px] uppercase tracking-wider">Plan:</span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {(statusFilter !== "ALL" || planFilter !== "ALL" || expiryFilter || search) && (
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setPlanFilter("ALL");
                setExpiryFilter("");
                setSearch("");
              }}
              className="text-xs text-primary hover:underline font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>

        <div className="text-xs text-ink-secondary">
          Showing <strong className="text-ink-primary">{members.length}</strong> members
        </div>
      </div>

      {/* Members Data Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-background text-ink-secondary border-b border-border uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3 font-semibold">Member</th>
                <th className="py-3 px-3 font-semibold">Phone / Email</th>
                <th className="py-3 px-3 font-semibold">Plan</th>
                <th className="py-3 px-3 font-semibold">Start Date</th>
                <th className="py-3 px-3 font-semibold">Expiry Date</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold">Paid</th>
                <th className="py-3 px-3 font-semibold">Balance Due</th>
                <th className="py-3 px-3 font-semibold">Trainer</th>
                <th className="py-3 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-ink-muted">
                    Loading members...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-ink-muted">
                    No members match the selected status and plan filters.
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const currentRec = member.membershipRecords?.[0];
                  const hasDue = currentRec?.outstandingBalance > 0;
                  const isExpired = currentRec?.endDate && new Date(currentRec.endDate) < new Date();

                  return (
                    <tr key={member.id} className="hover:bg-background/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-ink-primary">{member.fullName}</div>
                        <div className="font-mono text-[10px] text-ink-secondary">{member.memberCode}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-ink-primary">{member.phone}</div>
                        {member.email && (
                          <div className="text-[11px] text-ink-secondary truncate max-w-[140px]">
                            {member.email}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-medium text-ink-primary">
                        {currentRec?.planName || "No Plan"}
                      </td>
                      <td className="py-3 px-3 text-ink-secondary">
                        {currentRec?.startDate
                          ? new Date(currentRec.startDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="py-3 px-3">
                        <span className={isExpired ? "text-red-600 font-semibold" : "text-ink-primary"}>
                          {currentRec?.endDate
                            ? new Date(currentRec.endDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={member.status} />
                        {member.deactivationReason && (
                          <div className="text-[10px] text-ink-muted mt-0.5 truncate max-w-[100px]" title={member.deactivationReason}>
                            {member.deactivationReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-medium text-ink-primary">
                        {formatCurrency(currentRec?.amountPaid || 0)}
                      </td>
                      <td className="py-3 px-3">
                        {hasDue ? (
                          <span className="font-semibold text-amber-600">
                            {formatCurrency(currentRec.outstandingBalance)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">₹0 (Paid)</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-ink-secondary">
                        {member.assignedTrainer?.fullName || "Unassigned"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasDue && (
                            <button
                              onClick={() => {
                                setSelectedMember(member);
                                setPaymentForm({
                                  amount: currentRec.outstandingBalance,
                                  paymentMethod: "UPI",
                                  referenceNumber: "",
                                  notes: "",
                                });
                                setShowPaymentModal(true);
                              }}
                              className="px-2 py-1 text-[11px] font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 rounded border border-amber-200 transition-colors"
                              title="Record Due Payment"
                            >
                              Pay Due
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedMember(member);
                              setRenewForm({
                                planId: currentRec?.planId || plans[0]?.id || "",
                                startDate: new Date().toISOString().split("T")[0],
                                price: currentRec?.price || 3000,
                                discount: 0,
                                amountPaid: currentRec?.price || 3000,
                                paymentMethod: "UPI",
                                referenceNumber: "",
                              });
                              setShowRenewModal(true);
                            }}
                            className="px-2 py-1 text-[11px] font-medium bg-primary-light text-primary hover:bg-primary/20 rounded border border-primary/20 transition-colors flex items-center gap-1"
                            title="Renew Membership Period"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Renew
                          </button>
                          <button
                            onClick={async () => {
                              const res = await fetch(`/api/members/${member.id}`);
                              const data = await res.json();
                              setSelectedMember(data.member);
                              setShowProfileModal(true);
                            }}
                            className="p-1 text-ink-secondary hover:text-ink-primary hover:bg-background rounded transition-colors"
                            title="View Full Profile"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditMember(member)}
                            className="px-2 py-1 text-[11px] font-medium bg-background text-ink-primary hover:bg-border/60 rounded border border-border transition-colors flex items-center gap-1"
                            title="Edit Member Information"
                          >
                            <Pencil className="w-3 h-3 text-ink-secondary" />
                            Edit
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

      {/* MODAL 1: ADD NEW MEMBER */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setDuplicateWarning(null);
        }}
        title="Add New Gym Member"
        description="Create member account and record initial subscription details"
        maxWidth="xl"
      >
        {duplicateWarning && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-800">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Matching Phone Number Detected
            </div>
            <p className="mt-1">{duplicateWarning.message}</p>
            <div className="mt-2.5 flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setAddForm({ ...addForm, allowDuplicatePhone: true });
                  setDuplicateWarning(null);
                }}
              >
                Confirm Shared Phone & Proceed
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDuplicateWarning(null)}
              >
                Cancel / Edit Number
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleCreateMember} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={addForm.fullName}
                onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                placeholder="e.g. Siddharth Malhotra"
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                placeholder="+91 98200 12345"
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Email (Optional)</label>
              <input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="siddharth@example.com"
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Gender</label>
              <select
                value={addForm.gender}
                onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <h4 className="font-semibold text-ink-primary uppercase tracking-wider text-[11px] mb-2.5">
              Membership Subscription & Pricing
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-ink-primary mb-1">Membership Plan *</label>
                <select
                  value={addForm.planId}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.durationDays} days - ₹{p.defaultPrice})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-ink-primary mb-1">Start Date *</label>
                <input
                  type="date"
                  required
                  value={addForm.startDate}
                  onChange={(e) => setAddForm({ ...addForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block font-medium text-ink-primary mb-1">Plan Price (₹)</label>
                <input
                  type="number"
                  value={addForm.price}
                  onChange={(e) => setAddForm({ ...addForm, price: Number(e.target.value) })}
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
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary font-semibold text-primary"
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

            {/* Live Calculation Display */}
            <div className="mt-3 p-2.5 bg-background rounded-lg flex items-center justify-between text-xs">
              <span className="text-ink-secondary">
                Payable: ₹{Math.max(0, addForm.price - addForm.discount)} | Paid: ₹{addForm.amountPaid}
              </span>
              <span className="font-semibold text-ink-primary">
                Remaining Balance Due:{" "}
                <span className={addForm.price - addForm.discount - addForm.amountPaid > 0 ? "text-amber-600 font-bold" : "text-emerald-600"}>
                  ₹{calculateOutstandingBalance(addForm.price - addForm.discount, addForm.amountPaid)}
                </span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-border pt-3">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Assigned Trainer (Optional)</label>
              <select
                value={addForm.assignedTrainerId}
                onChange={(e) => setAddForm({ ...addForm, assignedTrainerId: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">No Trainer Assigned</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.role.replace(/_/g, " ")})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Emergency Contact</label>
              <input
                type="text"
                value={addForm.emergencyContact}
                onChange={(e) => setAddForm({ ...addForm, emergencyContact: e.target.value })}
                placeholder="Name & Contact number"
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Member</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: RECORD PAYMENT */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Membership Due Payment"
        description={`Record payment for ${selectedMember?.fullName} (${selectedMember?.memberCode})`}
        maxWidth="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="text-amber-800">
              Outstanding Balance:{" "}
              <strong className="font-bold text-sm text-amber-900">
                {formatCurrency(selectedMember?.membershipRecords?.[0]?.outstandingBalance || 0)}
              </strong>
            </div>
          </div>

          <div>
            <label className="block font-medium text-ink-primary mb-1">Payment Amount (₹) *</label>
            <input
              type="number"
              required
              min={1}
              max={selectedMember?.membershipRecords?.[0]?.outstandingBalance}
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary font-bold text-base focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

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

          <div>
            <label className="block font-medium text-ink-primary mb-1">Reference / UTR Number</label>
            <input
              type="text"
              placeholder="e.g. UPI/123456789"
              value={paymentForm.referenceNumber}
              onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Record Payment</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: RENEW MEMBERSHIP */}
      <Modal
        isOpen={showRenewModal}
        onClose={() => setShowRenewModal(false)}
        title="Renew Membership"
        description={`Renew membership for ${selectedMember?.fullName} (Preserves historical periods)`}
        maxWidth="md"
      >
        <form onSubmit={handleRenewMember} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-ink-primary mb-1">Select Renewal Plan *</label>
            <select
              value={renewForm.planId}
              onChange={(e) => {
                const plan = plans.find((p) => p.id === e.target.value);
                setRenewForm({
                  ...renewForm,
                  planId: e.target.value,
                  price: plan?.defaultPrice || 3000,
                  amountPaid: plan?.defaultPrice || 3000,
                });
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.durationDays} days - ₹{p.defaultPrice})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Renewal Start Date *</label>
              <input
                type="date"
                required
                value={renewForm.startDate}
                onChange={(e) => setRenewForm({ ...renewForm, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Plan Price (₹)</label>
              <input
                type="number"
                value={renewForm.price}
                onChange={(e) => setRenewForm({ ...renewForm, price: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Discount (₹)</label>
              <input
                type="number"
                value={renewForm.discount}
                onChange={(e) => setRenewForm({ ...renewForm, discount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Amount Paid Now (₹)</label>
              <input
                type="number"
                value={renewForm.amountPaid}
                onChange={(e) => setRenewForm({ ...renewForm, amountPaid: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-ink-primary mb-1">Payment Method</label>
            <select
              value={renewForm.paymentMethod}
              onChange={(e) => setRenewForm({ ...renewForm, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Credit/Debit Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setShowRenewModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Complete Renewal</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: FULL MEMBER PROFILE DRAWER */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title={selectedMember?.fullName || "Member Profile"}
        description={`Code: ${selectedMember?.memberCode} | Registered Phone: ${selectedMember?.phone}`}
        maxWidth="xl"
      >
        <div className="space-y-5 text-xs">
          {/* Member Status Actions */}
          <div className="flex items-center justify-between p-3 bg-background rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-ink-secondary">Current Status:</span>
              <StatusBadge status={selectedMember?.status} />
              {selectedMember?.deactivationReason && (
                <span className="text-[11px] text-ink-secondary italic">
                  ({selectedMember.deactivationReason})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowProfileModal(false);
                  handleOpenEditMember(selectedMember);
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Details
              </Button>
              <Button
                variant={selectedMember?.status === "ACTIVE" ? "danger" : "secondary"}
                size="sm"
                onClick={() => handleToggleDeactivate(selectedMember)}
              >
                {selectedMember?.status === "ACTIVE" ? "Deactivate Member" : "Reactivate Member"}
              </Button>
            </div>
          </div>

          {/* Membership Periods History */}
          <div>
            <h4 className="font-semibold text-ink-primary uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-primary" />
              Historical Membership Periods
            </h4>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-background text-ink-secondary border-b border-border">
                  <tr>
                    <th className="py-2 px-3">Plan</th>
                    <th className="py-2 px-3">Start Date</th>
                    <th className="py-2 px-3">End Date</th>
                    <th className="py-2 px-3">Amount</th>
                    <th className="py-2 px-3">Paid</th>
                    <th className="py-2 px-3">Balance</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedMember?.membershipRecords?.map((r: any) => (
                    <tr key={r.id}>
                      <td className="py-2 px-3 font-medium text-ink-primary">{r.planName}</td>
                      <td className="py-2 px-3 text-ink-secondary">
                        {new Date(r.startDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-2 px-3 text-ink-secondary">
                        {new Date(r.endDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-2 px-3">{formatCurrency(r.finalAmount)}</td>
                      <td className="py-2 px-3 text-emerald-700">{formatCurrency(r.amountPaid)}</td>
                      <td className="py-2 px-3 text-amber-700">{formatCurrency(r.outstandingBalance)}</td>
                      <td className="py-2 px-3">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PT Assignments if any */}
          {selectedMember?.ptContracts?.length > 0 && (
            <div>
              <h4 className="font-semibold text-ink-primary uppercase tracking-wider text-[11px] mb-2">
                Personal Training Assignments
              </h4>
              <div className="border border-border rounded-lg p-3 bg-background/50 space-y-2">
                {selectedMember.ptContracts.map((pt: any) => (
                  <div key={pt.id} className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-ink-primary">{pt.contractCode}</span> - Goal:{" "}
                      {pt.goalCategory.replace(/_/g, " ")} (Trainer: {pt.trainer?.fullName})
                    </div>
                    <StatusBadge status={pt.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL 5: EDIT MEMBER DETAILS */}
      <Modal
        isOpen={showEditMemberModal}
        onClose={() => setShowEditMemberModal(false)}
        title="Edit Member Information"
        description="Update personal details, contact information, and trainer assignment"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEditMember} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={editMemberForm.fullName}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              />
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={editMemberForm.phone}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, phone: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Email Address</label>
              <input
                type="email"
                value={editMemberForm.email}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Gender</label>
              <select
                value={editMemberForm.gender}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, gender: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Date of Birth</label>
              <input
                type="date"
                value={editMemberForm.dateOfBirth}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Assigned Trainer</label>
              <select
                value={editMemberForm.assignedTrainerId}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, assignedTrainerId: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">No Trainer Assigned</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.role.replace(/_/g, " ")})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Emergency Contact</label>
              <input
                type="text"
                placeholder="Name & Contact number"
                value={editMemberForm.emergencyContact}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, emergencyContact: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Address</label>
              <input
                type="text"
                placeholder="Residential address"
                value={editMemberForm.address}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, address: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-ink-primary mb-1">Internal Notes</label>
            <textarea
              rows={2}
              placeholder="Health restrictions, preferences, etc."
              value={editMemberForm.internalNotes}
              onChange={(e) => setEditMemberForm({ ...editMemberForm, internalNotes: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setShowEditMemberModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
