import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { UserRole } from '@velon/database';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePortalScope } from '../auth/decorators/portal-scope.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { PortalScopeGuard } from '../auth/guards/portal-scope.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantScopeGuard } from '../auth/guards/tenant-scope.guard';
import {
  CreateHrApplicantDto,
  CreateHrDesignationDto,
  CreateHrEmployeeDto,
  CreateHrExpenseClaimDto,
  CreateHrJobOpeningDto,
  CreateHrLeaveRequestDto,
  CreateHrLeaveTypeDto,
  CreateHrPayrollRunDto,
  CreateHrSalaryComponentDto,
  CreateHrSalaryStructureDto,
  HrAttendanceCheckInDto,
  HrAttendanceCheckOutDto,
  HrAttendanceQueryDto,
  HrDesignationQueryDto,
  HrEmployeeQueryDto,
  HrExpenseClaimQueryDto,
  HrJobOpeningQueryDto,
  HrLeaveRequestQueryDto,
  HrPayrollRunQueryDto,
  RejectHrExpenseClaimDto,
  RejectHrLeaveRequestDto,
  UpdateHrApplicantStatusDto,
  UpdateHrDesignationDto,
  UpdateHrEmployeeDto,
  UpdateHrExpenseClaimDto,
  UpdateHrJobOpeningDto,
  UpdateHrLeaveTypeDto,
  UpdateHrSalaryComponentDto,
  UpdateHrSalaryStructureDto,
} from './dto/hr.dto';
import { HrService } from './hr.service';

@ApiTags('hr')
@Controller('hr')
@RequirePortalScope('tenant')
@UseGuards(JwtAuthGuard, PortalScopeGuard, TenantScopeGuard, RolesGuard, PermissionGuard)
@RequirePermission('hr:read', 'hr:*')
@Roles(UserRole.TENANT_OWNER, UserRole.TENANT_ADMIN, UserRole.DEPARTMENT_ADMIN, UserRole.USER)
@ApiBearerAuth()
export class HrController {
  constructor(private readonly hr: HrService) {}

  @Get('metrics')
  getMetrics(@CurrentUser() user: AuthenticatedUser) {
    return this.hr.getMetrics(user);
  }

  // ─── Designations ──────────────────────────────────────────

  @Get('designations')
  listDesignations(@CurrentUser() user: AuthenticatedUser, @Query() query: HrDesignationQueryDto) {
    return this.hr.listDesignations(user, query);
  }

  @Get('designations/:id')
  getDesignation(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hr.getDesignation(user, id);
  }

  @Post('designations')
  @RequirePermission('hr:write', 'hr:*')
  createDesignation(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateHrDesignationDto) {
    return this.hr.createDesignation(user, dto);
  }

