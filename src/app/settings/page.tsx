"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/calculations";
import {
  Settings as SettingsIcon,
  Building,
  Percent,
  Layers,
  ShieldCheck,
  History,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  Trash2,
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"gym" | "pt" | "plans" | "audit">("gym");
  const [settings, setSettings] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Plan Modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: "",
    durationDays: 30,
    defaultPrice: 3000,
    description: "",
  });

  // Edit Plan Modal
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [editPlanForm, setEditPlanForm] = useState({
    id: "",
    name: "",
    durationDays: 30,
    defaultPrice: 3000,
    description: "",
    isActive: true,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const setRes = await fetch("/api/settings");
      const setData = await setRes.json();
      setSettings(setData.settings || {});

      const planRes = await fetch("/api/settings/membership-plans");
      const planData = await planRes.json();
      setPlans(planData.plans || []);

      const auditRes = await fetch("/api/audit-logs");
      const auditData = await auditRes.json();
      setAuditLogs(auditData.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);

    // Validate 100% split
    const t = Number(settings.defaultTrainerShare);
    const g = Number(settings.defaultGymShare);
    if (Math.round((t + g) * 10) / 10 !== 100) {
      alert("Trainer share and Gym share combined must equal exactly 100%");
      return;
    }

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update settings");

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/settings/membership-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlan),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create plan");

      setShowPlanModal(false);
      setNewPlan({
        name: "",
        durationDays: 30,
        defaultPrice: 3000,
        description: "",
      });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenEditPlan = (plan: any) => {
    setEditPlanForm({
      id: plan.id,
      name: plan.name,
      durationDays: plan.durationDays,
      defaultPrice: plan.defaultPrice,
      description: plan.description || "",
      isActive: plan.isActive !== undefined ? plan.isActive : true,
    });
    setShowEditPlanModal(true);
  };

  const handleSaveEditPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/settings/membership-plans/${editPlanForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editPlanForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update plan");

      setShowEditPlanModal(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeletePlan = async (plan: any) => {
    if (!confirm(`Are you sure you want to delete or deactivate the plan "${plan.name}"?`)) return;
    try {
      const res = await fetch(`/api/settings/membership-plans/${plan.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete plan");
      if (data.message) alert(data.message);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <AppShell>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-xl font-bold text-ink-primary tracking-tight">
            System & Business Configuration
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            Configure gym profile, PT commission split defaults, membership plans, and audit trails
          </p>
        </div>

        {saveSuccess && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" /> Settings Saved Successfully
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("gym")}
          className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "gym"
              ? "border-primary text-primary"
              : "border-transparent text-ink-secondary hover:text-ink-primary"
          }`}
        >
          Gym Profile & Timezone
        </button>
        <button
          onClick={() => setActiveTab("pt")}
          className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "pt"
              ? "border-primary text-primary"
              : "border-transparent text-ink-secondary hover:text-ink-primary"
          }`}
        >
          PT Commission Split (70:30)
        </button>
        <button
          onClick={() => setActiveTab("plans")}
          className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "plans"
              ? "border-primary text-primary"
              : "border-transparent text-ink-secondary hover:text-ink-primary"
          }`}
        >
          Membership Plans Manager
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "audit"
              ? "border-primary text-primary"
              : "border-transparent text-ink-secondary hover:text-ink-primary"
          }`}
        >
          Live Audit Logs & Security
        </button>
      </div>

      {/* TAB 1: GYM PROFILE */}
      {activeTab === "gym" && settings && (
        <Card title="Gym Business Profile" subtitle="General gym details shown across reports and slips">
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs max-w-2xl">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Gym Name *</label>
              <input
                type="text"
                required
                value={settings.gymName || ""}
                onChange={(e) => setSettings({ ...settings, gymName: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary font-semibold"
              />
            </div>

            <div>
              <label className="block font-medium text-ink-primary mb-1">Gym Physical Address</label>
              <textarea
                rows={2}
                value={settings.address || ""}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-ink-primary mb-1">Phone Number</label>
                <input
                  type="text"
                  value={settings.phone || ""}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
                />
              </div>
              <div>
                <label className="block font-medium text-ink-primary mb-1">Official Email</label>
                <input
                  type="email"
                  value={settings.email || ""}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 border-t border-border pt-3">
              <div>
                <label className="block font-medium text-ink-primary mb-1">Business Timezone</label>
                <select
                  value={settings.timezone || "Asia/Kolkata"}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-ink-primary mb-1">Currency Code & Symbol</label>
                <input
                  type="text"
                  value="INR (₹)"
                  disabled
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-ink-muted cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block font-medium text-ink-primary mb-1">FY Start Month</label>
                <select
                  value={settings.fyStartMonth || 4}
                  onChange={(e) => setSettings({ ...settings, fyStartMonth: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
                >
                  <option value={4}>April (Indian Standard FY)</option>
                  <option value={1}>January (Calendar Year)</option>
                </select>
              </div>
            </div>

            <div className="pt-3">
              <Button type="submit">Save Gym Profile</Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 2: PT COMMISSION SPLIT */}
      {activeTab === "pt" && settings && (
        <Card
          title="Default PT Revenue-Sharing Percentages"
          subtitle="Configure default commission rates for new personal training contracts"
        >
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs max-w-xl">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
              The combined percentage of Trainer Share + Gym Share must always equal 100%. Historical
              transactions retain their immutable snapshot.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-ink-primary mb-1">
                  Default Trainer Share (%) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  min={0}
                  max={100}
                  value={settings.defaultTrainerShare}
                  onChange={(e) => {
                    const t = Number(e.target.value);
                    setSettings({
                      ...settings,
                      defaultTrainerShare: t,
                      defaultGymShare: Math.round((100 - t) * 10) / 10,
                    });
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary font-bold text-base text-blue-700"
                />
              </div>

              <div>
                <label className="block font-medium text-ink-primary mb-1">
                  Default Gym Retained Share (%) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  min={0}
                  max={100}
                  value={settings.defaultGymShare}
                  onChange={(e) => {
                    const g = Number(e.target.value);
                    setSettings({
                      ...settings,
                      defaultGymShare: g,
                      defaultTrainerShare: Math.round((100 - g) * 10) / 10,
                    });
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary font-bold text-base text-primary"
                />
              </div>
            </div>

            <div className="p-3 bg-background rounded-lg border border-border flex items-center justify-between text-xs">
              <span className="text-ink-secondary">Validation Status:</span>
              <span className="font-semibold text-emerald-700">
                {settings.defaultTrainerShare}% Trainer + {settings.defaultGymShare}% Gym = 100% Total
              </span>
            </div>

            <div className="pt-2">
              <Button type="submit">Update Commission Split</Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 3: MEMBERSHIP PLANS */}
      {activeTab === "plans" && (
        <Card
          title="Configurable Membership Plans"
          subtitle="Plans available for new member enrollments and renewals"
          action={
            <Button size="sm" onClick={() => setShowPlanModal(true)}>
              <PlusCircle className="w-3.5 h-3.5" />
              Add Membership Plan
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-background text-ink-secondary border-b border-border uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3 font-semibold">Plan Name</th>
                  <th className="py-3 px-3 font-semibold">Duration (Days)</th>
                  <th className="py-3 px-3 font-semibold">Default Price (₹)</th>
                  <th className="py-3 px-3 font-semibold">Description</th>
                  <th className="py-3 px-3 font-semibold">Active Members</th>
                  <th className="py-3 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plans.map((p) => (
                  <tr key={p.id} className="hover:bg-background/40">
                    <td className="py-3 px-3 font-semibold text-ink-primary">
                      <div className="flex items-center gap-2">
                        <span>{p.name}</span>
                        {p.isActive === false && (
                          <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-200">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-ink-secondary">{p.durationDays} days</td>
                    <td className="py-3 px-3 font-bold text-primary">{formatCurrency(p.defaultPrice)}</td>
                    <td className="py-3 px-3 text-ink-secondary">{p.description || "—"}</td>
                    <td className="py-3 px-3 font-medium text-ink-primary">
                      {p._count?.records || 0} subscriptions
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditPlan(p)}
                          className="px-2.5 py-1 text-[11px] font-medium bg-primary-light text-primary hover:bg-primary/20 rounded border border-primary/20 transition-colors flex items-center gap-1"
                          title="Edit Membership Plan"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePlan(p)}
                          className="p-1 text-ink-secondary hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete or Deactivate Plan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: AUDIT TRAIL */}
      {activeTab === "audit" && (
        <Card
          title="System Audit Trail & Security Logs"
          subtitle="Immutable operational audit record of payments, renewals, payroll finalizations, and modifications"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-background text-ink-secondary border-b border-border uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3 font-semibold">Timestamp</th>
                  <th className="py-3 px-3 font-semibold">Action</th>
                  <th className="py-3 px-3 font-semibold">Entity</th>
                  <th className="py-3 px-3 font-semibold">Entity ID</th>
                  <th className="py-3 px-3 font-semibold">Performed By</th>
                  <th className="py-3 px-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-background/40">
                    <td className="py-3 px-3 text-ink-secondary">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-3 font-semibold text-ink-primary">{log.action}</td>
                    <td className="py-3 px-3">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-background border border-border">
                        {log.entityType}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-ink-secondary">
                      {log.entityId}
                    </td>
                    <td className="py-3 px-3 text-ink-secondary">
                      {log.user?.name || "System Admin"}
                    </td>
                    <td className="py-3 px-3 font-mono text-[10px] text-ink-muted max-w-xs truncate" title={log.details}>
                      {log.details || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL: ADD MEMBERSHIP PLAN */}
      <Modal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        title="Add Configurable Membership Plan"
        description="Create a new subscription tier for your gym"
        maxWidth="md"
      >
        <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-ink-primary mb-1">Plan Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. 2-Month Student Special"
              value={newPlan.name}
              onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Duration (Days) *</label>
              <input
                type="number"
                required
                min={1}
                value={newPlan.durationDays}
                onChange={(e) => setNewPlan({ ...newPlan, durationDays: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
              />
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Default Price (₹) *</label>
              <input
                type="number"
                required
                min={1}
                value={newPlan.defaultPrice}
                onChange={(e) => setNewPlan({ ...newPlan, defaultPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary font-bold text-primary"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-ink-primary mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Details about locker access, steam room, etc."
              value={newPlan.description}
              onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setShowPlanModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Plan</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDIT MEMBERSHIP PLAN */}
      <Modal
        isOpen={showEditPlanModal}
        onClose={() => setShowEditPlanModal(false)}
        title="Edit Membership Plan"
        description="Update plan pricing, duration, description, and active status"
        maxWidth="md"
      >
        <form onSubmit={handleSaveEditPlan} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-ink-primary mb-1">Plan Name *</label>
            <input
              type="text"
              required
              value={editPlanForm.name}
              onChange={(e) => setEditPlanForm({ ...editPlanForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Duration (Days) *</label>
              <input
                type="number"
                required
                min={1}
                value={editPlanForm.durationDays}
                onChange={(e) => setEditPlanForm({ ...editPlanForm, durationDays: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
              />
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Default Price (₹) *</label>
              <input
                type="number"
                required
                min={0}
                value={editPlanForm.defaultPrice}
                onChange={(e) => setEditPlanForm({ ...editPlanForm, defaultPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary font-bold text-primary text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-ink-primary mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Details about locker access, steam room, perks, etc."
              value={editPlanForm.description}
              onChange={(e) => setEditPlanForm({ ...editPlanForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
            />
          </div>

          <div className="p-3 bg-background rounded-lg border border-border flex items-center justify-between">
            <div>
              <p className="font-semibold text-ink-primary text-xs">Plan Availability</p>
              <p className="text-[11px] text-ink-secondary">
                {editPlanForm.isActive
                  ? "Active and available for member registrations and renewals"
                  : "Inactive (hidden from new registrations, preserves existing subscriptions)"}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={editPlanForm.isActive}
                onChange={(e) => setEditPlanForm({ ...editPlanForm, isActive: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setShowEditPlanModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
