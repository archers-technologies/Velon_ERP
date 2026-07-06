'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.classifyDashboardLoaderError =
  exports.WORKSPACE_SIDEBAR_LABELS =
  exports.mapSubscriptionStatusToTenantStatus =
  exports.subscriptionAllowsBillingPortal =
  exports.subscriptionAllowsWorkspaceAccess =
  exports.isBillingPortalPath =
  exports.normalizeApiPath =
  exports.mrrForPlan =
  exports.yearlyPriceFromMonthly =
  exports.BILLING_PORTAL_PATH_PREFIXES =
  exports.ANNUAL_BILLING_MONTHS =
  exports.TRIAL_DAYS_DEFAULT =
  exports.PAYMENT_PROVIDERS =
  exports.passwordStrengthMessage =
  exports.isPasswordStrong =
  exports.evaluatePasswordRules =
  exports.PASSWORD_RULES =
  exports.PASSWORD_MIN_LENGTH =
  exports.resolvePlanPrice =
  exports.planRegionalPricesFromDefinition =
  exports.isIndiaBilling =
  exports.planCatalogEntry =
  exports.PLAN_CATALOG =
  exports.canAddSeat =
  exports.seatsRemaining =
  exports.isUnlimitedSeats =
  exports.seatLimitForPlan =
  exports.SEAT_LIMITS =
  exports.ROLE_PERMISSIONS =
  exports.normalizeVelonRole =
  exports.VelonRole =
  exports.isKnownCurrencyCode =
  exports.isKnownCountryCode =
  exports.getCurrencySymbol =
  exports.getCountryDefaultCurrency =
  exports.getCountryByCode =
  exports.formatWorkspaceMoney =
  exports.formatCurrencyLabel =
  exports.defaultTimezoneForCountry =
  exports.defaultNumberFormatForCountry =
  exports.defaultDateFormatForCountry =
  exports.TIMEZONE_OPTIONS =
  exports.NUMBER_FORMAT_OPTIONS =
  exports.DATE_FORMAT_OPTIONS =
  exports.CURRENCY_SYMBOLS =
  exports.COUNTRY_CATALOG =
  exports.VELON_CONTACT_PHONE =
  exports.VELON_CONTACT_EMAIL =
  exports.VELON_CONTACT_ADDRESS =
  exports.API_VERSION =
    void 0;
exports.canWriteSales =
  exports.canReadSales =
  exports.canApproveProcurement =
  exports.canManageProcurement =
  exports.canReadProcurement =
  exports.canManageInventory =
  exports.canReadInventory =
  exports.canManageCrmActivities =
  exports.canWriteCrmActivities =
  exports.canWriteCrmNotes =
  exports.canManageCrmCustomers =
  exports.canWriteCrmRecords =
  exports.canReadCrm =
  exports.workspaceAdminSearch =
  exports.settingsBillingSearch =
  exports.parseWorkspaceAdminSection =
  exports.parseSettingsUserTab =
  exports.canManageWorkspaceSettings =
  exports.canManageWorkspaceBilling =
  exports.WORKSPACE_ADMIN_SECTIONS =
  exports.SETTINGS_USER_TABS =
  exports.SETTINGS_PATHS =
  exports.TENANT_STATUS_DESCRIPTIONS =
  exports.TENANT_STATUS_COLUMN_HELP =
  exports.tenantWorkspaceHost =
  exports.resolveWorkspacePublicDomain =
  exports.DEFAULT_WORKSPACE_PUBLIC_DOMAIN =
  exports.productionTenantWhere =
  exports.productionPlatformUserWhere =
  exports.isProductionTenant =
  exports.isProductionPlatformUser =
  exports.isDemoSeedSource =
  exports.inferDemoSeedSourceFromTenantName =
  exports.inferDemoSeedSourceFromEmail =
  exports.canSeedDemoTenants =
  exports.DEMO_SEED_SOURCES =
  exports.isAdminNavItemActive =
  exports.rolePresetById =
  exports.backendRoleToPresetLabel =
  exports.WORKSPACE_ROLE_PRESETS =
  exports.workspaceNavHasDuplicateCrm =
  exports.normalizeWorkspacePath =
  exports.isWorkspaceNavItemActive =
    void 0;
