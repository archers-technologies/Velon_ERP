import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { VelonRole } from "@velon/shared";
import { PermissionGuard } from "./permission.guard";
import { PERMISSIONS_KEY } from "../decorators/require-permission.decorator";

function mockContext(user?: { role: string }) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: user ? { id: "u1", role: user.role, scope: "tenant" } : undefined }),
    }),
  } as never;
}

describe("PermissionGuard", () => {
  const reflector = new Reflector();
  const guard = new PermissionGuard(reflector);

  it("allows when no permissions required", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);
    expect(guard.canActivate(mockContext({ role: VelonRole.USER }))).toBe(true);
  });

  it("allows tenant owner for inventory:write via wildcard", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["inventory:write"]);
    expect(guard.canActivate(mockContext({ role: VelonRole.TENANT_OWNER }))).toBe(true);
  });

  it("denies user for inventory:write", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["inventory:write"]);
    expect(() => guard.canActivate(mockContext({ role: VelonRole.USER }))).toThrow(ForbiddenException);
  });

  it("allows department admin for procurement:write", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["procurement:write"]);
    expect(guard.canActivate(mockContext({ role: VelonRole.DEPARTMENT_ADMIN }))).toBe(true);
  });

  it("uses PERMISSIONS_KEY metadata", () => {
    expect(PERMISSIONS_KEY).toBe("permissions");
  });
});
