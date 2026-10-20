"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Dumbbell, CheckCircle2, ArrowRight, Code2, Globe } from "lucide-react";

export default function TestEnquiryPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    interestedService: "GYM_MEMBERSHIP",
    preferredPlanName: "Quarterly Pro",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit enquiry");
      }

      setSuccessResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-sm p-8">
        <div className="flex items-center justify-between pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-ink-primary">
                IronPulse Fitness — Public Website Enquiry Form
              </h1>
              <p className="text-xs text-ink-secondary">
                Public Test Integration Endpoint for External Gym Websites
              </p>
            </div>
          </div>
          <Link
            href="/enquiries"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Open CRM <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {successResult ? (
          <div className="py-10 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-primary rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-ink-primary">
              Enquiry Submitted Successfully!
            </h2>
            <p className="text-xs text-ink-secondary max-w-md mx-auto">
              {successResult.message}
            </p>
            <div className="p-3 bg-background rounded-lg inline-block text-xs font-mono text-ink-primary border border-border">
              Assigned Lead ID: <strong>{successResult.leadCode}</strong>
            </div>
            <div className="pt-4 flex justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSuccessResult(null);
                  setFormData({
                    fullName: "",
                    phone: "",
                    email: "",
                    interestedService: "GYM_MEMBERSHIP",
                    preferredPlanName: "Quarterly Pro",
                    message: "",
                  });
                }}
              >
                Submit Another Test
              </Button>
              <Link href="/enquiries">
                <Button size="sm">View in CRM Dashboard</Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs py-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-ink-primary mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Yashvardhan Singhania"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-medium text-ink-primary mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98201 99880"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-ink-primary mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="yash@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-medium text-ink-primary mb-1">Interested Program</label>
                <select
                  value={formData.interestedService}
                  onChange={(e) => setFormData({ ...formData, interestedService: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="GYM_MEMBERSHIP">Gym Membership</option>
                  <option value="PERSONAL_TRAINING">1-on-1 Personal Training</option>
                  <option value="CROSSFIT">CrossFit & Strength</option>
                  <option value="YOGA">Yoga & Functional Movement</option>
                  <option value="GENERAL_ENQUIRY">General Inquiry</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-ink-primary mb-1">Message or Specific Fitness Goals</label>
              <textarea
                rows={3}
                placeholder="Tell us about your fitness targets, preferred workout timings, or any injuries..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Submit Website Enquiry
            </Button>
          </form>
        )}

        {/* Documentation for Website Developers */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-ink-primary">
            <Code2 className="w-4 h-4 text-primary" />
            <span>Website Integration API Endpoint Documentation</span>
          </div>
          <p className="text-[11px] text-ink-secondary mb-3">
            External gym websites can submit leads directly to this server endpoint via POST request:
          </p>
          <div className="p-3 bg-[#1E293B] text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto">
            <pre>
{`POST /api/enquiries
Content-Type: application/json

{
  "fullName": "Prospect Name",
  "phone": "+91 98200 12345",
  "email": "prospect@example.com",
  "interestedService": "PERSONAL_TRAINING",
  "message": "Looking for trainer slot in Bandra"
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
