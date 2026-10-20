"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/calculations";
import {
  Receipt,
  PlusCircle,
  Search,
  Filter,
  Download,
  Calendar,
  CreditCard,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Building,
  CheckCircle,
} from "lucide-react";

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<"transactions" | "expenses">("transactions");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Modals
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddSaleModal, setShowAddSaleModal] = useState(false);

  // Add Expense Form
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    category: "MAINTENANCE",
    amount: 5000,
    expenseDate: new Date().toISOString().split("T")[0],
    paymentStatus: "PAID",
    paymentMethod: "UPI",
    vendor: "",
    referenceNumber: "",
    notes: "",
  });

  // Add Manual Sale Form
  const [saleForm, setSaleForm] = useState({
    amount: 1500,
    description: "Whey Protein 1kg Supplement Sale",
    category: "OTHER_SALES",
    paymentMethod: "UPI",
    referenceNumber: "",
    notes: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "transactions") {
        let url = `/api/finance/transactions?type=${typeFilter}&category=${categoryFilter}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        const res = await fetch(url);
        const data = await res.json();
        setTransactions(data.transactions || []);
      } else {
        let url = `/api/finance/expenses?category=${categoryFilter}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        const res = await fetch(url);
        const data = await res.json();
        setExpenses(data.expenses || []);
        setExpenseSummary(data.summary || {});
      }
    } catch (err) {
      console.error("Failed to load financial records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, typeFilter, categoryFilter, search]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseForm),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to record expense");
        return;
      }

      setShowAddExpenseModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleForm),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to record sale");
        return;
      }

      setShowAddSaleModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSettleExpense = async (expenseId: string) => {
    if (!confirm("Confirm marking this expense as PAID? This will record an expense cash transaction.")) return;
    try {
      const res = await fetch(`/api/finance/expenses/${expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "PAID", paymentMethod: "UPI" }),
      });
      if (!res.ok) throw new Error("Failed to settle expense");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    let headers: string[];
    let rows: any[];

    if (activeTab === "transactions") {
      headers = ["Txn Code", "Date", "Description", "Type", "Category", "Amount", "Method", "Reference"];
      rows = transactions.map((t) => [
        t.transactionCode,
        new Date(t.date).toISOString().split("T")[0],
        `"${t.description}"`,
        t.type,
        t.category,
        t.amount,
        t.paymentMethod,
        t.referenceNumber || "",
      ]);
    } else {
      headers = ["Expense Code", "Title", "Category", "Date", "Amount", "Status", "Vendor", "Method"];
      rows = expenses.map((e) => [
        e.expenseCode,
        `"${e.title}"`,
        e.category,
        new Date(e.expenseDate).toISOString().split("T")[0],
        e.amount,
        e.paymentStatus,
        `"${e.vendor || ""}"`,
        e.paymentMethod,
      ]);
    }

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e: any[]) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeTab}_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-xl font-bold text-ink-primary tracking-tight">
            Financial Ledger & Operating Expenses
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            Complete auditable double-entry accounting ledger of collections, overheads, and disbursements
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={handleExportCSV}>
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowAddSaleModal(true)}>
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            Record Other Sale
          </Button>
          <Button size="sm" onClick={() => setShowAddExpenseModal(true)}>
            <PlusCircle className="w-3.5 h-3.5" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => {
            setActiveTab("transactions");
            setTypeFilter("ALL");
            setCategoryFilter("ALL");
          }}
          className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "transactions"
              ? "border-primary text-primary"
              : "border-transparent text-ink-secondary hover:text-ink-primary"
          }`}
        >
          Transactions Ledger
        </button>
        <button
          onClick={() => {
            setActiveTab("expenses");
            setTypeFilter("ALL");
            setCategoryFilter("ALL");
          }}
          className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "expenses"
              ? "border-primary text-primary"
              : "border-transparent text-ink-secondary hover:text-ink-primary"
          }`}
        >
          Expense Management
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search description, reference, vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg bg-background text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {activeTab === "transactions" ? (
            <>
              <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
                <span className="font-medium text-[11px] uppercase tracking-wider">Type:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-border rounded-lg bg-surface text-ink-primary"
                >
                  <option value="ALL">All Types</option>
                  <option value="COLLECTION">Collections (Inflow)</option>
                  <option value="EXPENSE">Expenses (Outflow)</option>
                  <option value="PAYOUT">Payouts (Salaries)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
                <span className="font-medium text-[11px] uppercase tracking-wider">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-border rounded-lg bg-surface text-ink-primary"
                >
                  <option value="ALL">All Categories</option>
                  <option value="MEMBERSHIP">Membership</option>
                  <option value="PT">Personal Training</option>
                  <option value="OTHER_SALES">Other Sales</option>
                  <option value="SALARY">Salary & Payroll</option>
                  <option value="RENT">Rent</option>
                  <option value="ELECTRICITY">Electricity</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
              <span className="font-medium text-[11px] uppercase tracking-wider">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-border rounded-lg bg-surface text-ink-primary"
              >
                <option value="ALL">All Categories</option>
                <option value="RENT">Rent</option>
                <option value="ELECTRICITY">Electricity</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="EQUIPMENT">Equipment</option>
                <option value="MARKETING">Marketing</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          )}
        </div>

        <div className="text-xs text-ink-secondary">
          {activeTab === "transactions" ? (
            <span>Showing <strong className="text-ink-primary">{transactions.length}</strong> ledger records</span>
          ) : (
            <span>
              Total: <strong className="text-ink-primary">{formatCurrency(expenseSummary.totalExpenses || 0)}</strong> | Paid:{" "}
              <strong className="text-emerald-700">{formatCurrency(expenseSummary.paidTotal || 0)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Main Table View */}
      <Card>
        <div className="overflow-x-auto">
          {activeTab === "transactions" ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-background text-ink-secondary border-b border-border uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3 font-semibold">Txn ID</th>
                  <th className="py-3 px-3 font-semibold">Date</th>
                  <th className="py-3 px-3 font-semibold">Description</th>
                  <th className="py-3 px-3 font-semibold">Category</th>
                  <th className="py-3 px-3 font-semibold">Payee / Member</th>
                  <th className="py-3 px-3 font-semibold">Method</th>
                  <th className="py-3 px-3 font-semibold">Reference</th>
                  <th className="py-3 px-3 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-ink-muted">
                      Loading ledger entries...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-ink-muted">
                      No transactions recorded.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-background/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-medium text-ink-primary">
                        {t.transactionCode}
                      </td>
                      <td className="py-3 px-3 text-ink-secondary">
                        {new Date(t.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-3 font-medium text-ink-primary max-w-sm truncate">
                        {t.description}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-background border border-border">
                          {t.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-ink-secondary">
                        {t.member ? `${t.member.fullName} (${t.member.memberCode})` : "General"}
                      </td>
                      <td className="py-3 px-3 text-ink-secondary">{t.paymentMethod}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-ink-muted">
                        {t.referenceNumber || "—"}
                      </td>
                      <td className="py-3 px-3 font-semibold text-right">
                        <span className={t.type === "COLLECTION" ? "text-primary" : "text-red-600"}>
                          {t.type === "COLLECTION" ? "+" : "-"}
                          {formatCurrency(t.amount)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-background text-ink-secondary border-b border-border uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3 font-semibold">Expense Code</th>
                  <th className="py-3 px-3 font-semibold">Date</th>
                  <th className="py-3 px-3 font-semibold">Title</th>
                  <th className="py-3 px-3 font-semibold">Category</th>
                  <th className="py-3 px-3 font-semibold">Vendor</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                  <th className="py-3 px-3 font-semibold">Method</th>
                  <th className="py-3 px-3 font-semibold text-right">Amount</th>
                  <th className="py-3 px-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-ink-muted">
                      Loading expenses...
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-ink-muted">
                      No expenses logged.
                    </td>
                  </tr>
                ) : (
                  expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-background/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-medium text-ink-primary">
                        {e.expenseCode}
                      </td>
                      <td className="py-3 px-3 text-ink-secondary">
                        {new Date(e.expenseDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-3 px-3 font-medium text-ink-primary">{e.title}</td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-background border border-border">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-ink-secondary">{e.vendor || "—"}</td>
                      <td className="py-3 px-3">
                        <StatusBadge status={e.paymentStatus} />
                      </td>
                      <td className="py-3 px-3 text-ink-secondary">{e.paymentMethod}</td>
                      <td className="py-3 px-3 font-semibold text-right text-red-600">
                        {formatCurrency(e.amount)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {e.paymentStatus !== "PAID" && (
                          <Button size="sm" variant="outline" onClick={() => handleSettleExpense(e.id)}>
                            Mark Paid
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* MODAL: ADD EXPENSE */}
      <Modal
        isOpen={showAddExpenseModal}
        onClose={() => setShowAddExpenseModal(false)}
        title="Record Operating Expense"
        description="Overhead expenses reduce cash flow only when marked as PAID"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-ink-primary mb-1">Expense Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Commercial AC Servicing & Gas Refill"
              value={expenseForm.title}
              onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Category *</label>
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="RENT">Rent</option>
                <option value="ELECTRICITY">Electricity & Utilities</option>
                <option value="MAINTENANCE">Equipment Maintenance</option>
                <option value="EQUIPMENT">New Equipment Purchase</option>
                <option value="MARKETING">Marketing & Advertising</option>
                <option value="SUPPLEMENTS">Supplements Restock</option>
                <option value="OTHER">Other Operating Expense</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Amount (₹) *</label>
              <input
                type="number"
                required
                min={1}
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary font-bold text-base focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Expense Date</label>
              <input
                type="date"
                value={expenseForm.expenseDate}
                onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Payment Status</label>
              <select
                value={expenseForm.paymentStatus}
                onChange={(e) => setExpenseForm({ ...expenseForm, paymentStatus: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="PAID">Paid (Immediately Deduct Cash Flow)</option>
                <option value="UNPAID">Unpaid (Obligation / Invoice Pending)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Vendor / Payee</label>
              <input
                type="text"
                placeholder="e.g. BlueStar HVAC Services"
                value={expenseForm.vendor}
                onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Payment Method</label>
              <select
                value={expenseForm.paymentMethod}
                onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Debit/Credit Card</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setShowAddExpenseModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Record Expense</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD MANUAL SALE */}
      <Modal
        isOpen={showAddSaleModal}
        onClose={() => setShowAddSaleModal(false)}
        title="Record Other Gym Revenue / Supplement Sale"
        description="Records direct cash collection in the financial ledger"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSale} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-ink-primary mb-1">Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. Whey Protein 1kg Isolate - Vanilla"
              value={saleForm.description}
              onChange={(e) => setSaleForm({ ...saleForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-ink-primary mb-1">Amount (₹) *</label>
              <input
                type="number"
                required
                min={1}
                value={saleForm.amount}
                onChange={(e) => setSaleForm({ ...saleForm, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary font-bold text-base text-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block font-medium text-ink-primary mb-1">Payment Method</label>
              <select
                value={saleForm.paymentMethod}
                onChange={(e) => setSaleForm({ ...saleForm, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setShowAddSaleModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Record Revenue</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
