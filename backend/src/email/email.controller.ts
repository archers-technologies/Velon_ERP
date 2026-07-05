import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmailLogStatus, UserRole } from '@velon/database';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePortalScope } from '../auth/decorators/portal-scope.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PortalScopeGuard } from '../auth/guards/portal-scope.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  SendTestEmailDto,
  UnsubscribePreferencesDto,
  UpdateEmailPreferencesDto,
  UpdateEmailTemplateDto,
} from './dto/email.dto';
import { getAppBaseUrl } from './email-env.util';
import { EmailLifecycleService } from './email-lifecycle.service';
import { EmailLogService } from './email-log.service';
import { EmailPreferenceService } from './email-preference.service';
import { EMAIL_SUPPORT_REPLY_TEMPLATES } from './email-support-templates';
import { renderEmailTemplate } from './email-template-renderer.util';
import { EmailTemplateService } from './email-template.service';

@ApiTags('email')
@Controller('email')
export class EmailController {
  constructor(
    private readonly templates: EmailTemplateService,
    private readonly logs: EmailLogService,
    private readonly preferences: EmailPreferenceService,
    private readonly lifecycle: EmailLifecycleService,
  ) {}

  @Get('platform/templates')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  @ApiBearerAuth()
  listPlatformTemplates() {
    return this.templates.list();
  }

  @Patch('platform/templates/:key')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  updateTemplate(@Param('key') key: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.templates.update(key, dto);
  }

  @Post('platform/templates/:key/test')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  testTemplate(@Param('key') key: string, @Body() dto: SendTestEmailDto) {
    return this.lifecycle.sendTestEmail(key, dto.toEmail);
  }

  @Get('platform/logs')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT)
  @ApiBearerAuth()
  listPlatformLogs(
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: EmailLogStatus,
    @Query('limit') limit?: string,
  ) {
    return this.logs.list({
      tenantId,
      status,
      limit: limit ? Number(limit) : 100,
    });
  }

  @Post('platform/logs/:id/resend')
  @RequirePortalScope('platform')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  resendLog(@Param('id') id: string) {
    return this.lifecycle.resendFailed(id);
  }

  @Get('preferences')
  @RequirePortalScope('tenant')
  @UseGuards(JwtAuthGuard, PortalScopeGuard)
  @ApiBearerAuth()
  getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.preferences.getOrCreate(user.id, user.tenantId);
  }

  @Patch('preferences')
  @RequirePortalScope('tenant')
  @UseGuards(JwtAuthGuard, PortalScopeGuard)
  @ApiBearerAuth()
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateEmailPreferencesDto,
  ) {
    return this.preferences.update(user.id, user.tenantId, dto);
  }

  @Get('logs')
  @RequirePortalScope('tenant')
  @UseGuards(JwtAuthGuard, PortalScopeGuard, RolesGuard)
  @Roles(UserRole.TENANT_OWNER, UserRole.TENANT_ADMIN)
  @ApiBearerAuth()
  listTenantLogs(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.logs.list({
      tenantId: user.tenantId,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Get('crm/customers/:customerId/timeline')
  @RequirePortalScope('tenant')
  @UseGuards(JwtAuthGuard, PortalScopeGuard)
  @ApiBearerAuth()
  customerTimeline(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerId') customerId: string,
  ) {
    return this.logs.list({
      tenantId: user.tenantId,
      customerId,
      limit: 100,
    });
  }

  @Get('support/templates')
  @RequirePortalScope('tenant')
  @UseGuards(JwtAuthGuard, PortalScopeGuard)
  @ApiBearerAuth()
  supportTemplates() {
    return EMAIL_SUPPORT_REPLY_TEMPLATES.map((t) => ({
      key: t.key,
      name: t.name,
      subject: t.subject,
    }));
  }

  @Get('support/templates/:key/preview')
  @RequirePortalScope('tenant')
  @UseGuards(JwtAuthGuard, PortalScopeGuard)
  @ApiBearerAuth()
  previewSupportTemplate(@Param('key') key: string) {
    const tpl = EMAIL_SUPPORT_REPLY_TEMPLATES.find((t) => t.key === key);
    if (!tpl) return { error: 'not_found' };
    const ctx = this.lifecycle.buildBaseContext({
      user: { name: 'Alex Morgan', email: 'alex@example.com' },
      workspace: { name: 'Acme Workspace' },
      plan: { name: 'Professional' },
      subscription: { renewalDate: '2026-08-01' },
      invoice: { number: 'INV-001', amount: '149.00', currency: 'USD' },
      inviteUrl: `${getAppBaseUrl()}/invite/sample`,
    });
    return {
      subject: renderEmailTemplate(tpl.subject, ctx),
      body: renderEmailTemplate(tpl.body, ctx),
    };
  }

  @Get('unsubscribe/:token')
  getUnsubscribePreferences(@Param('token') token: string) {
    return this.preferences.getByToken(token);
  }

  @Patch('unsubscribe/:token')
  unsubscribe(@Param('token') token: string, @Body() dto: UnsubscribePreferencesDto) {
    if (dto.marketingOptIn === false && dto.productUpdatesOptIn === false) {
      return this.preferences.unsubscribeMarketing(token);
    }
    const pref = this.preferences.getByToken(token);
    return pref.then((p) =>
      p
        ? this.preferences.update(p.userId, p.tenantId, {
            marketingOptIn: dto.marketingOptIn,
            productUpdatesOptIn: dto.productUpdatesOptIn,
            trainingAnnouncementsOptIn: dto.trainingAnnouncementsOptIn,
          })
        : null,
    );
  }
}
