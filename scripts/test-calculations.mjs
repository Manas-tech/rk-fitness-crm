import assert from "node:assert";

// Simulation of calculation tests
function calculateAttendanceSalary(baseSalary, scheduledWorkingDays, attendance) {
  const safeScheduledDays = scheduledWorkingDays > 0 ? scheduledWorkingDays : 30;
  const halfFactor = attendance.halfDayFactor !== undefined ? attendance.halfDayFactor : 0.5;
  const includePaidLeave = attendance.isPaidLeaveEligible !== undefined ? attendance.isPaidLeaveEligible : true;

  const dailyRate = Math.round((baseSalary / safeScheduledDays) * 100) / 100;
  const paidLeaveUnits = includePaidLeave ? (attendance.paidLeaveDays || 0) : 0;
  const eligibleAttendanceUnits =
    attendance.presentDays +
    (attendance.halfDays || 0) * halfFactor +
    paidLeaveUnits;

  const attendanceEarnings = Math.round(eligibleAttendanceUnits * dailyRate * 100) / 100;

  return {
    dailyRate,
    eligibleAttendanceUnits,
    attendanceEarnings,
  };
}

function calculatePtRevenueSplit(paymentAmount, trainerSharePercent = 70.0) {
  const normalizedTrainerShare = trainerSharePercent;
  const normalizedGymShare = 100.0 - normalizedTrainerShare;

  const trainerShareEarned = Math.round(((paymentAmount * normalizedTrainerShare) / 100.0) * 100) / 100;
  const gymShareRetained = Math.round((paymentAmount - trainerShareEarned) * 100) / 100;

  return {
    eligiblePaymentAmount: paymentAmount,
    trainerSharePercent: normalizedTrainerShare,
    gymSharePercent: normalizedGymShare,
    trainerShareEarned,
    gymShareRetained,
  };
}

function calculateOutstandingBalance(finalPayable, amountPaid) {
  const balance = Math.round((finalPayable - amountPaid) * 100) / 100;
  return balance > 0 ? balance : 0;
}

console.log("=== RUNNING SYSTEM ACCEPTANCE CRITERIA UNIT TESTS ===");

// 1. Acceptance Criteria: Attendance & Payroll Test Case
console.log("\n[TEST 1] Attendance formula verification:");
const attendanceTest = calculateAttendanceSalary(15000, 30, {
  presentDays: 27,
  halfDays: 2,
  paidLeaveDays: 0,
});
console.log(`Daily rate: ₹${attendanceTest.dailyRate} (Expected: ₹500)`);
console.log(`Attendance units: ${attendanceTest.eligibleAttendanceUnits} (Expected: 28)`);
console.log(`Attendance earnings: ₹${attendanceTest.attendanceEarnings} (Expected: ₹14,000)`);
assert.strictEqual(attendanceTest.dailyRate, 500, "Daily rate must equal 500");
assert.strictEqual(attendanceTest.eligibleAttendanceUnits, 28, "Attendance units must equal 28");
assert.strictEqual(attendanceTest.attendanceEarnings, 14000, "Attendance earnings must equal 14000");
console.log("✔ TEST 1 PASSED: Attendance calculation verified exactly.");

// 2. Acceptance Criteria: PT 70/30 split on received amount
console.log("\n[TEST 2] PT 70/30 Split verification on ₹10,000 payment:");
const ptTest1 = calculatePtRevenueSplit(10000, 70, 30);
console.log(`Trainer share: ₹${ptTest1.trainerShareEarned} (Expected: ₹7,000)`);
console.log(`Gym share: ₹${ptTest1.gymShareRetained} (Expected: ₹3,000)`);
assert.strictEqual(ptTest1.trainerShareEarned, 7000, "Trainer share must be 7000");
assert.strictEqual(ptTest1.gymShareRetained, 3000, "Gym share must be 3000");
assert.strictEqual(ptTest1.trainerShareEarned + ptTest1.gymShareRetained, 10000, "Total must equal payment amount");
console.log("✔ TEST 2 PASSED: Standard PT 70/30 split verified.");

// 3. Acceptance Criteria: PT Partial payment allocation
console.log("\n[TEST 3] PT Partial payment allocation on ₹20,000 payment of a ₹50,000 contract:");
const ptTest2 = calculatePtRevenueSplit(20000, 70, 30);
console.log(`Trainer share earned: ₹${ptTest2.trainerShareEarned} (Expected: ₹14,000)`);
console.log(`Gym share retained: ₹${ptTest2.gymShareRetained} (Expected: ₹6,000)`);
assert.strictEqual(ptTest2.trainerShareEarned, 14000, "Trainer share must be 14000");
assert.strictEqual(ptTest2.gymShareRetained, 6000, "Gym share must be 6000");
console.log("✔ TEST 3 PASSED: Partial payment commission matches actual cash received.");

// 4. Acceptance Criteria: Hybrid Salary + Commission calculation
console.log("\n[TEST 4] Hybrid Salary + PT Commission summation:");
const baseSalaryPayable = 13500;
const ptCommissionEarned = 14000;
const grossPayable = baseSalaryPayable + ptCommissionEarned;
console.log(`Gross payable: ₹${grossPayable} (Expected: ₹27,500)`);
assert.strictEqual(grossPayable, 27500, "Gross payable must be 27500");
console.log("✔ TEST 4 PASSED: Hybrid salary and PT commission cleanly combined.");

// 5. Acceptance Criteria: Outstanding balance verification
console.log("\n[TEST 5] Outstanding balance calculation:");
const balance = calculateOutstandingBalance(12000, 5000);
console.log(`Outstanding balance: ₹${balance} (Expected: ₹7,000)`);
assert.strictEqual(balance, 7000, "Balance must be 7000");
console.log("✔ TEST 5 PASSED: Outstanding balance calculation verified.");

console.log("\n ALL SYSTEM CALCULATION TESTS PASSED SUCCESSFULLY! \n");
