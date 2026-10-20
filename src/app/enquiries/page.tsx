"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, calculateOutstandingBalance } from "@/lib/calculations";
import {
  Globe2,
  Search,
  Filter,
  Download,
  Phone,
  Mail,
  UserCheck,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ChevronRight,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [plans, setPlans] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);

  // Status & Note update in detail drawer
  const [statusUpdate, setStatusUpdate] = useState("");
  const [newNote, setNewNote] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");

  // Conversion Form
  const [convertForm, setConvertForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    planId: "",
    startDate: new Date().toISOString().split("T")[0],
    price: 3000,
    discount: 0,
    amountPaid: 0,
    paymentMethod: "UPI",
    referenceNumber: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/api/enquiries?status=${statusFilter}&source=${sourceFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      const data = await res.json();
      setEnquiries(data.enquiries || []);
      setCounts(data.counts || {});

      if (plans.length === 0) {
        const pRes = await fetch("/api/settings/membership-plans");
        const pData = await pRes.json();
        setPlans(pData.plans || []);
      }

      if (staffList.length === 0) {
        const sRes = await fetch("/api/staff");
        const sData = await sRes.json();
        setStaffList(sData.staff || []);
      }
    } catch (err) {
      console.error("Failed to load enquiries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, sourceFilter, search]);

  const handleUpdateLeadStatus = async () => {
    if (!selectedLead) return;
    try {
      const res = await fetch(`/api/enquiries/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusUpdate || selectedLead.status,
          nextFollowUpDate: nextFollowUpDate || undefined,
          newActivityDescription: newNote ? newNote : undefined,
          newActivityType: "NOTE",
        }),
      });

      if (!res.ok) throw new Error("Failed to update lead");

      setNewNote("");
      setShowDetailModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenConvertModal = (lead: any) => {
    setSelectedLead(lead);
    const initialPlan = plans[0];
    setConvertForm({
      fullName: lead.fullName,
      phone: lead.phone,
      email: lead.email || "",
      planId: initialPlan?.id || "",
      startDate: new Date().toISOString().split("T")[0],
      price: initialPlan?.defaultPrice || 3000,
      discount: 0,
      amountPaid: 0, // conversion does not assume paid unless recorded
      paymentMethod: "UPI",
      referenceNumber: "",
    });
    setShowConvertModal(true);
  };

  const handleConvertLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    try {
      const res = await fetch(`/api/enquiries/${selectedLead.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(convertForm),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to convert lead");
        return;
      }

      setShowConvertModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      "Lead Code",
      "Full Name",
      "Phone",
      "Email",
      "Interested Service",
      "Source",
      "Status",
      "Next Follow Up",
      "Created Date",
    ];

    const rows = enquiries.map((l) => [
      l.leadCode,
      `"${l.fullName}"`,
      l.phone,
      l.email || "",
      l.interestedService,
      l.source,
      l.status,
      l.nextFollowUpDate ? new Date(l.nextFollowUpDate).toISOString().split("T")[0] : "",
      new Date(l.createdAt).toISOString().split("T")[0],
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e: any[]) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `crm_leads_${new Date().toISOString().split("T")[0]}.csv`);
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
            Website Enquiries & Lead Pipeline CRM
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            Real-time automated lead capture from gym website, follow-up tracking, and conversion
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={handleExportCSV}>
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <a
            href="/test-enquiry"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-light text-primary hover:bg-primary/20 border border-primary/20 transition-colors"
          >
            <span>Open Public Website Form</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Pipeline KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`p-3 rounded-xl border text-left transition-all ${
            statusFilter === "ALL"
              ? "bg-surface border-ink-primary ring-1 ring-ink-primary/20"
              : "bg-surface border-border hover:bg-background"
          }`}
        >
          <div className="text-ink-secondary text-xs uppercase tracking-wider font-medium">Total Leads</div>
          <div className="text-lg font-bold text-ink-primary mt-1">{counts.total || 0}</div>
        </button>

        <button
          onClick={() => setStatusFilter("NEW")}
          className={`p-3 rounded-xl border text-left transition-all ${
            statusFilter === "NEW"
              ? "bg-blue-50/50 border-blue-600 ring-1 ring-blue-600/20"
              : "bg-surface border-border hover:bg-background"
          }`}
        >
          <div className="text-blue-700 text-xs uppercase tracking-wider font-medium">New Enquiries</div>
          <div className="text-lg font-bold text-blue-700 mt-1">{counts.new || 0}</div>
        </button>

        <button
          onClick={() => setStatusFilter("CONTACTED")}
          className={`p-3 rounded-xl border text-left transition-all ${
            statusFilter === "CONTACTED"
              ? "bg-amber-50/50 border-amber-600 ring-1 ring-amber-600/20"
              : "bg-surface border-border hover:bg-background"
          }`}
        >
          <div className="text-amber-700 text-xs uppercase tracking-wider font-medium">Contacted</div>
          <div className="text-lg font-bold text-amber-700 mt-1">{counts.contacted || 0}</div>
        </button>

        <button
          onClick={() => setStatusFilter("FOLLOW_UP_REQUIRED")}
          className={`p-3 rounded-xl border text-left transition-all ${
            statusFilter === "FOLLOW_UP_REQUIRED"
              ? "bg-amber-50/50 border-amber-600 ring-1 ring-amber-600/20"
              : "bg-surface border-border hover:bg-background"
          }`}
        >
          <div className="text-amber-700 text-xs uppercase tracking-wider font-medium">Follow-Up Due</div>
          <div className="text-lg font-bold text-amber-600 mt-1">{counts.followUpDue || 0}</div>
        </button>

        <button
          onClick={() => setStatusFilter("CONVERTED")}
          className={`p-3 rounded-xl border text-left transition-all ${
            statusFilter === "CONVERTED"
              ? "bg-emerald-50/50 border-primary ring-1 ring-primary/20"
              : "bg-surface border-border hover:bg-background"
          }`}
        >
          <div className="text-emerald-700 text-xs uppercase tracking-wider font-medium">Converted</div>
          <div className="text-lg font-bold text-primary mt-1">{counts.converted || 0}</div>
        </button>

        <button
          onClick={() => setStatusFilter("LOST")}
          className={`p-3 rounded-xl border text-left transition-all ${
            statusFilter === "LOST"
              ? "bg-red-50/50 border-red-600 ring-1 ring-red-600/20"
              : "bg-surface border-border hover:bg-background"
          }`}
        >
          <div className="text-red-700 text-xs uppercase tracking-wider font-medium">Lost Leads</div>
          <div className="text-lg font-bold text-red-600 mt-1">{counts.lost || 0}</div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search name, phone, lead code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg bg-background text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
            <span className="font-medium text-[11px] uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-border rounded-lg bg-surface text-ink-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="FOLLOW_UP_REQUIRED">Follow-Up Required</option>
              <option value="TRIAL_SCHEDULED">Trial Scheduled</option>
              <option value="CONVERTED">Converted</option>
              <option value="LOST">Lost</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
            <span className="font-medium text-[11px] uppercase tracking-wider">Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-border rounded-lg bg-surface text-ink-primary"
            >
              <option value="ALL">All Sources</option>
              <option value="WEBSITE">Website Form</option>
              <option value="WALK_IN">Walk-in</option>
              <option value="REFERRAL">Referral</option>
              <option value="PHONE">Phone Call</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-ink-secondary">
          Showing <strong className="text-ink-primary">{enquiries.length}</strong> enquiries
        </div>
      </div>

      {/* Enquiries Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-background text-ink-secondary border-b border-border uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3 font-semibold">Lead ID</th>
                <th className="py-3 px-3 font-semibold">Prospect</th>
                <th className="py-3 px-3 font-semibold">Phone / Email</th>
                <th className="py-3 px-3 font-semibold">Interested Service</th>
                <th className="py-3 px-3 font-semibold">Date Submitted</th>
                <th className="py-3 px-3 font-semibold">Source</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold">Next Follow-Up</th>
                <th className="py-3 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-ink-muted">
                    Loading CRM leads...
                  </td>
                </tr>
              ) : enquiries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-ink-muted">
                    No website enquiries matching the filters.
                  </td>
                </tr>
              ) : (
                enquiries.map((lead) => (
                  <tr key={lead.id} className="hover:bg-background/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-ink-primary">
                      {lead.leadCode}
                    </td>
                    <td className="py-3 px-3 font-semibold text-ink-primary">
                      {lead.fullName}
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-ink-primary">{lead.phone}</div>
                      {lead.email && <div className="text-[11px] text-ink-secondary">{lead.email}</div>}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-background border border-border">
                        {lead.interestedService.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-ink-secondary">
                      {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-3 text-ink-secondary">{lead.source}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="py-3 px-3 text-ink-secondary">
                      {lead.nextFollowUpDate ? (
                        <span className="text-amber-700 font-medium">
                          {new Date(lead.nextFollowUpDate).toLocaleDateString("en-IN")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {lead.status !== "CONVERTED" && (
                          <button
                            onClick={() => handleOpenConvertModal(lead)}
                            className="px-2 py-1 text-[11px] font-medium bg-primary-light text-primary hover:bg-primary/20 rounded border border-primary/20 transition-colors flex items-center gap-1"
                            title="Convert Lead to Member"
                          >
                            <UserCheck className="w-3 h-3" />
                            Convert
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/enquiries/${lead.id}`);
                            const data = await res.json();
                            setSelectedLead(data.enquiry);
                            setStatusUpdate(data.enquiry.status);
                            setNextFollowUpDate(
                              data.enquiry.nextFollowUpDate
                                ? new Date(data.enquiry.nextFollowUpDate).toISOString().split("T")[0]
                                : ""
                            );
                            setShowDetailModal(true);
                          }}
                          className="p-1 text-ink-secondary hover:text-ink-primary hover:bg-background rounded"
                          title="View Details & Timeline"
                        >
                          <ChevronRight className="w-4 h-4" />
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

      {/* MODAL 1: LEAD DETAIL & TIMELINE */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={selectedLead?.fullName || "Lead CRM Details"}
        description={`Code: ${selectedLead?.leadCode} | Phone: ${selectedLead?.phone}`}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {selectedLead?.message && (
            <div className="p-3 bg-background border border-border rounded-lg">
              <span className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wider block mb-1">
                Website Enquiry Message:
              </span>
              <p className="text-ink-primary italic">"{selectedLead.message}"</p>
            </div>
          )}

          {/* Quick Actions (Call / Email) */}
          <div className="flex items-center gap-2">
            <a
              href={`tel:${selectedLead?.phone}`}
              className="flex-1 py-2 px-3 rounded-lg border border-border bg-surface hover:bg-background text-center font-medium text-ink-primary flex items-center justify-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-primary" />
              Call Prospect
            </a>
            {selectedLead?.email && (
              <a
                href={`mailto:${selectedLead?.email}`}
                className="flex-1 py-2 px-3 rounded-lg border border-border bg-surface hover:bg-background text-center font-medium text-ink-primary flex items-center justify-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                Email Prospect
              </a>
            )}
          </div>

          {/* Status Update & Next Follow-Up */}
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Update Status</label>
              <select
                value={statusUpdate}
                onChange={(e) => setStatusUpdate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="FOLLOW_UP_REQUIRED">Follow-Up Required</option>
                <option value="TRIAL_SCHEDULED">Trial Scheduled</option>
                <option value="CONVERTED">Converted</option>
                <option value="LOST">Lost</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Next Follow-Up Date</label>
              <input
                type="date"
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-ink-primary mb-1">Log Activity / Interaction Note</label>
            <textarea
              rows={2}
              placeholder="e.g. Spoke with prospect. Interested in evening 7 PM slots. Follow-up on Thursday."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Activity Timeline */}
          <div className="border-t border-border pt-3">
            <h4 className="font-semibold text-ink-primary uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-ink-secondary" />
              Interaction History Timeline
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedLead?.activities?.map((act: any) => (
                <div key={act.id} className="p-2 bg-background rounded-lg border border-border text-[11px]">
                  <div className="flex items-center justify-between text-ink-secondary mb-0.5">
                    <span className="font-semibold text-ink-primary">{act.type}</span>
                    <span>{new Date(act.createdAt).toLocaleString("en-IN")}</span>
                  </div>
                  <p className="text-ink-primary">{act.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button variant="ghost" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
            <Button onClick={handleUpdateLeadStatus}>Save Updates</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: GUIDED LEAD CONVERSION */}
      <Modal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        title="Guided Lead Conversion to Member"
        description={`Convert ${selectedLead?.fullName} into an active gym member`}
        maxWidth="md"
      >
        <form onSubmit={handleConvertLead} className="space-y-4 text-xs">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
            Pre-filling lead contact info. Converting links this lead to the member account permanently.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Full Name</label>
              <input
                type="text"
                required
                value={convertForm.fullName}
                onChange={(e) => setConvertForm({ ...convertForm, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
              />
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Phone Number</label>
              <input
                type="tel"
                required
                value={convertForm.phone}
                onChange={(e) => setConvertForm({ ...convertForm, phone: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-ink-primary mb-1">Select Membership Plan *</label>
            <select
              value={convertForm.planId}
              onChange={(e) => {
                const plan = plans.find((p) => p.id === e.target.value);
                setConvertForm({
                  ...convertForm,
                  planId: e.target.value,
                  price: plan?.defaultPrice || 3000,
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
              <label className="block font-medium text-ink-primary mb-1">Start Date</label>
              <input
                type="date"
                required
                value={convertForm.startDate}
                onChange={(e) => setConvertForm({ ...convertForm, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
              />
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Agreed Price (₹)</label>
              <input
                type="number"
                value={convertForm.price}
                onChange={(e) => setConvertForm({ ...convertForm, price: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Initial Amount Paid (₹)</label>
              <input
                type="number"
                value={convertForm.amountPaid}
                onChange={(e) => setConvertForm({ ...convertForm, amountPaid: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary font-bold text-primary"
              />
              <span className="text-[10px] text-ink-muted">Leave 0 if payment is pending</span>
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Payment Method</label>
              <select
                value={convertForm.paymentMethod}
                onChange={(e) => setConvertForm({ ...convertForm, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary"
              >
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setShowConvertModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Complete Conversion</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
