const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with realistic initial gym records...');

  // 1. Clean existing records for clean initialization
  await prisma.auditLog.deleteMany();
  await prisma.leadActivity.deleteMany();
  await prisma.websiteEnquiry.deleteMany();
  await prisma.ptCommissionRecord.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.payrollRecord.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.ptContract.deleteMany();
  await prisma.membershipRecord.deleteMany();
  await prisma.member.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.gymSettings.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const managerPassword = await bcrypt.hash('manager123', 10);

  const ownerUser = await prisma.user.create({
    data: {
      email: 'owner@ironpulsefitness.com',
      name: 'Vikramaditya Singhania',
      passwordHash: adminPassword,
      role: 'OWNER',
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@ironpulsefitness.com',
      name: 'Ananya Sharma',
      passwordHash: managerPassword,
      role: 'MANAGER',
    },
  });

  // 3. Create Gym Settings
  await prisma.gymSettings.create({
    data: {
      id: 'default-settings',
      gymName: 'IronPulse Fitness & Athletic Club',
      address: '104, Elite Avenue, Linking Road, Bandra West, Mumbai, Maharashtra 400050',
      phone: '+91 98201 23456',
      email: 'owner@ironpulsefitness.com',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      currencySymbol: '₹',
      fyStartMonth: 4, // April
      defaultTrainerShare: 70.0,
      defaultGymShare: 30.0,
      attendancePaidLeave: true,
      attendanceHalfDayFactor: 0.5,
    },
  });

  // 4. Create Membership Plans
  const planMonthly = await prisma.membershipPlan.create({
    data: {
      name: 'Monthly Classic',
      durationDays: 30,
      defaultPrice: 3000,
      description: 'Standard full gym access for 30 days',
      isActive: true,
    },
  });

  const planQuarterly = await prisma.membershipPlan.create({
    data: {
      name: 'Quarterly Pro',
      durationDays: 90,
      defaultPrice: 8000,
      description: '3-Month all-inclusive access with fitness assessment',
      isActive: true,
    },
  });

  const planHalfYearly = await prisma.membershipPlan.create({
    data: {
      name: 'Half-Yearly Elite',
      durationDays: 180,
      defaultPrice: 15000,
      description: '6-Month premium membership with locker & steam access',
      isActive: true,
    },
  });

  const planYearly = await prisma.membershipPlan.create({
    data: {
      name: 'Annual Platinum',
      durationDays: 365,
      defaultPrice: 26000,
      description: '12-Month full VIP access with guest passes',
      isActive: true,
    },
  });

  // 5. Create Staff (Personal Trainers, Gym Trainer, Receptionist, Manager)
  const trainerRahul = await prisma.staff.create({
    data: {
      staffCode: 'STF-101',
      fullName: 'Rahul Deshmukh',
      phone: '+91 98210 11223',
      email: 'rahul.trainer@ironpulsefitness.com',
      role: 'PERSONAL_TRAINER',
      salaryModel: 'ATTENDANCE_BASED',
      baseSalary: 15000,
      scheduledWorkingDays: 30,
      expectedWorkingHours: 8.0,
      bankDetails: 'HDFC Bank - A/C 5010023456789 - IFSC HDFC0000123',
      notes: 'Senior strength and conditioning coach (K11 certified)',
    },
  });

  const trainerPriya = await prisma.staff.create({
    data: {
      staffCode: 'STF-102',
      fullName: 'Priya Nair',
      phone: '+91 98330 44556',
      email: 'priya.trainer@ironpulsefitness.com',
      role: 'PERSONAL_TRAINER',
      salaryModel: 'ATTENDANCE_BASED',
      baseSalary: 16000,
      scheduledWorkingDays: 30,
      expectedWorkingHours: 8.0,
      bankDetails: 'ICICI Bank - A/C 001105009876 - IFSC ICIC0000011',
      notes: 'Specialist in weight loss, mobility & functional movement',
    },
  });

  const trainerSameer = await prisma.staff.create({
    data: {
      staffCode: 'STF-103',
      fullName: 'Sameer Khan',
      phone: '+91 98700 88990',
      email: 'sameer.trainer@ironpulsefitness.com',
      role: 'GYM_TRAINER',
      salaryModel: 'FIXED_MONTHLY',
      baseSalary: 18000,
      scheduledWorkingDays: 30,
      expectedWorkingHours: 9.0,
      notes: 'Floor trainer managing morning peak shifts',
    },
  });

  const receptionistKavita = await prisma.staff.create({
    data: {
      staffCode: 'STF-104',
      fullName: 'Kavita Joshi',
      phone: '+91 98190 22334',
      email: 'kavita@ironpulsefitness.com',
      role: 'RECEPTIONIST',
      salaryModel: 'FIXED_MONTHLY',
      baseSalary: 14000,
      scheduledWorkingDays: 30,
      expectedWorkingHours: 8.0,
      notes: 'Front desk coordinator & enquiry manager',
    },
  });

  // 6. Create Members
  const member1 = await prisma.member.create({
    data: {
      memberCode: 'MEM-1001',
      fullName: 'Aarav Mehta',
      phone: '+91 98200 12341',
      email: 'aarav.mehta@gmail.com',
      gender: 'Male',
      dateOfBirth: new Date('1994-06-15'),
      address: 'Sea Green Apts, Pali Hill, Bandra West, Mumbai',
      emergencyContact: 'Sneha Mehta (+91 98200 99991)',
      status: 'ACTIVE',
      assignedTrainerId: trainerRahul.id,
      internalNotes: 'Consistent early morning lifter',
    },
  });

  const member2 = await prisma.member.create({
    data: {
      memberCode: 'MEM-1002',
      fullName: 'Rhea Kapoor',
      phone: '+91 98200 12342',
      email: 'rhea.kapoor@outlook.com',
      gender: 'Female',
      dateOfBirth: new Date('1997-11-20'),
      address: 'Hill View Towers, Khar West, Mumbai',
      emergencyContact: 'Rohit Kapoor (+91 98200 99992)',
      status: 'ACTIVE',
      assignedTrainerId: trainerPriya.id,
      internalNotes: 'Focus on strength transformation and core conditioning',
    },
  });

  const member3 = await prisma.member.create({
    data: {
      memberCode: 'MEM-1003',
      fullName: 'Kunal Verma',
      phone: '+91 98200 12343',
      email: 'kunal.v@techcorp.in',
      gender: 'Male',
      dateOfBirth: new Date('1988-02-10'),
      address: 'Gulmohar Lane, Juhu, Mumbai',
      status: 'ACTIVE',
      internalNotes: 'Quarterly member, renewed once already',
    },
  });

  const member4 = await prisma.member.create({
    data: {
      memberCode: 'MEM-1004',
      fullName: 'Tanvi Shah',
      phone: '+91 98200 12344',
      email: 'tanvi.shah@gmail.com',
      gender: 'Female',
      dateOfBirth: new Date('1992-09-05'),
      status: 'EXPIRED',
      deactivationReason: 'Membership expired 10 days ago',
      internalNotes: 'Needs renewal follow-up call',
    },
  });

  const member5 = await prisma.member.create({
    data: {
      memberCode: 'MEM-1005',
      fullName: 'Devendra Patel',
      phone: '+91 98200 12345',
      gender: 'Male',
      status: 'DEACTIVATED',
      deactivationReason: 'Relocated temporarily for project',
      internalNotes: 'Asked for membership pause in September',
    },
  });

  // 7. Membership Records & Historical Periods
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const inTwentyDays = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);
  const inSixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  // Member 1: Active Quarterly
  const memRec1 = await prisma.membershipRecord.create({
    data: {
      memberId: member1.id,
      planId: planQuarterly.id,
      planName: planQuarterly.name,
      startDate: tenDaysAgo,
      endDate: inSixtyDays,
      price: 8000,
      discount: 500,
      finalAmount: 7500,
      amountPaid: 7500,
      outstandingBalance: 0,
      status: 'ACTIVE',
    },
  });

  // Transaction for Member 1
  await prisma.transaction.create({
    data: {
      transactionCode: 'TXN-10001',
      date: tenDaysAgo,
      memberId: member1.id,
      membershipRecordId: memRec1.id,
      type: 'COLLECTION',
      category: 'MEMBERSHIP',
      amount: 7500,
      paymentMethod: 'UPI',
      referenceNumber: 'UPI/329482910394',
      description: 'Quarterly Pro Membership - Full Payment',
    },
  });

  // Member 2: Active Monthly with Partial Payment (₹1,000 pending)
  const memRec2 = await prisma.membershipRecord.create({
    data: {
      memberId: member2.id,
      planId: planMonthly.id,
      planName: planMonthly.name,
      startDate: tenDaysAgo,
      endDate: inTwentyDays,
      price: 3000,
      discount: 0,
      finalAmount: 3000,
      amountPaid: 2000,
      outstandingBalance: 1000,
      status: 'ACTIVE',
    },
  });

  // Partial Payment Transaction for Member 2
  await prisma.transaction.create({
    data: {
      transactionCode: 'TXN-10002',
      date: tenDaysAgo,
      memberId: member2.id,
      membershipRecordId: memRec2.id,
      type: 'COLLECTION',
      category: 'MEMBERSHIP',
      amount: 2000,
      paymentMethod: 'CARD',
      referenceNumber: 'CARD/TXN-882190',
      description: 'Monthly Classic - Partial Payment (Balance ₹1000)',
    },
  });

  // Member 3: Previous expired period + Renewed active period (Demonstrates renewal preservation!)
  await prisma.membershipRecord.create({
    data: {
      memberId: member3.id,
      planId: planQuarterly.id,
      planName: planQuarterly.name,
      startDate: sixtyDaysAgo,
      endDate: thirtyDaysAgo,
      price: 8000,
      discount: 0,
      finalAmount: 8000,
      amountPaid: 8000,
      outstandingBalance: 0,
      status: 'EXPIRED',
    },
  });

  const memRec3Active = await prisma.membershipRecord.create({
    data: {
      memberId: member3.id,
      planId: planQuarterly.id,
      planName: planQuarterly.name,
      startDate: thirtyDaysAgo,
      endDate: inSixtyDays,
      price: 8000,
      discount: 0,
      finalAmount: 8000,
      amountPaid: 8000,
      outstandingBalance: 0,
      status: 'ACTIVE',
    },
  });

  await prisma.transaction.create({
    data: {
      transactionCode: 'TXN-10003',
      date: thirtyDaysAgo,
      memberId: member3.id,
      membershipRecordId: memRec3Active.id,
      type: 'COLLECTION',
      category: 'MEMBERSHIP',
      amount: 8000,
      paymentMethod: 'UPI',
      referenceNumber: 'UPI/440291039811',
      description: 'Quarterly Pro Membership Renewal',
    },
  });

  // Member 4: Expired Record
  await prisma.membershipRecord.create({
    data: {
      memberId: member4.id,
      planId: planMonthly.id,
      planName: planMonthly.name,
      startDate: fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
      endDate: tenDaysAgo,
      price: 3000,
      discount: 0,
      finalAmount: 3000,
      amountPaid: 3000,
      outstandingBalance: 0,
      status: 'EXPIRED',
    },
  });

  // 8. Personal Training Contracts with 70/30 Split
  // Contract 1: Member 1 with Rahul Deshmukh (Agreed: ₹10,000, Full ₹10,000 received)
  const ptContract1 = await prisma.ptContract.create({
    data: {
      contractCode: 'PT-1001',
      memberId: member1.id,
      trainerId: trainerRahul.id,
      goalCategory: 'MUSCLE_GAIN',
      goalDescription: 'Hypertrophy program focusing on bench press and squat form',
      packageBasis: 'MONTHLY',
      totalSessions: 16,
      completedSessions: 6,
      startDate: tenDaysAgo,
      endDate: inTwentyDays,
      contractAmount: 10000,
      discount: 0,
      finalPayable: 10000,
      amountPaid: 10000,
      outstandingBalance: 0,
      trainerSharePercent: 70.0,
      gymSharePercent: 30.0,
      status: 'ACTIVE',
    },
  });

  // Payment for PT Contract 1
  const ptTxn1 = await prisma.transaction.create({
    data: {
      transactionCode: 'TXN-10004',
      date: tenDaysAgo,
      memberId: member1.id,
      ptContractId: ptContract1.id,
      type: 'COLLECTION',
      category: 'PT',
      amount: 10000,
      paymentMethod: 'UPI',
      referenceNumber: 'UPI/998123004411',
      description: 'PT Package Payment - Rahul Deshmukh (16 Sessions)',
    },
  });

  // PT Commission Record for PT Txn 1: 70% to Rahul (₹7,000), 30% to Gym (₹3,000)
  await prisma.ptCommissionRecord.create({
    data: {
      ptContractId: ptContract1.id,
      transactionId: ptTxn1.id,
      trainerId: trainerRahul.id,
      paymentAmountReceived: 10000,
      eligibleRevenue: 10000,
      trainerSharePercent: 70.0,
      gymSharePercent: 30.0,
      trainerShareEarned: 7000,
      gymShareRetained: 3000,
      settlementStatus: 'PENDING', // Auditable, ready for monthly payroll
    },
  });

  // Contract 2: Member 2 with Priya Nair (Agreed: ₹20,000, Partial ₹12,000 received, ₹8,000 due)
  const ptContract2 = await prisma.ptContract.create({
    data: {
      contractCode: 'PT-1002',
      memberId: member2.id,
      trainerId: trainerPriya.id,
      goalCategory: 'WEIGHT_LOSS',
      goalDescription: 'Body transformation: lose 6kg, increase stamina and core strength',
      packageBasis: 'FIXED_DURATION',
      totalSessions: 24,
      completedSessions: 8,
      startDate: tenDaysAgo,
      endDate: inSixtyDays,
      contractAmount: 20000,
      discount: 0,
      finalPayable: 20000,
      amountPaid: 12000,
      outstandingBalance: 8000,
      trainerSharePercent: 70.0,
      gymSharePercent: 30.0,
      status: 'ACTIVE',
    },
  });

  // Partial Payment for PT Contract 2
  const ptTxn2 = await prisma.transaction.create({
    data: {
      transactionCode: 'TXN-10005',
      date: tenDaysAgo,
      memberId: member2.id,
      ptContractId: ptContract2.id,
      type: 'COLLECTION',
      category: 'PT',
      amount: 12000,
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: 'NEFT/AXIS892109',
      description: 'PT 24 Sessions - Advance Installment (Balance ₹8000)',
    },
  });

  // Commission strictly on ₹12,000 actually received: 70% = ₹8,400, Gym = ₹3,600
  await prisma.ptCommissionRecord.create({
    data: {
      ptContractId: ptContract2.id,
      transactionId: ptTxn2.id,
      trainerId: trainerPriya.id,
      paymentAmountReceived: 12000,
      eligibleRevenue: 12000,
      trainerSharePercent: 70.0,
      gymSharePercent: 30.0,
      trainerShareEarned: 8400,
      gymShareRetained: 3600,
      settlementStatus: 'PENDING',
    },
  });

  // 9. Expenses (Operating Expenses)
  const exp1 = await prisma.expense.create({
    data: {
      expenseCode: 'EXP-1001',
      title: 'Gym Floor Rent - Bandra Commercial Space',
      category: 'RENT',
      amount: 45000,
      expenseDate: new Date(now.getFullYear(), now.getMonth(), 2),
      paymentDate: new Date(now.getFullYear(), now.getMonth(), 2),
      paymentStatus: 'PAID',
      amountPaid: 45000,
      paymentMethod: 'BANK_TRANSFER',
      vendor: 'Elite Estates Pvt Ltd',
      referenceNumber: 'RTGS/001928374',
      notes: 'Monthly lease rent paid',
    },
  });

  await prisma.transaction.create({
    data: {
      transactionCode: 'TXN-10006',
      date: new Date(now.getFullYear(), now.getMonth(), 2),
      expenseId: exp1.id,
      type: 'EXPENSE',
      category: 'RENT',
      amount: 45000,
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: 'RTGS/001928374',
      description: 'Gym Floor Rent Payment',
    },
  });

  const exp2 = await prisma.expense.create({
    data: {
      expenseCode: 'EXP-1002',
      title: 'Commercial Electricity Bill (MSEDCL)',
      category: 'ELECTRICITY',
      amount: 14200,
      expenseDate: new Date(now.getFullYear(), now.getMonth(), 5),
      paymentDate: new Date(now.getFullYear(), now.getMonth(), 5),
      paymentStatus: 'PAID',
      amountPaid: 14200,
      paymentMethod: 'UPI',
      vendor: 'MSEDCL Mumbai',
      referenceNumber: 'UPI/MSEB-998811',
      notes: 'Heavy AC and lighting usage',
    },
  });

  await prisma.transaction.create({
    data: {
      transactionCode: 'TXN-10007',
      date: new Date(now.getFullYear(), now.getMonth(), 5),
      expenseId: exp2.id,
      type: 'EXPENSE',
      category: 'ELECTRICITY',
      amount: 14200,
      paymentMethod: 'UPI',
      referenceNumber: 'UPI/MSEB-998811',
      description: 'Electricity Bill Payment',
    },
  });

  const exp3 = await prisma.expense.create({
    data: {
      expenseCode: 'EXP-1003',
      title: 'Treadmill Belt Replacement & Cable Lubrication',
      category: 'MAINTENANCE',
      amount: 6500,
      expenseDate: new Date(now.getFullYear(), now.getMonth(), 8),
      paymentDate: new Date(now.getFullYear(), now.getMonth(), 8),
      paymentStatus: 'PAID',
      amountPaid: 6500,
      paymentMethod: 'CASH',
      vendor: 'FitMech Services',
      referenceNumber: 'CASH-REC-104',
      notes: 'Quarterly bi-monthly equipment service',
    },
  });

  await prisma.transaction.create({
    data: {
      transactionCode: 'TXN-10008',
      date: new Date(now.getFullYear(), now.getMonth(), 8),
      expenseId: exp3.id,
      type: 'EXPENSE',
      category: 'MAINTENANCE',
      amount: 6500,
      paymentMethod: 'CASH',
      referenceNumber: 'CASH-REC-104',
      description: 'Equipment Maintenance and Spare Parts',
    },
  });

  // 10. Attendance Records for current month
  // Create attendance records for Rahul Deshmukh for current month
  // (27 present, 2 half-days, 1 unpaid absent -> formula verification!)
  const daysInMonth = 30;
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const dateStr = `${year}-${monthStr}-${dayStr}`;

    let status = 'PRESENT';
    let units = 1.0;

    if (day === 14) {
      status = 'HALF_DAY';
      units = 0.5;
    } else if (day === 21) {
      status = 'HALF_DAY';
      units = 0.5;
    } else if (day === 28) {
      status = 'ABSENT';
      units = 0.0;
    }

    await prisma.attendanceRecord.create({
      data: {
        staffId: trainerRahul.id,
        date: dateStr,
        status,
        attendanceUnits: units,
        checkInTime: status === 'ABSENT' ? null : '06:00 AM',
        checkOutTime: status === 'ABSENT' ? null : (status === 'HALF_DAY' ? '10:00 AM' : '02:00 PM'),
        workingHours: status === 'ABSENT' ? 0 : (status === 'HALF_DAY' ? 4 : 8),
        notes: day === 28 ? 'Uninformed absence' : null,
      },
    });
  }

  // Attendance for Priya Nair (29 present, 1 leave)
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const dateStr = `${year}-${monthStr}-${dayStr}`;

    const status = day === 15 ? 'LEAVE' : 'PRESENT';
    const units = day === 15 ? 1.0 : 1.0; // paid leave

    await prisma.attendanceRecord.create({
      data: {
        staffId: trainerPriya.id,
        date: dateStr,
        status,
        attendanceUnits: units,
        checkInTime: status === 'LEAVE' ? null : '11:00 AM',
        checkOutTime: status === 'LEAVE' ? null : '07:00 PM',
        workingHours: status === 'LEAVE' ? 0 : 8,
      },
    });
  }

  // 11. Website Enquiries / Leads
  const lead1 = await prisma.websiteEnquiry.create({
    data: {
      leadCode: 'LEAD-1001',
      fullName: 'Siddharth Roy',
      phone: '+91 98205 55667',
      email: 'siddharth.roy@gmail.com',
      interestedService: 'PERSONAL_TRAINING',
      preferredPlanName: 'Monthly PT (16 Sessions)',
      message: 'Looking for 1-on-1 personal training for posture correction and fat loss. What are your trainer slots?',
      source: 'WEBSITE',
      status: 'NEW',
      assignedStaffId: trainerRahul.id,
      nextFollowUpDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      notes: 'Submitted via website hero contact form',
    },
  });

  await prisma.leadActivity.create({
    data: {
      enquiryId: lead1.id,
      type: 'NOTE',
      description: 'Enquiry received from website contact form',
    },
  });

  const lead2 = await prisma.websiteEnquiry.create({
    data: {
      leadCode: 'LEAD-1002',
      fullName: 'Meera Iyer',
      phone: '+91 98206 77889',
      email: 'meera.iyer@fintech.co',
      interestedService: 'GYM_MEMBERSHIP',
      preferredPlanName: 'Quarterly Pro',
      message: 'Interested in early morning 6 AM slots and steam room facilities.',
      source: 'WEBSITE',
      status: 'FOLLOW_UP_REQUIRED',
      assignedStaffId: receptionistKavita.id,
      nextFollowUpDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      notes: 'Called yesterday. Asked to call back on Friday morning after 10 AM.',
    },
  });

  await prisma.leadActivity.create({
    data: {
      enquiryId: lead2.id,
      type: 'CALL',
      description: 'Initial phone call made. Member requested follow-up Friday.',
    },
  });

  const lead3 = await prisma.websiteEnquiry.create({
    data: {
      leadCode: 'LEAD-1003',
      fullName: 'Aarav Mehta',
      phone: '+91 98200 12341',
      email: 'aarav.mehta@gmail.com',
      interestedService: 'GYM_MEMBERSHIP',
      preferredPlanName: 'Quarterly Pro',
      source: 'WEBSITE',
      status: 'CONVERTED',
      assignedStaffId: receptionistKavita.id,
      convertedMemberId: member1.id,
      convertedAt: tenDaysAgo,
      notes: 'Converted into Quarterly Pro member (MEM-1001)',
    },
  });

  await prisma.leadActivity.create({
    data: {
      enquiryId: lead3.id,
      type: 'CONVERTED',
      description: 'Lead converted into active gym member MEM-1001',
    },
  });

  // 12. Audit Logs
  await prisma.auditLog.create({
    data: {
      action: 'SYSTEM_INIT',
      entityType: 'GYM_SETTINGS',
      entityId: 'default-settings',
      details: JSON.stringify({ seeded: true, timestamp: new Date().toISOString() }),
      performedById: ownerUser.id,
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