exports.isPlatformRole = isPlatformRole;
exports.isTenantRole = isTenantRole;
exports.roleHasPermission = roleHasPermission;
const velon_role_1 = require('./velon-role');
exports.API_VERSION = 'v1';
var velon_contact_1 = require('./velon-contact');
Object.defineProperty(exports, 'VELON_CONTACT_ADDRESS', {
  enumerable: true,
  get: function () {
    return velon_contact_1.VELON_CONTACT_ADDRESS;
  },
});
Object.defineProperty(exports, 'VELON_CONTACT_EMAIL', {
  enumerable: true,
  get: function () {
    return velon_contact_1.VELON_CONTACT_EMAIL;
  },
});
Object.defineProperty(exports, 'VELON_CONTACT_PHONE', {
  enumerable: true,
  get: function () {
    return velon_contact_1.VELON_CONTACT_PHONE;
  },
});
var localization_1 = require('./localization');
Object.defineProperty(exports, 'COUNTRY_CATALOG', {
  enumerable: true,
  get: function () {
    return localization_1.COUNTRY_CATALOG;
  },
});
Object.defineProperty(exports, 'CURRENCY_SYMBOLS', {
  enumerable: true,
  get: function () {
    return localization_1.CURRENCY_SYMBOLS;
  },
});
Object.defineProperty(exports, 'DATE_FORMAT_OPTIONS', {
  enumerable: true,
  get: function () {
    return localization_1.DATE_FORMAT_OPTIONS;
  },
});
Object.defineProperty(exports, 'NUMBER_FORMAT_OPTIONS', {
  enumerable: true,
  get: function () {
    return localization_1.NUMBER_FORMAT_OPTIONS;
  },
});
Object.defineProperty(exports, 'TIMEZONE_OPTIONS', {
  enumerable: true,
  get: function () {
    return localization_1.TIMEZONE_OPTIONS;
  },
});
Object.defineProperty(exports, 'defaultDateFormatForCountry', {
  enumerable: true,
  get: function () {
    return localization_1.defaultDateFormatForCountry;
  },
});
Object.defineProperty(exports, 'defaultNumberFormatForCountry', {
  enumerable: true,
  get: function () {
    return localization_1.defaultNumberFormatForCountry;
  },
});
Object.defineProperty(exports, 'defaultTimezoneForCountry', {
  enumerable: true,
  get: function () {
    return localization_1.defaultTimezoneForCountry;
  },
});
Object.defineProperty(exports, 'formatCurrencyLabel', {
  enumerable: true,
  get: function () {
    return localization_1.formatCurrencyLabel;
  },
});
Object.defineProperty(exports, 'formatWorkspaceMoney', {
  enumerable: true,
  get: function () {
    return localization_1.formatWorkspaceMoney;
  },
});
Object.defineProperty(exports, 'getCountryByCode', {
  enumerable: true,
  get: function () {
    return localization_1.getCountryByCode;
  },
});
Object.defineProperty(exports, 'getCountryDefaultCurrency', {
  enumerable: true,
  get: function () {
    return localization_1.getCountryDefaultCurrency;
  },
});
Object.defineProperty(exports, 'getCurrencySymbol', {
  enumerable: true,
  get: function () {
    return localization_1.getCurrencySymbol;
  },
});
Object.defineProperty(exports, 'isKnownCountryCode', {
  enumerable: true,
  get: function () {
    return localization_1.isKnownCountryCode;
  },
});
Object.defineProperty(exports, 'isKnownCurrencyCode', {
  enumerable: true,
  get: function () {
    return localization_1.isKnownCurrencyCode;
  },
});
var velon_role_2 = require('./velon-role');
Object.defineProperty(exports, 'VelonRole', {
  enumerable: true,
  get: function () {
    return velon_role_2.VelonRole;
  },
});
Object.defineProperty(exports, 'normalizeVelonRole', {
  enumerable: true,
  get: function () {
    return velon_role_2.normalizeVelonRole;
  },
});
exports.ROLE_PERMISSIONS = {
  [velon_role_1.VelonRole.SUPER_ADMIN]: ['*'],
  [velon_role_1.VelonRole.PLATFORM_SUPPORT]: [
    'tenants:read',
    'tenants:update',
    'users:read',
    'audit:read',
    'notifications:read',
  ],
  [velon_role_1.VelonRole.TENANT_OWNER]: [
    'workspace:*',
    'tenant:read',
    'tenant:update',
    'users:read',
    'users:invite',
    'users:manage',
    'departments:*',
    'seats:read',
    'billing:*',
    'audit:read',
    'crm:*',
    'inventory:*',
    'procurement:*',
    'sales:*',
  ],
  [velon_role_1.VelonRole.TENANT_ADMIN]: [
    'workspace:*',
    'tenant:read',
    'tenant:update',
    'users:read',
    'users:invite',
    'users:manage',
    'departments:*',
    'seats:read',
    'billing:*',
    'audit:read',
    'crm:*',
    'inventory:*',
    'procurement:*',
    'sales:*',
  ],
  [velon_role_1.VelonRole.DEPARTMENT_ADMIN]: [
    'workspace:read',
    'workspace:write:department',
    'users:read:department',
    'crm:read',
    'crm:write',
    'inventory:read',
    'inventory:write',
    'procurement:read',
    'procurement:write',
    'sales:*',
  ],
  [velon_role_1.VelonRole.USER]: [
    'workspace:read',
    'workspace:write:limited',
    'crm:read',
    'inventory:read',
    'procurement:read',
    'sales:read',
  ],
  [velon_role_1.VelonRole.TENANT_USER]: [
    'workspace:read',
    'workspace:write:limited',
    'crm:read',
    'inventory:read',
    'procurement:read',
    'sales:read',
  ],
};
function isPlatformRole(role) {
  const r = (0, velon_role_1.normalizeVelonRole)(role);
  return r === velon_role_1.VelonRole.SUPER_ADMIN || r === velon_role_1.VelonRole.PLATFORM_SUPPORT;
}
function isTenantRole(role) {
  const r = (0, velon_role_1.normalizeVelonRole)(role);
  return (
    r === velon_role_1.VelonRole.TENANT_OWNER ||
    r === velon_role_1.VelonRole.TENANT_ADMIN ||
    r === velon_role_1.VelonRole.DEPARTMENT_ADMIN ||
    r === velon_role_1.VelonRole.USER ||
    r === velon_role_1.VelonRole.TENANT_USER
  );
}
function roleHasPermission(role, permission) {
  const normalized = (0, velon_role_1.normalizeVelonRole)(role);
  const perms = exports.ROLE_PERMISSIONS[normalized] ?? [];
  if (perms.includes('*')) return true;
  return perms.some(
    (p) => p === permission || (p.endsWith(':*') && permission.startsWith(p.slice(0, -1))),
  );
}
var seats_1 = require('./seats');
Object.defineProperty(exports, 'SEAT_LIMITS', {
  enumerable: true,
  get: function () {
    return seats_1.SEAT_LIMITS;
  },
});
Object.defineProperty(exports, 'seatLimitForPlan', {
  enumerable: true,
  get: function () {
    return seats_1.seatLimitForPlan;
  },
});
Object.defineProperty(exports, 'isUnlimitedSeats', {
  enumerable: true,
  get: function () {
    return seats_1.isUnlimitedSeats;
  },
});
Object.defineProperty(exports, 'seatsRemaining', {
  enumerable: true,
  get: function () {
    return seats_1.seatsRemaining;
  },
});
Object.defineProperty(exports, 'canAddSeat', {
  enumerable: true,
  get: function () {
    return seats_1.canAddSeat;
  },
});
var plans_1 = require('./plans');
Object.defineProperty(exports, 'PLAN_CATALOG', {
  enumerable: true,
  get: function () {
    return plans_1.PLAN_CATALOG;
  },
});
Object.defineProperty(exports, 'planCatalogEntry', {
  enumerable: true,
  get: function () {
    return plans_1.planCatalogEntry;
  },
});
var plan_pricing_1 = require('./plan-pricing');
Object.defineProperty(exports, 'isIndiaBilling', {
  enumerable: true,
  get: function () {
    return plan_pricing_1.isIndiaBilling;
  },
});
Object.defineProperty(exports, 'planRegionalPricesFromDefinition', {
  enumerable: true,
  get: function () {
    return plan_pricing_1.planRegionalPricesFromDefinition;
  },
});
Object.defineProperty(exports, 'resolvePlanPrice', {
  enumerable: true,
  get: function () {
    return plan_pricing_1.resolvePlanPrice;
  },
});
var password_policy_1 = require('./password-policy');
Object.defineProperty(exports, 'PASSWORD_MIN_LENGTH', {
  enumerable: true,
  get: function () {
    return password_policy_1.PASSWORD_MIN_LENGTH;
  },
});
Object.defineProperty(exports, 'PASSWORD_RULES', {
  enumerable: true,
  get: function () {
    return password_policy_1.PASSWORD_RULES;
  },
});
Object.defineProperty(exports, 'evaluatePasswordRules', {
  enumerable: true,
  get: function () {
    return password_policy_1.evaluatePasswordRules;
  },
});
Object.defineProperty(exports, 'isPasswordStrong', {
  enumerable: true,
  get: function () {
    return password_policy_1.isPasswordStrong;
  },
});
Object.defineProperty(exports, 'passwordStrengthMessage', {
  enumerable: true,
  get: function () {
    return password_policy_1.passwordStrengthMessage;
  },
});
var billing_1 = require('./billing');
Object.defineProperty(exports, 'PAYMENT_PROVIDERS', {
  enumerable: true,
  get: function () {
    return billing_1.PAYMENT_PROVIDERS;
  },
});
Object.defineProperty(exports, 'TRIAL_DAYS_DEFAULT', {
  enumerable: true,
  get: function () {
    return billing_1.TRIAL_DAYS_DEFAULT;
  },
});
Object.defineProperty(exports, 'ANNUAL_BILLING_MONTHS', {
  enumerable: true,
  get: function () {
    return billing_1.ANNUAL_BILLING_MONTHS;
  },
});
Object.defineProperty(exports, 'BILLING_PORTAL_PATH_PREFIXES', {
  enumerable: true,
  get: function () {
    return billing_1.BILLING_PORTAL_PATH_PREFIXES;
  },
});
Object.defineProperty(exports, 'yearlyPriceFromMonthly', {
  enumerable: true,
  get: function () {
    return billing_1.yearlyPriceFromMonthly;
  },
});
Object.defineProperty(exports, 'mrrForPlan', {
  enumerable: true,
  get: function () {
    return billing_1.mrrForPlan;
  },
});
Object.defineProperty(exports, 'normalizeApiPath', {
  enumerable: true,
  get: function () {
    return billing_1.normalizeApiPath;
  },
});
Object.defineProperty(exports, 'isBillingPortalPath', {
  enumerable: true,
  get: function () {
    return billing_1.isBillingPortalPath;
  },
});
Object.defineProperty(exports, 'subscriptionAllowsWorkspaceAccess', {
  enumerable: true,
  get: function () {
    return billing_1.subscriptionAllowsWorkspaceAccess;
  },
});
Object.defineProperty(exports, 'subscriptionAllowsBillingPortal', {
  enumerable: true,
  get: function () {
    return billing_1.subscriptionAllowsBillingPortal;
  },
});
Object.defineProperty(exports, 'mapSubscriptionStatusToTenantStatus', {
  enumerable: true,
  get: function () {
    return billing_1.mapSubscriptionStatusToTenantStatus;
  },
});
var workspace_navigation_1 = require('./workspace-navigation');
Object.defineProperty(exports, 'WORKSPACE_SIDEBAR_LABELS', {
  enumerable: true,
  get: function () {
    return workspace_navigation_1.WORKSPACE_SIDEBAR_LABELS;
  },
});
Object.defineProperty(exports, 'classifyDashboardLoaderError', {
  enumerable: true,
  get: function () {
    return workspace_navigation_1.classifyDashboardLoaderError;
  },
});
Object.defineProperty(exports, 'isWorkspaceNavItemActive', {
  enumerable: true,
  get: function () {
    return workspace_navigation_1.isWorkspaceNavItemActive;
  },
});
Object.defineProperty(exports, 'normalizeWorkspacePath', {
  enumerable: true,
  get: function () {
    return workspace_navigation_1.normalizeWorkspacePath;
  },
});
Object.defineProperty(exports, 'workspaceNavHasDuplicateCrm', {
  enumerable: true,
  get: function () {
    return workspace_navigation_1.workspaceNavHasDuplicateCrm;
  },
});
var role_presets_1 = require('./role-presets');
Object.defineProperty(exports, 'WORKSPACE_ROLE_PRESETS', {
  enumerable: true,
  get: function () {
    return role_presets_1.WORKSPACE_ROLE_PRESETS;
  },
});
Object.defineProperty(exports, 'backendRoleToPresetLabel', {
  enumerable: true,
  get: function () {
    return role_presets_1.backendRoleToPresetLabel;
  },
});
Object.defineProperty(exports, 'rolePresetById', {
  enumerable: true,
  get: function () {
    return role_presets_1.rolePresetById;
  },
});
var admin_navigation_1 = require('./admin-navigation');
Object.defineProperty(exports, 'isAdminNavItemActive', {
  enumerable: true,
  get: function () {
    return admin_navigation_1.isAdminNavItemActive;
  },
});
var seed_guards_1 = require('./seed-guards');
Object.defineProperty(exports, 'DEMO_SEED_SOURCES', {
  enumerable: true,
  get: function () {
    return seed_guards_1.DEMO_SEED_SOURCES;
  },
});
Object.defineProperty(exports, 'canSeedDemoTenants', {
  enumerable: true,
  get: function () {
    return seed_guards_1.canSeedDemoTenants;
  },
});
Object.defineProperty(exports, 'inferDemoSeedSourceFromEmail', {
  enumerable: true,
  get: function () {
    return seed_guards_1.inferDemoSeedSourceFromEmail;
  },
});
Object.defineProperty(exports, 'inferDemoSeedSourceFromTenantName', {
  enumerable: true,
  get: function () {
    return seed_guards_1.inferDemoSeedSourceFromTenantName;
  },
});
Object.defineProperty(exports, 'isDemoSeedSource', {
  enumerable: true,
  get: function () {
    return seed_guards_1.isDemoSeedSource;
  },
});
var production_data_1 = require('./production-data');
Object.defineProperty(exports, 'isProductionPlatformUser', {
  enumerable: true,
  get: function () {
    return production_data_1.isProductionPlatformUser;
  },
});
Object.defineProperty(exports, 'isProductionTenant', {
  enumerable: true,
  get: function () {
    return production_data_1.isProductionTenant;
  },
});
Object.defineProperty(exports, 'productionPlatformUserWhere', {
  enumerable: true,
  get: function () {
    return production_data_1.productionPlatformUserWhere;
  },
});
Object.defineProperty(exports, 'productionTenantWhere', {
  enumerable: true,
  get: function () {
    return production_data_1.productionTenantWhere;
  },
});
var workspace_host_1 = require('./workspace-host');
Object.defineProperty(exports, 'DEFAULT_WORKSPACE_PUBLIC_DOMAIN', {
  enumerable: true,
  get: function () {
    return workspace_host_1.DEFAULT_WORKSPACE_PUBLIC_DOMAIN;
  },
});
Object.defineProperty(exports, 'resolveWorkspacePublicDomain', {
  enumerable: true,
  get: function () {
    return workspace_host_1.resolveWorkspacePublicDomain;
  },
});
Object.defineProperty(exports, 'tenantWorkspaceHost', {
  enumerable: true,
  get: function () {
    return workspace_host_1.tenantWorkspaceHost;
  },
});
var tenant_status_help_1 = require('./tenant-status-help');
Object.defineProperty(exports, 'TENANT_STATUS_COLUMN_HELP', {
  enumerable: true,
  get: function () {
    return tenant_status_help_1.TENANT_STATUS_COLUMN_HELP;
  },
});
Object.defineProperty(exports, 'TENANT_STATUS_DESCRIPTIONS', {
  enumerable: true,
  get: function () {
    return tenant_status_help_1.TENANT_STATUS_DESCRIPTIONS;
  },
});
var settings_routes_1 = require('./settings-routes');
Object.defineProperty(exports, 'SETTINGS_PATHS', {
  enumerable: true,
  get: function () {
    return settings_routes_1.SETTINGS_PATHS;
  },
});
Object.defineProperty(exports, 'SETTINGS_USER_TABS', {
  enumerable: true,
  get: function () {
    return settings_routes_1.SETTINGS_USER_TABS;
  },
});
Object.defineProperty(exports, 'WORKSPACE_ADMIN_SECTIONS', {
  enumerable: true,
  get: function () {
    return settings_routes_1.WORKSPACE_ADMIN_SECTIONS;
  },
});
Object.defineProperty(exports, 'canManageWorkspaceBilling', {
  enumerable: true,
  get: function () {
    return settings_routes_1.canManageWorkspaceBilling;
  },
});
Object.defineProperty(exports, 'canManageWorkspaceSettings', {
  enumerable: true,
  get: function () {
    return settings_routes_1.canManageWorkspaceSettings;
  },
});
Object.defineProperty(exports, 'parseSettingsUserTab', {
  enumerable: true,
  get: function () {
    return settings_routes_1.parseSettingsUserTab;
  },
});
Object.defineProperty(exports, 'parseWorkspaceAdminSection', {
  enumerable: true,
  get: function () {
    return settings_routes_1.parseWorkspaceAdminSection;
  },
});
Object.defineProperty(exports, 'settingsBillingSearch', {
  enumerable: true,
  get: function () {
    return settings_routes_1.settingsBillingSearch;
  },
});
Object.defineProperty(exports, 'workspaceAdminSearch', {
  enumerable: true,
  get: function () {
    return settings_routes_1.workspaceAdminSearch;
  },
});
var crm_permissions_1 = require('./crm-permissions');
Object.defineProperty(exports, 'canReadCrm', {
  enumerable: true,
  get: function () {
    return crm_permissions_1.canReadCrm;
  },
});
Object.defineProperty(exports, 'canWriteCrmRecords', {
  enumerable: true,
  get: function () {
    return crm_permissions_1.canWriteCrmRecords;
  },
});
Object.defineProperty(exports, 'canManageCrmCustomers', {
  enumerable: true,
  get: function () {
    return crm_permissions_1.canManageCrmCustomers;
  },
});
Object.defineProperty(exports, 'canWriteCrmNotes', {
  enumerable: true,
  get: function () {
    return crm_permissions_1.canWriteCrmNotes;
  },
});
Object.defineProperty(exports, 'canWriteCrmActivities', {
  enumerable: true,
  get: function () {
    return crm_permissions_1.canWriteCrmActivities;
  },
});
Object.defineProperty(exports, 'canManageCrmActivities', {
  enumerable: true,
  get: function () {
    return crm_permissions_1.canManageCrmActivities;
  },
});
var inventory_permissions_1 = require('./inventory-permissions');
Object.defineProperty(exports, 'canReadInventory', {
  enumerable: true,
  get: function () {
    return inventory_permissions_1.canReadInventory;
  },
});
Object.defineProperty(exports, 'canManageInventory', {
  enumerable: true,
  get: function () {
    return inventory_permissions_1.canManageInventory;
  },
});
var procurement_permissions_1 = require('./procurement-permissions');
Object.defineProperty(exports, 'canReadProcurement', {
  enumerable: true,
  get: function () {
    return procurement_permissions_1.canReadProcurement;
  },
});
Object.defineProperty(exports, 'canManageProcurement', {
  enumerable: true,
  get: function () {
    return procurement_permissions_1.canManageProcurement;
  },
});
Object.defineProperty(exports, 'canApproveProcurement', {
  enumerable: true,
  get: function () {
    return procurement_permissions_1.canApproveProcurement;
  },
});
var sales_permissions_1 = require('./sales-permissions');
Object.defineProperty(exports, 'canReadSales', {
  enumerable: true,
  get: function () {
    return sales_permissions_1.canReadSales;
  },
});
Object.defineProperty(exports, 'canWriteSales', {
  enumerable: true,
  get: function () {
    return sales_permissions_1.canWriteSales;
  },
});
//# sourceMappingURL=index.js.map
