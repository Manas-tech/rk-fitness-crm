# IronPulse Gym CRM & Management System

An enterprise-grade, full-stack Gym CRM, Personal Training (PT) management, double-entry financial ledger, and automated attendance & payroll system built for gym owners.

---

## 1. System Overview & Technology Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS with custom design system (#FFFFFF primary surface, #F7F8FA background, #167D5A emerald accent, Inter typography)
- **Database & ORM**: SQLite (default self-contained relational database) with Prisma ORM (fully compatible with PostgreSQL)
- **Authentication**: Secure HMAC SHA-256 session management with HTTP-only cookies and bcrypt password hashing
- **Charting**: Recharts
- **Validation**: Zod schema validation
- **Testing**: Automated unit tests and workflow acceptance tests

---

## 2. Core Modules Implemented

### Module 1: All Members Management (`/members`)
- Dual independent filters: **Membership Status** (`All`, `Active`, `Non-Active`, `Expired`, `Deactivated`) and **Membership Plan** (`All Plans`, `Monthly Classic`, `Quarterly Pro`, etc.) working simultaneously.
- Search by name, phone number, and member code.
- Quick expiry alerts: **Expiring in 7 Days**, **Expiring in 30 Days**, and **Expired**.
- Full member profile modal with complete historical membership periods and payment records.
- Renewal workflow that archives previous periods and creates new periods without erasing history.
- Partial payment support with automatic remaining balance recalculation.
- Accidental duplicate member warning on matching phone numbers with confirmation bypass.
- Filtered CSV exports.

### Module 2: Personal Training (PT) & Revenue Sharing (`/personal-training`)
- Dedicated PT management page separate from regular memberships.
- Individualized goals: Weight Loss, Muscle Gain, Strength, General Fitness, Body Transformation, Rehabilitation, and Custom descriptions.
- Customized pricing packages: monthly, fixed-duration, per-session, and custom agreed contract rates.
- **70:30 PT Revenue-Sharing Business Rule**:
  - Trainer receives **70%** of eligible PT revenue.
  - Gym retains **30%** of eligible PT revenue.
  - Commission is **strictly calculated on actual money received**, never on unpaid balances.
  - Partial payments are allocated proportionally.
  - Unique transaction ledger entries for every payment.
  - Commission liability and settlement status tracking (`PENDING`, `SETTLED_IN_PAYROLL`, `PAID_DIRECTLY`).
- PT client profile with session progress and auditable transaction split breakdown.

### Module 3: Executive Financial Dashboard & Ledger (`/dashboard` & `/finance`)
- Dynamic Reporting Period Selector: `Today`, `This Week`, `This Month`, `This FY (April 1 to March 31 for India)`, `This CY`, `Previous Month`, `Previous Year`, and `Custom Date Range`.
- **10 Core KPI Cards**:
  1. Gross collections (all cash received in period)
  2. Membership collections
  3. PT collections
  4. Other sales (supplements, passes)
  5. Total paid expenses
  6. Net operating cash flow (`Gross Collections − Total Paid Expenses`)
  7. Outstanding member dues (unpaid membership and PT balances)
  8. PT trainer commission earned in period
  9. PT trainer commission paid/settled
  10. Pending trainer commission liability
- Interactive visual charts:
  - Collections vs. Expenses area chart
  - Revenue stream breakdown pie chart
  - Operating expense category horizontal bar chart
  - Membership lifecycle acquisition/renewal chart
- Auditable double-entry financial ledger with pagination and filters (`/finance`).
- Operating expense manager with unpaid obligation tracking and payment settlement.

### Module 4: Website Enquiries & Lead Management CRM (`/enquiries` & `/test-enquiry`)
- Real-time lead pipeline counters: `Total`, `New`, `Contacted`, `Follow-Up Due`, `Trial Scheduled`, `Converted`, `Lost`.
- Public website ingestion API: `POST /api/enquiries` with server-side Zod validation and rate limiting.
- Lead interaction timeline drawer: log phone calls, notes, and schedule follow-up dates.
- Guided **Convert to Member** workflow:
  - Pre-fills lead details into membership form.
  - Avoids duplicate member creation.
  - Links resulting member to original enquiry.
  - Preserves original enquiry message and audit history.
  - Leaves unpaid dues until explicit payment is recorded.