  @Patch('designations/:id')
  @RequirePermission('hr:write', 'hr:*')
  updateDesignation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateHrDesignationDto,
  ) {
    return this.hr.updateDesignation(user, id, dto);
  }

  @Delete('designations/:id')
  @RequirePermission('hr:write', 'hr:*')
  deleteDesignation(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hr.deleteDesignation(user, id);
  }

  // ─── Employees ─────────────────────────────────────────────

  @Get('employees')
  listEmployees(@CurrentUser() user: AuthenticatedUser, @Query() query: HrEmployeeQueryDto) {
    return this.hr.listEmployees(user, query);
  }

  @Get('employees/:id')
  getEmployee(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hr.getEmployee(user, id);
  }

  @Post('employees')
  @RequirePermission('hr:write', 'hr:*')
  createEmployee(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateHrEmployeeDto) {
    return this.hr.createEmployee(user, dto);
  }

  @Patch('employees/:id')
  @RequirePermission('hr:write', 'hr:*')
  updateEmployee(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateHrEmployeeDto,
  ) {
    return this.hr.updateEmployee(user, id, dto);
  }

  @Delete('employees/:id')
  @RequirePermission('hr:write', 'hr:*')
  deleteEmployee(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hr.deleteEmployee(user, id);
  }

  // ─── Leave types ───────────────────────────────────────────

  @Get('leave-types')
  listLeaveTypes(@CurrentUser() user: AuthenticatedUser) {
    return this.hr.listLeaveTypes(user);
  }

  @Get('leave-types/:id')
  getLeaveType(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hr.getLeaveType(user, id);
  }

  @Post('leave-types')
  @RequirePermission('hr:write', 'hr:*')
  createLeaveType(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateHrLeaveTypeDto) {
    return this.hr.createLeaveType(user, dto);
  }

  @Patch('leave-types/:id')
  @RequirePermission('hr:write', 'hr:*')
  updateLeaveType(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateHrLeaveTypeDto,
  ) {
    return this.hr.updateLeaveType(user, id, dto);
  }

  @Delete('leave-types/:id')
  @RequirePermission('hr:write', 'hr:*')
  deleteLeaveType(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hr.deleteLeaveType(user, id);
  }

  // ─── Leave requests ────────────────────────────────────────

  @Get('leave-requests')
  listLeaveRequests(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: HrLeaveRequestQueryDto,
  ) {
    return this.hr.listLeaveRequests(user, query);
  }

  @Post('leave-requests')
  createLeaveRequest(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateHrLeaveRequestDto) {
    return this.hr.createLeaveRequest(user, dto);
  }

  @Post('leave-requests/:id/approve')
  @RequirePermission('hr:write', 'hr:*')
  approveLeaveRequest(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hr.approveLeaveRequest(user, id);
  }

  @Post('leave-requests/:id/reject')
  @RequirePermission('hr:write', 'hr:*')
  rejectLeaveRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RejectHrLeaveRequestDto,
  ) {
    return this.hr.rejectLeaveRequest(user, id, dto);
  }

  // ─── Attendance ────────────────────────────────────────────

  @Get('attendance')
  listAttendance(@CurrentUser() user: AuthenticatedUser, @Query() query: HrAttendanceQueryDto) {
    return this.hr.listAttendance(user, query);
  }

  @Post('attendance/check-in')
  checkIn(@CurrentUser() user: AuthenticatedUser, @Body() dto: HrAttendanceCheckInDto) {
    return this.hr.checkIn(user, dto);
  }

  @Post('attendance/check-out')
  checkOut(@CurrentUser() user: AuthenticatedUser, @Body() dto: HrAttendanceCheckOutDto) {
    return this.hr.checkOut(user, dto);
  }

  // ─── Job openings ──────────────────────────────────────────

  @Get('jobs')
  listJobOpenings(@CurrentUser() user: AuthenticatedUser, @Query() query: HrJobOpeningQueryDto) {
    return this.hr.listJobOpenings(user, query);
  }

  @Get('jobs/:id')
  getJobOpening(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hr.getJobOpening(user, id);
  }

  @Post('jobs')
  @RequirePermission('hr:write', 'hr:*')
  createJobOpening(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateHrJobOpeningDto) {
    return this.hr.createJobOpening(user, dto);
  }

  @Patch('jobs/:id')
  @RequirePermission('hr:write', 'hr:*')
  updateJobOpening(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateHrJobOpeningDto,
  ) {
    return this.hr.updateJobOpening(user, id, dto);
  }

  @Delete('jobs/:id')
  @RequirePermission('hr:write', 'hr:*')
  deleteJobOpening(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hr.deleteJobOpening(user, id);
  }

  @Get('jobs/:id/applicants')
  listApplicants(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hr.listApplicants(user, id);
  }

  @Post('jobs/:id/applicants')
  createApplicant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateHrApplicantDto,
  ) {
    return this.hr.createApplicant(user, id, dto);
  }

  @Patch('applicants/:id/status')
  @RequirePermission('hr:write', 'hr:*')
  updateApplicantStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateHrApplicantStatusDto,
  ) {
    return this.hr.updateApplicantStatus(user, id, dto);
  }

  // ─── Salary components ─────────────────────────────────────

  @Get('salary-components')
  listSalaryComponents(@CurrentUser() user: AuthenticatedUser) {
    return this.hr.listSalaryComponents(user);
  }

  @Get('salary-components/:id')
  getSalaryComponent(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hr.getSalaryComponent(user, id);
  }

  @Post('salary-components')
  @RequirePermission('hr:write', 'hr:*')
  createSalaryComponent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateHrSalaryComponentDto,
  ) {
    return this.hr.createSalaryComponent(user, dto);
  }

  @Patch('salary-components/:id')
  @RequirePermission('hr:write', 'hr:*')
  updateSalaryComponent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateHrSalaryComponentDto,
  ) {
    return this.hr.updateSalaryComponent(user, id, dto);
  }

  @Delete('salary-components/:id')
  @RequirePermission('hr:write', 'hr:*')
  deleteSalaryComponent(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hr.deleteSalaryComponent(user, id);
  }

  // ─── Salary structures ─────────────────────────────────────

  @Get('salary-structures')
  listSalaryStructures(@CurrentUser() user: AuthenticatedUser) {
    return this.hr.listSalaryStructures(user);
  }

  @Get('salary-structures/:id')
  getSalaryStructure(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hr.getSalaryStructure(user, id);
  }

  @Post('salary-structures')
  @RequirePermission('hr:write', 'hr:*')
  createSalaryStructure(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateHrSalaryStructureDto,
  ) {
    return this.hr.createSalaryStructure(user, dto);
  }

  @Patch('salary-structures/:id')
  @RequirePermission('hr:write', 'hr:*')
  updateSalaryStructure(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateHrSalaryStructureDto,
  ) {
    return this.hr.updateSalaryStructure(user, id, dto);
  }

  @Delete('salary-structures/:id')
  @RequirePermission('hr:write', 'hr:*')
  deleteSalaryStructure(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hr.deleteSalaryStructure(user, id);
  }

  // ─── Payroll ───────────────────────────────────────────────

  @Get('payroll-runs')
  listPayrollRuns(@CurrentUser() user: AuthenticatedUser, @Query() query: HrPayrollRunQueryDto) {
    return this.hr.listPayrollRuns(user, query);
  }

  @Post('payroll-runs')
  @RequirePermission('hr:write', 'hr:*')
  createPayrollRun(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateHrPayrollRunDto) {
    return this.hr.createPayrollRun(user, dto);
  }

  @Post('payroll-runs/:id/process')
  @RequirePermission('hr:write', 'hr:*')
  processPayrollRun(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hr.processPayrollRun(user, id);
  }

  @Get('payroll-runs/:runId/payslips')
  listPayslipsByRun(@CurrentUser() user: AuthenticatedUser, @Param('runId') runId: string) {
    return this.hr.listPayslipsByRun(user, runId);
  }

  @Get('payslips/:id/pdf')
  async getPayslipPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const result = await this.hr.getPayslipPdf(user, id);
    if ('buffer' in result) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.send(result.buffer);
      return;
    }
    res.json(result);
  }

  // ─── Expense claims ────────────────────────────────────────

  @Get('expense-claims')
  listExpenseClaims(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: HrExpenseClaimQueryDto,
  ) {
    return this.hr.listExpenseClaims(user, query);
  }

  @Get('expense-claims/:id')
  getExpenseClaim(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hr.getExpenseClaim(user, id);
  }

  @Post('expense-claims')
  createExpenseClaim(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateHrExpenseClaimDto) {
    return this.hr.createExpenseClaim(user, dto);
  }

  @Patch('expense-claims/:id')
  updateExpenseClaim(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateHrExpenseClaimDto,
  ) {
    return this.hr.updateExpenseClaim(user, id, dto);
  }

  @Delete('expense-claims/:id')
  @RequirePermission('hr:write', 'hr:*')
  deleteExpenseClaim(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hr.deleteExpenseClaim(user, id);
  }

  @Post('expense-claims/:id/submit')
  submitExpenseClaim(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hr.submitExpenseClaim(user, id);
  }

  @Post('expense-claims/:id/approve')
  @RequirePermission('hr:write', 'hr:*')
  approveExpenseClaim(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hr.approveExpenseClaim(user, id);
  }

  @Post('expense-claims/:id/reject')
  @RequirePermission('hr:write', 'hr:*')
  rejectExpenseClaim(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RejectHrExpenseClaimDto,
  ) {
    return this.hr.rejectExpenseClaim(user, id, dto);
  }
}
