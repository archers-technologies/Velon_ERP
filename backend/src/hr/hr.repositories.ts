import { Injectable } from '@nestjs/common';
import {
  HrApplicantStatus,
  HrAttendanceStatus,
  HrEmploymentStatus,
  HrExpenseClaimStatus,
  HrJobOpeningStatus,
  HrLeaveRequestStatus,
  HrPayrollRunStatus,
  Prisma,
} from '@velon/database';
import { TenantScopedRepository } from '../common/repositories/tenant-scoped.repository';
import { PrismaService } from '../prisma/prisma.service';

const employeeInclude = {
  designation: { select: { id: true, name: true, level: true } },
  department: { select: { id: true, name: true } },
  manager: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
  salaryStructure: { select: { id: true, name: true, currency: true } },
  createdBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.HrEmployeeInclude;

@Injectable()
export class HrDesignationRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany(search?: string) {
    const q = search?.trim();
    return this.prisma.client.hrDesignation.findMany({
      where: {
        ...this.where(),
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { employees: true } } },
    });
  }

  findById(id: string) {
    return this.prisma.client.hrDesignation.findFirst({
      where: this.where({ id }),
      include: { _count: { select: { employees: true } } },
    });
  }

  create(data: Omit<Prisma.HrDesignationUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.hrDesignation.create({
      data: { ...data, tenantId: this.tenantId },
    });
  }

  update(id: string, data: Prisma.HrDesignationUncheckedUpdateInput) {
    return this.prisma.client.hrDesignation.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.client.hrDesignation.delete({ where: { id } });
  }
}