- Public test form and API documentation page at `/test-enquiry`.

### Module 5: Staff Attendance & Monthly Payroll Workspace (`/staff`)
- **Daily Attendance Interface**:
  - Statuses: `Present` (1.0 unit), `Half-Day` (0.5 unit), `Leave` (1.0 unit), `Weekly Off` (1.0 unit), `Absent` (0.0 units).
  - Explicit `Not Marked` status for unconfirmed days (never assumes absent).
  - Bulk **Mark All Present** action.
  - Unique date constraint prevents duplicate entries.
- **Monthly Salary & Payroll Processing**:
  - Configurable compensation models: `Fixed Monthly`, `Attendance-Based`, `Hybrid`, and `Commission Only`.
  - **Attendance Salary Formula**:
    $$\text{Daily Rate} = \frac{\text{Configured Monthly Salary}}{\text{Configured Scheduled Working Days}}$$
    $$\text{Attendance Earnings} = \text{Eligible Units} \times \text{Daily Rate}$$
  - **PT Commission Integration**:
    - Automatically aggregates unfinalized 70% PT commissions earned by trainers in that month.
    - Gross Payable = Attendance Earnings + PT Commissions + Adjustments − Deductions.
  - **Finalize & Lock Workflow**:
    - Stores locked historical snapshot.
    - Locks included PT commissions as `SETTLED_IN_PAYROLL` so they can never be paid twice.
  - **Salary Payout Tracking**:
    - Records partial or full salary payouts.
    - Decreases balance and updates status (`UNPAID` $\rightarrow$ `PARTIALLY_PAID` $\rightarrow$ `PAID`).
    - Enforces overpayment prevention.
  - Printable official salary slip.

### Module 6: System & Business Settings (`/settings`)
- Gym profile: Name, address, phone, email, timezone (`Asia/Kolkata`), currency (`INR ₹`), Financial Year start month (April).
- PT Commission Split configuration: 70% trainer, 30% gym (validated to sum to 100%).
- Membership Plans manager: add plans with custom durations and default prices.
- Live immutable system audit logs with user accountability.

---

## 3. Getting Started Locally

### Prerequisites
- Node.js 18+ (Node.js 20 LTS included)
- npm or pnpm

### Quick Start
1. Clone or navigate to the project directory:
   ```bash
   cd c:\Users\DELL\Documents\antigravity\jolly-curie
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Initialize and seed the database:
   ```bash
   npx prisma db push
   node prisma/seed.js
   ```

4. Run automated calculation and workflow acceptance tests:
   ```bash
   node scripts/test-calculations.mjs
   node scripts/test-workflows.mjs
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Default Demo Accounts

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Gym Owner** | `owner@ironpulsefitness.com` | `admin123` | Full Administrative & Financial Control |
| **Manager** | `manager@ironpulsefitness.com` | `manager123` | Branch Operations & Leads Management |

*Quick one-click login buttons for both accounts are available on the login screen.*

---

## 5. Website API Integration Example

To submit leads directly from an external public gym website:

```bash
curl -X POST http://localhost:3000/api/enquiries \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Siddharth Roy",
    "phone": "+91 98205 55667",
    "email": "siddharth@example.com",
    "interestedService": "PERSONAL_TRAINING",
    "message": "Interested in 1-on-1 personal training for fat loss"
  }'
```

---

## 6. Production Deployment

### Option A: Vercel / Railway / Render with SQLite or PostgreSQL
1. Ensure `.env` contains:
   ```env
   DATABASE_URL="file:./dev.db" # or postgresql://...
   JWT_SECRET="your_strong_random_secret"
   ```
2. Build the production package:
   ```bash
   npm run build
   ```
3. Start the server:
   ```bash
   npm run start
   ```
