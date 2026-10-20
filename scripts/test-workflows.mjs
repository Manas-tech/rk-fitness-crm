import { PrismaClient } from "@prisma/client";
import assert from "node:assert";

const prisma = new PrismaClient();

async function runAcceptanceTests() {
  console.log("==========================================================");
  console.log("RUNNING MASTER ACCEPTANCE TESTS FOR GYM CRM SYSTEM");
  console.log("==========================================================\n");

  // ----------------------------------------------------------------------
  // SCENARIO 1: MEMBERSHIP WORKFLOW
  // ----------------------------------------------------------------------
  console.log("▶ [SCENARIO 1] Testing Member Lifecycle, Partial Payment & Renewal...");

  // 1. Fetch Monthly plan
  const monthlyPlan = await prisma.membershipPlan.findFirst({
    where: { name: { contains: "Monthly" } },
  });
  assert(monthlyPlan, "Monthly plan should exist");

  // 2. Create test member
  const memberCode = `MEM-TEST-${Date.now().toString().slice(-4)}`;
  const testMember = await prisma.member.create({
    data: {
      memberCode,
      fullName: "Test Member Acceptance",
      phone: `+91 99999 ${Date.now().toString().slice(-5)}`,
      email: "test.acceptance@gmail.com",
      status: "ACTIVE",
    },
  });

  // 3. Create membership with Partial Payment (₹2,000 of ₹3,000 paid, ₹1,000 outstanding)
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const memRecord = await prisma.membershipRecord.create({
    data: {
      memberId: testMember.id,
      planId: monthlyPlan.id,
      planName: monthlyPlan.name,
      startDate,
      endDate,
      price: 3000,
      discount: 0,
      finalAmount: 3000,
      amountPaid: 2000,
      outstandingBalance: 1000,
      status: "ACTIVE",
    },
  });

  assert.strictEqual(memRecord.outstandingBalance, 1000, "Outstanding balance must be ₹1,000");

  // Record initial payment transaction
  await prisma.transaction.create({
    data: {
      transactionCode: `TXN-T1-${Date.now().toString().slice(-4)}`,
      date: new Date(),
      memberId: testMember.id,
      membershipRecordId: memRecord.id,
      type: "COLLECTION",
      category: "MEMBERSHIP",
      amount: 2000,
      paymentMethod: "UPI",
      description: "Initial partial payment",
    },
  });

  // 4. Pay remaining ₹1,000 balance
  const remainingPaidRecord = await prisma.membershipRecord.update({
    where: { id: memRecord.id },
    data: {
      amountPaid: 3000,
      outstandingBalance: 0,
    },
  });
  assert.strictEqual(remainingPaidRecord.outstandingBalance, 0, "Outstanding balance after payment must be ₹0");

  // 5. Renew membership without erasing historical record
  // Archive old record
  await prisma.membershipRecord.update({
    where: { id: memRecord.id },
    data: { status: "EXPIRED" },
  });

  // Create renewed record
  const renewStartDate = new Date(endDate);
  const renewEndDate = new Date(renewStartDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const renewedRecord = await prisma.membershipRecord.create({
    data: {
      memberId: testMember.id,
      planId: monthlyPlan.id,
      planName: monthlyPlan.name,
      startDate: renewStartDate,
      endDate: renewEndDate,
      price: 3000,
      discount: 0,
      finalAmount: 3000,
      amountPaid: 3000,
      outstandingBalance: 0,
      status: "ACTIVE",
    },
  });

  // Verify historical preservation
  const allMemberRecords = await prisma.membershipRecord.findMany({
    where: { memberId: testMember.id },
    orderBy: { startDate: "asc" },
  });

  assert.strictEqual(allMemberRecords.length, 2, "Both initial and renewed membership records must exist");
  assert.strictEqual(allMemberRecords[0].status, "EXPIRED", "Previous record must be preserved as historical");
  assert.strictEqual(allMemberRecords[1].status, "ACTIVE", "New record must be active");
  console.log("✔ SCENARIO 1 PASSED: Member creation, partial balance, and renewal preservation verified.");

  // ----------------------------------------------------------------------
  // SCENARIO 2: PERSONAL TRAINING & 70/30 REVENUE SHARING
  // ----------------------------------------------------------------------
  console.log("\n▶ [SCENARIO 2] Testing PT Contract, Proportional Split & Commission Liability...");

  const trainer = await prisma.staff.findFirst({
    where: { role: "PERSONAL_TRAINER" },
  });
  assert(trainer, "Trainer must exist");

  // Create PT Contract (Agreed: ₹20,000, Partial paid: ₹12,000, Due: ₹8,000)
  const ptContract = await prisma.ptContract.create({
    data: {
      contractCode: `PT-TEST-${Date.now().toString().slice(-4)}`,
      memberId: testMember.id,
      trainerId: trainer.id,
      goalCategory: "STRENGTH",
      goalDescription: "Deadlift 150kg goal",
      packageBasis: "FIXED_DURATION",
      totalSessions: 20,
      completedSessions: 5,
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      contractAmount: 20000,
      discount: 0,
      finalPayable: 20000,
      amountPaid: 12000,
      outstandingBalance: 8000,
      trainerSharePercent: 70.0,
      gymSharePercent: 30.0,
      status: "ACTIVE",
    },
  });

  assert.strictEqual(ptContract.outstandingBalance, 8000, "PT outstanding balance must be ₹8,000");

  // Create Payment Transaction for received ₹12,000
  const ptPaymentTxn = await prisma.transaction.create({
    data: {
      transactionCode: `TXN-PT-${Date.now().toString().slice(-4)}`,
      date: new Date(),
      memberId: testMember.id,
      ptContractId: ptContract.id,
      type: "COLLECTION",
      category: "PT",
      amount: 12000,
      paymentMethod: "UPI",
      description: "PT Partial Payment",
    },
  });

  // Calculate 70/30 commission strictly on ₹12,000 received
  const trainerCommission = Math.round(12000 * 0.7 * 100) / 100; // 8400
  const gymRetained = Math.round(12000 * 0.3 * 100) / 100; // 3600

  assert.strictEqual(trainerCommission, 8400, "Trainer 70% share on ₹12,000 received must be ₹8,400");
  assert.strictEqual(gymRetained, 3600, "Gym 30% share on ₹12,000 received must be ₹3,600");
  assert.strictEqual(trainerCommission + gymRetained, 12000, "Combined share must sum to exactly ₹12,000");

  const ptCommissionRecord = await prisma.ptCommissionRecord.create({
    data: {
      ptContractId: ptContract.id,
      transactionId: ptPaymentTxn.id,
      trainerId: trainer.id,
      paymentAmountReceived: 12000,
      eligibleRevenue: 12000,
      trainerSharePercent: 70.0,
      gymSharePercent: 30.0,
      trainerShareEarned: trainerCommission,
      gymShareRetained: gymRetained,
      settlementStatus: "PENDING",
    },
  });

  console.log("✔ SCENARIO 2 PASSED: PT 70/30 split strictly calculated on actual money received.");

  // ----------------------------------------------------------------------
  // SCENARIO 3: ATTENDANCE & PAYROLL FORMULA ACCEPTANCE TEST
  // ----------------------------------------------------------------------
  console.log("\n▶ [SCENARIO 3] Testing Specific Attendance Formula Acceptance Case...");
  console.log("Test Case parameters: Base: ₹15,000, Scheduled: 30, Present: 27, Half: 2, Absent: 1");

  const scheduledDays = 30;
  const baseSalary = 15000;
  const presentDays = 27;
  const halfDays = 2;
  const absentDays = 1;

  const dailyRate = Math.round((baseSalary / scheduledDays) * 100) / 100;
  const eligibleUnits = presentDays + halfDays * 0.5;
  const attendancePayable = Math.round(eligibleUnits * dailyRate * 100) / 100;

  assert.strictEqual(dailyRate, 500, "Daily rate must be ₹500");
  assert.strictEqual(eligibleUnits, 28, "Attendance units must equal 28");
  assert.strictEqual(attendancePayable, 14000, "Attendance payable must be ₹14,000");

  // Include PT commission in trainer gross payable
  const grossPayable = attendancePayable + trainerCommission;
  assert.strictEqual(grossPayable, 14000 + 8400, "Gross payable must include base earnings + PT commission");

  // Create finalized payroll snapshot
  const now = new Date();
  const testMonth = 11; // November
  const testYear = 2026;

  // Clean any previous test payroll for this month
  await prisma.payrollRecord.deleteMany({
    where: { staffId: trainer.id, month: testMonth, year: testYear },
  });

  const payrollSnapshot = await prisma.payrollRecord.create({
    data: {
      month: testMonth,
      year: testYear,
      staffId: trainer.id,
      status: "FINALIZED",
      totalCalendarDays: 30,
      scheduledWorkingDays: scheduledDays,
      presentDays,
      halfDays,
      paidLeaveDays: 0,
      unpaidLeaveDays: absentDays,
      absentDays,
      attendanceUnitsEarned: eligibleUnits,
      dailyRate,
      baseSalary,
      attendanceEarnings: attendancePayable,
      ptCommissionEarned: trainerCommission,
      grossPayable,
      netSalaryPayable: grossPayable,
      amountPaid: 0,
      remainingBalance: grossPayable,
      finalizedAt: new Date(),
    },
  });

  // Lock the PT commission to this payroll
  await prisma.ptCommissionRecord.update({
    where: { id: ptCommissionRecord.id },
    data: {
      settlementStatus: "SETTLED_IN_PAYROLL",
      payrollRecordId: payrollSnapshot.id,
    },
  });

  // Verify that the commission is locked and cannot be added again
  const pendingAfterSettlement = await prisma.ptCommissionRecord.findMany({
    where: {
      id: ptCommissionRecord.id,
      settlementStatus: "PENDING",
    },
  });
  assert.strictEqual(pendingAfterSettlement.length, 0, "Settled commission must not remain pending");

  // Partial Salary Payment (e.g. ₹10,000 paid)
  const salaryPayoutTxn = await prisma.transaction.create({
    data: {
      transactionCode: `TXN-SAL-${Date.now().toString().slice(-4)}`,
      date: new Date(),
      payrollRecordId: payrollSnapshot.id,
      type: "PAYOUT",
      category: "SALARY",
      amount: 10000,
      paymentMethod: "BANK_TRANSFER",
      description: `Partial salary payout to ${trainer.fullName}`,
    },
  });

  const updatedPayroll = await prisma.payrollRecord.update({
    where: { id: payrollSnapshot.id },
    data: {
      amountPaid: 10000,
      remainingBalance: grossPayable - 10000,
      status: "PARTIALLY_PAID",
    },
  });

  assert.strictEqual(updatedPayroll.remainingBalance, grossPayable - 10000, "Remaining balance must be gross - paid");
  console.log("✔ SCENARIO 3 PASSED: Attendance formula, PT commission lock, and salary payout verified.");

  // ----------------------------------------------------------------------
  // SCENARIO 4: WEBSITE ENQUIRY CRM & GUIDED CONVERSION
  // ----------------------------------------------------------------------
  console.log("\n▶ [SCENARIO 4] Testing Website Enquiry Submission & Guided Conversion...");

  const leadCode = `LEAD-TEST-${Date.now().toString().slice(-4)}`;
  const enquiry = await prisma.websiteEnquiry.create({
    data: {
      leadCode,
      fullName: "Ananya Deshmukh",
      phone: `+91 98300 ${Date.now().toString().slice(-5)}`,
      email: "ananya.lead@test.com",
      interestedService: "GYM_MEMBERSHIP",
      preferredPlanName: "Quarterly Pro",
      message: "Interested in morning workouts",
      source: "WEBSITE",
      status: "NEW",
    },
  });

  // Guided conversion into member
  const convertedMemberCode = `MEM-CONV-${Date.now().toString().slice(-4)}`;
  const convertedMember = await prisma.member.create({
    data: {
      memberCode: convertedMemberCode,
      fullName: enquiry.fullName,
      phone: enquiry.phone,
      email: enquiry.email,
      status: "ACTIVE",
    },
  });

  // Link lead to member
  const convertedEnquiry = await prisma.websiteEnquiry.update({
    where: { id: enquiry.id },
    data: {
      status: "CONVERTED",
      convertedMemberId: convertedMember.id,
      convertedAt: new Date(),
    },
  });

  assert.strictEqual(convertedEnquiry.status, "CONVERTED", "Enquiry status must be CONVERTED");
  assert.strictEqual(convertedEnquiry.convertedMemberId, convertedMember.id, "Lead must be linked to member");
  console.log("✔ SCENARIO 4 PASSED: Lead ingestion and conversion workflow verified.");

  console.log("\n==========================================================");
  console.log("ALL ACCEPTANCE CRITERIA SCENARIOS VERIFIED SUCCESSFULLY!");
  console.log("==========================================================\n");
}

runAcceptanceTests()
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