@Injectable()
export class HrEmployeeRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany(opts: { search?: string; status?: HrEmploymentStatus; departmentId?: string }) {
    const OR: Prisma.HrEmployeeWhereInput[] = [];
    const q = opts.search?.trim();
    if (q) {
      OR.push(
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { employeeCode: { contains: q, mode: 'insensitive' } },
      );
    }
    return this.prisma.client.hrEmployee.findMany({
      where: {
        ...this.where({
          ...(opts.status ? { status: opts.status } : {}),
          ...(opts.departmentId ? { departmentId: opts.departmentId } : {}),
        }),
        ...(OR.length ? { OR } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: employeeInclude,
    });
  }

  findById(id: string) {
    return this.prisma.client.hrEmployee.findFirst({
      where: this.where({ id }),
      include: employeeInclude,
    });
  }

  findByIdAny(id: string) {
    return this.prisma.client.hrEmployee.findFirst({ where: this.where({ id }) });
  }

  findActiveForPayroll() {
    return this.prisma.client.hrEmployee.findMany({
      where: this.where({
        status: { in: [HrEmploymentStatus.ACTIVE, HrEmploymentStatus.PROBATION] },
      }),
      include: employeeInclude,
    });
  }

  create(data: Omit<Prisma.HrEmployeeUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.hrEmployee.create({
      data: { ...data, tenantId: this.tenantId },
      include: employeeInclude,
    });
  }

  update(id: string, data: Prisma.HrEmployeeUncheckedUpdateInput) {
    return this.prisma.client.hrEmployee.update({
      where: { id },
      data,
      include: employeeInclude,
    });
  }

  delete(id: string) {
    return this.prisma.client.hrEmployee.delete({ where: { id } });
  }

  countByStatus() {
    return this.prisma.client.hrEmployee.groupBy({
      by: ['status'],
      where: this.where(),
      _count: true,
    });
  }

  nextEmployeeCode() {
    return this.prisma.client.$transaction(async (tx) => {
      const count = await tx.hrEmployee.count({ where: { tenantId: this.tenantId } });
      const num = String(count + 1).padStart(5, '0');
      return `EMP-${num}`;
    });
  }
}

@Injectable()
export class HrLeaveTypeRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany() {
    return this.prisma.client.hrLeaveType.findMany({
      where: this.where(),
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.client.hrLeaveType.findFirst({ where: this.where({ id }) });
  }

  create(data: Omit<Prisma.HrLeaveTypeUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.hrLeaveType.create({
      data: { ...data, tenantId: this.tenantId },
    });
  }

  update(id: string, data: Prisma.HrLeaveTypeUncheckedUpdateInput) {
    return this.prisma.client.hrLeaveType.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.client.hrLeaveType.delete({ where: { id } });
  }
}

@Injectable()
export class HrLeaveRequestRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany(opts: { employeeId?: string; status?: HrLeaveRequestStatus }) {
    return this.prisma.client.hrLeaveRequest.findMany({
      where: this.where({
        ...(opts.employeeId ? { employeeId: opts.employeeId } : {}),
        ...(opts.status ? { status: opts.status } : {}),
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        leaveType: { select: { id: true, name: true, code: true } },
        requestedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  findById(id: string) {
    return this.prisma.client.hrLeaveRequest.findFirst({
      where: this.where({ id }),
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        leaveType: { select: { id: true, name: true, code: true } },
        requestedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  create(data: Omit<Prisma.HrLeaveRequestUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.hrLeaveRequest.create({
      data: { ...data, tenantId: this.tenantId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        leaveType: { select: { id: true, name: true, code: true } },
      },
    });
  }

  update(id: string, data: Prisma.HrLeaveRequestUncheckedUpdateInput) {
    return this.prisma.client.hrLeaveRequest.update({
      where: { id },
      data,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        leaveType: { select: { id: true, name: true, code: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  countPending() {
    return this.prisma.client.hrLeaveRequest.count({
      where: this.where({ status: HrLeaveRequestStatus.PENDING }),
    });
  }
}

@Injectable()
export class HrLeaveBalanceRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findByEmployeeYear(employeeId: string, year: number) {
    return this.prisma.client.hrLeaveBalance.findMany({
      where: this.where({ employeeId, year }),
      include: { leaveType: { select: { id: true, name: true, code: true } } },
    });
  }

  upsert(data: {
    employeeId: string;
    leaveTypeId: string;
    year: number;
    entitled?: number;
    used?: number;
    pending?: number;
  }) {
    return this.prisma.client.hrLeaveBalance.upsert({
      where: {
        tenantId_employeeId_leaveTypeId_year: {
          tenantId: this.tenantId,
          employeeId: data.employeeId,
          leaveTypeId: data.leaveTypeId,
          year: data.year,
        },
      },
      create: {
        tenantId: this.tenantId,
        employeeId: data.employeeId,
        leaveTypeId: data.leaveTypeId,
        year: data.year,
        entitled: data.entitled ?? 0,
        used: data.used ?? 0,
        pending: data.pending ?? 0,
      },
      update: {
        ...(data.entitled != null ? { entitled: data.entitled } : {}),
        ...(data.used != null ? { used: data.used } : {}),
        ...(data.pending != null ? { pending: data.pending } : {}),
      },
    });
  }
}

@Injectable()
export class HrShiftRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany() {
    return this.prisma.client.hrShift.findMany({
      where: this.where(),
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.client.hrShift.findFirst({ where: this.where({ id }) });
  }

  create(data: Omit<Prisma.HrShiftUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.hrShift.create({
      data: { ...data, tenantId: this.tenantId },
    });
  }

  update(id: string, data: Prisma.HrShiftUncheckedUpdateInput) {
    return this.prisma.client.hrShift.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.client.hrShift.delete({ where: { id } });
  }
}

@Injectable()
export class HrAttendanceRecordRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany(opts: { employeeId?: string; from?: Date; to?: Date }) {
    return this.prisma.client.hrAttendanceRecord.findMany({
      where: this.where({
        ...(opts.employeeId ? { employeeId: opts.employeeId } : {}),
        ...(opts.from || opts.to
          ? {
              workDate: {
                ...(opts.from ? { gte: opts.from } : {}),
                ...(opts.to ? { lte: opts.to } : {}),
              },
            }
          : {}),
      }),
      orderBy: { workDate: 'desc' },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        shift: { select: { id: true, name: true, startTime: true, endTime: true } },
      },
    });
  }

  findByEmployeeDate(employeeId: string, workDate: Date) {
    return this.prisma.client.hrAttendanceRecord.findFirst({
      where: this.where({ employeeId, workDate }),
    });
  }

  findById(id: string) {
    return this.prisma.client.hrAttendanceRecord.findFirst({
      where: this.where({ id }),
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        shift: true,
      },
    });
  }

  create(data: Omit<Prisma.HrAttendanceRecordUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.hrAttendanceRecord.create({
      data: { ...data, tenantId: this.tenantId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        shift: true,
      },
    });
  }

  update(id: string, data: Prisma.HrAttendanceRecordUncheckedUpdateInput) {
    return this.prisma.client.hrAttendanceRecord.update({
      where: { id },
      data,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        shift: true,
      },
    });
  }

  upsertCheckIn(data: {
    employeeId: string;
    workDate: Date;
    checkInAt: Date;
    shiftId?: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
  }) {
    return this.prisma.client.hrAttendanceRecord.upsert({
      where: {
        tenantId_employeeId_workDate: {
          tenantId: this.tenantId,
          employeeId: data.employeeId,
          workDate: data.workDate,
        },
      },
      create: {
        tenantId: this.tenantId,
        employeeId: data.employeeId,
        workDate: data.workDate,
        checkInAt: data.checkInAt,
        shiftId: data.shiftId,
        latitude: data.latitude,
        longitude: data.longitude,
        notes: data.notes,
        status: HrAttendanceStatus.PRESENT,
      },
      update: {
        checkInAt: data.checkInAt,
        ...(data.shiftId ? { shiftId: data.shiftId } : {}),
        ...(data.latitude != null ? { latitude: data.latitude } : {}),
        ...(data.longitude != null ? { longitude: data.longitude } : {}),
        ...(data.notes ? { notes: data.notes } : {}),
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        shift: true,
      },
    });
  }
}

@Injectable()
export class HrJobOpeningRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany(opts: { search?: string; status?: HrJobOpeningStatus }) {
    const q = opts.search?.trim();
    return this.prisma.client.hrJobOpening.findMany({
      where: {
        ...this.where({
          ...(opts.status ? { status: opts.status } : {}),
        }),
        ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        department: { select: { id: true, name: true } },
        _count: { select: { applicants: true } },
      },
    });
  }

  findById(id: string) {
    return this.prisma.client.hrJobOpening.findFirst({
      where: this.where({ id }),
      include: {
        department: { select: { id: true, name: true } },
        _count: { select: { applicants: true } },
      },
    });
  }

  create(data: Omit<Prisma.HrJobOpeningUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.hrJobOpening.create({
      data: { ...data, tenantId: this.tenantId },
      include: { department: { select: { id: true, name: true } } },
    });
  }

  update(id: string, data: Prisma.HrJobOpeningUncheckedUpdateInput) {
    return this.prisma.client.hrJobOpening.update({
      where: { id },
      data,
      include: { department: { select: { id: true, name: true } } },
    });
  }

  delete(id: string) {
    return this.prisma.client.hrJobOpening.delete({ where: { id } });
  }

  countOpen() {
    return this.prisma.client.hrJobOpening.count({
      where: this.where({ status: HrJobOpeningStatus.OPEN }),
    });
  }
}

@Injectable()
export class HrApplicantRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findByJob(jobOpeningId: string) {
    return this.prisma.client.hrApplicant.findMany({
      where: this.where({ jobOpeningId }),
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.client.hrApplicant.findFirst({
      where: this.where({ id }),
      include: { jobOpening: { select: { id: true, title: true } } },
    });
  }

  create(data: Omit<Prisma.HrApplicantUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.hrApplicant.create({
      data: { ...data, tenantId: this.tenantId },
    });
  }

  update(id: string, data: Prisma.HrApplicantUncheckedUpdateInput) {
    return this.prisma.client.hrApplicant.update({ where: { id }, data });
  }
}

@Injectable()
export class HrSalaryComponentRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany() {
    return this.prisma.client.hrSalaryComponent.findMany({
      where: this.where(),
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.client.hrSalaryComponent.findFirst({ where: this.where({ id }) });
  }

  create(data: Omit<Prisma.HrSalaryComponentUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.hrSalaryComponent.create({
      data: { ...data, tenantId: this.tenantId },
    });
  }

  update(id: string, data: Prisma.HrSalaryComponentUncheckedUpdateInput) {
    return this.prisma.client.hrSalaryComponent.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.client.hrSalaryComponent.delete({ where: { id } });
  }
}

@Injectable()
export class HrSalaryStructureRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany() {
    return this.prisma.client.hrSalaryStructure.findMany({
      where: this.where(),
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: {
        items: { include: { component: true } },
        _count: { select: { employees: true } },
      },
    });
  }

  findById(id: string) {
    return this.prisma.client.hrSalaryStructure.findFirst({
      where: this.where({ id }),
      include: {
        items: { include: { component: true } },
        _count: { select: { employees: true } },
      },
    });
  }

  create(data: Omit<Prisma.HrSalaryStructureUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.hrSalaryStructure.create({
      data: { ...data, tenantId: this.tenantId },
      include: { items: { include: { component: true } } },
    });
  }

  update(id: string, data: Prisma.HrSalaryStructureUncheckedUpdateInput) {
    return this.prisma.client.hrSalaryStructure.update({
      where: { id },
      data,
      include: { items: { include: { component: true } } },
    });
  }

  delete(id: string) {
    return this.prisma.client.hrSalaryStructure.delete({ where: { id } });
  }

  replaceItems(
    structureId: string,
    items: Omit<Prisma.HrSalaryStructureItemUncheckedCreateInput, 'tenantId' | 'structureId'>[],
  ) {
    return this.prisma.client.$transaction(async (tx) => {
      await tx.hrSalaryStructureItem.deleteMany({
        where: { tenantId: this.tenantId, structureId },
      });
      if (items.length) {
        await tx.hrSalaryStructureItem.createMany({
          data: items.map((item) => ({
            ...item,
            tenantId: this.tenantId,
            structureId,
          })),
        });
      }
      return tx.hrSalaryStructure.findFirst({
        where: { id: structureId, tenantId: this.tenantId },
        include: { items: { include: { component: true } } },
      });
    });
  }
}

@Injectable()
export class HrPayrollRunRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany(opts?: { status?: HrPayrollRunStatus }) {
    return this.prisma.client.hrPayrollRun.findMany({
      where: this.where(opts?.status ? { status: opts.status } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        processedBy: { select: { id: true, name: true, email: true } },
        _count: { select: { payslips: true } },
      },
    });
  }

  findById(id: string) {
    return this.prisma.client.hrPayrollRun.findFirst({
      where: this.where({ id }),
      include: {
        processedBy: { select: { id: true, name: true, email: true } },
        _count: { select: { payslips: true } },
      },
    });
  }

  create(data: Omit<Prisma.HrPayrollRunUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.hrPayrollRun.create({
      data: { ...data, tenantId: this.tenantId },
      include: { _count: { select: { payslips: true } } },
    });
  }

  update(id: string, data: Prisma.HrPayrollRunUncheckedUpdateInput) {
    return this.prisma.client.hrPayrollRun.update({
      where: { id },
      data,
      include: {
        processedBy: { select: { id: true, name: true, email: true } },
        _count: { select: { payslips: true } },
      },
    });
  }
}

@Injectable()
export class HrPayslipRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findByRun(payrollRunId: string) {
    return this.prisma.client.hrPayslip.findMany({
      where: this.where({ payrollRunId }),
      orderBy: { createdAt: 'asc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  findById(id: string) {
    return this.prisma.client.hrPayslip.findFirst({
      where: this.where({ id }),
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            email: true,
            department: { select: { id: true, name: true } },
            designation: { select: { id: true, name: true } },
          },
        },
        payrollRun: {
          select: { id: true, name: true, periodStart: true, periodEnd: true, currency: true },
        },
      },
    });
  }

  create(data: Omit<Prisma.HrPayslipUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.hrPayslip.create({
      data: { ...data, tenantId: this.tenantId },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
      },
    });
  }

  update(id: string, data: Prisma.HrPayslipUncheckedUpdateInput) {
    return this.prisma.client.hrPayslip.update({ where: { id }, data });
  }

  deleteByRun(payrollRunId: string) {
    return this.prisma.client.hrPayslip.deleteMany({
      where: this.where({ payrollRunId }),
    });
  }
}

@Injectable()
export class HrExpenseClaimRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany(opts: { employeeId?: string; status?: HrExpenseClaimStatus }) {
    return this.prisma.client.hrExpenseClaim.findMany({
      where: this.where({
        ...(opts.employeeId ? { employeeId: opts.employeeId } : {}),
        ...(opts.status ? { status: opts.status } : {}),
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        requestedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  findById(id: string) {
    return this.prisma.client.hrExpenseClaim.findFirst({
      where: this.where({ id }),
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        requestedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  create(data: Omit<Prisma.HrExpenseClaimUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.hrExpenseClaim.create({
      data: { ...data, tenantId: this.tenantId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });
  }

  update(id: string, data: Prisma.HrExpenseClaimUncheckedUpdateInput) {
    return this.prisma.client.hrExpenseClaim.update({
      where: { id },
      data,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  delete(id: string) {
    return this.prisma.client.hrExpenseClaim.delete({ where: { id } });
  }
}

@Injectable()
export class HrHolidayCalendarRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findMany() {
    return this.prisma.client.hrHolidayCalendar.findMany({
      where: this.where(),
      orderBy: [{ year: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { holidays: true } } },
    });
  }

  findById(id: string) {
    return this.prisma.client.hrHolidayCalendar.findFirst({
      where: this.where({ id }),
      include: { holidays: { orderBy: { holidayDate: 'asc' } } },
    });
  }

  create(data: Omit<Prisma.HrHolidayCalendarUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.hrHolidayCalendar.create({
      data: { ...data, tenantId: this.tenantId },
    });
  }

  update(id: string, data: Prisma.HrHolidayCalendarUncheckedUpdateInput) {
    return this.prisma.client.hrHolidayCalendar.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.client.hrHolidayCalendar.delete({ where: { id } });
  }
}

@Injectable()
export class HrHolidayRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findByCalendar(calendarId: string) {
    return this.prisma.client.hrHoliday.findMany({
      where: this.where({ calendarId }),
      orderBy: { holidayDate: 'asc' },
    });
  }

  create(data: Omit<Prisma.HrHolidayUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.hrHoliday.create({
      data: { ...data, tenantId: this.tenantId },
    });
  }

  delete(id: string) {
    return this.prisma.client.hrHoliday.delete({ where: { id } });
  }
}

@Injectable()
export class HrEmployeeDocumentRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findByEmployee(employeeId: string) {
    return this.prisma.client.hrEmployeeDocument.findMany({
      where: this.where({ employeeId }),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        category: true,
        mimeType: true,
        fileName: true,
        sizeBytes: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  findById(id: string) {
    return this.prisma.client.hrEmployeeDocument.findFirst({
      where: this.where({ id }),
    });
  }

  create(data: Omit<Prisma.HrEmployeeDocumentUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.hrEmployeeDocument.create({
      data: { ...data, tenantId: this.tenantId },
      select: {
        id: true,
        name: true,
        category: true,
        mimeType: true,
        fileName: true,
        sizeBytes: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  delete(id: string) {
    return this.prisma.client.hrEmployeeDocument.delete({ where: { id } });
  }
}

@Injectable()
export class HrEmployeeNoteRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findByEmployee(employeeId: string) {
    return this.prisma.client.hrEmployeeNote.findMany({
      where: this.where({ employeeId }),
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: Omit<Prisma.HrEmployeeNoteUncheckedCreateInput, 'tenantId'>) {
    return this.prisma.client.hrEmployeeNote.create({
      data: { ...data, tenantId: this.tenantId },
    });
  }

  delete(id: string) {
    return this.prisma.client.hrEmployeeNote.delete({ where: { id } });
  }
}

export const HR_REPOSITORIES = [
  HrDesignationRepository,
  HrEmployeeRepository,
  HrLeaveTypeRepository,
  HrLeaveRequestRepository,
  HrLeaveBalanceRepository,
  HrShiftRepository,
  HrAttendanceRecordRepository,
  HrJobOpeningRepository,
  HrApplicantRepository,
  HrSalaryComponentRepository,
  HrSalaryStructureRepository,
  HrPayrollRunRepository,
  HrPayslipRepository,
  HrExpenseClaimRepository,
  HrHolidayCalendarRepository,
  HrHolidayRepository,
  HrEmployeeDocumentRepository,
  HrEmployeeNoteRepository,
];
