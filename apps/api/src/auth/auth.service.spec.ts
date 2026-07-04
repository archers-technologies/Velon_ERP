import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@velon/database";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { IDS } from "../test-utils/fixtures";
import {
  createMockAudit,
  createMockLogger,
  createMockPrisma,
  createMockPrismaClient,
  createMockRedis,
} from "../test-utils/mocks";

jest.mock("bcrypt", () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue("hashed"),
}));

describe("AuthService", () => {
  const client = createMockPrismaClient();
  const prisma = createMockPrisma(client);
  const jwt = { signAsync: jest.fn().mockResolvedValue("access.jwt.token") } as unknown as JwtService;
  const audit = createMockAudit();
  const redis = createMockRedis();
  const log = createMockLogger();
  const subscriptions = { ensureForTenant: jest.fn() };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      prisma,
      jwt,
      audit as never,
      redis as never,
      log,
      subscriptions as never,
    );
  });

  describe("login", () => {
    it("rejects unknown or inactive users without revealing which", async () => {
      client.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: "missing@example.test", password: "Password1!" }),
      ).rejects.toThrow(UnauthorizedException);
      expect(log.authFailure).toHaveBeenCalled();
    });

    it("rejects wrong password", async () => {
      client.user.findUnique.mockResolvedValue({
        id: IDS.user,
        email: "user@example.test",
        passwordHash: "hash",
        isActive: true,
        role: UserRole.USER,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: "user@example.test", password: "WrongPass1!" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("issues tenant session for active membership", async () => {
      client.user.findUnique.mockResolvedValue({
        id: IDS.user,
        email: "user@example.test",
        passwordHash: "hash",
        isActive: true,
        role: UserRole.USER,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      client.user.update.mockResolvedValue({});
      client.tenantMembership.findFirst.mockResolvedValue({
        id: IDS.membership,
        tenantId: IDS.tenant,
        role: "TENANT_OWNER",
        tenant: {
          status: "ACTIVE",
          deletedAt: null,
          workspace: { id: IDS.workspace, isActive: true },
        },
      });
      client.refreshToken.create.mockResolvedValue({ id: "rt-1" });

      const session = await service.login({
        email: "user@example.test",
        password: "Password1!",
      });

      expect(session.route).toBe("app");
      expect(session.accessToken).toBe("access.jwt.token");
      expect(session.tenantId).toBe(IDS.tenant);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "auth.login", actorId: IDS.user }),
      );
    });

    it("issues platform session for super admin", async () => {
      client.user.findUnique.mockResolvedValue({
        id: "admin-1",
        email: "admin@velon.test",
        passwordHash: "hash",
        isActive: true,
        role: UserRole.SUPER_ADMIN,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      client.user.update.mockResolvedValue({});
      client.refreshToken.create.mockResolvedValue({ id: "rt-1" });

      const session = await service.login({
        email: "admin@velon.test",
        password: "Password1!",
      });

      expect(session.route).toBe("admin");
      expect(session.scope).toBe("platform");
      expect(session.tenantId).toBeUndefined();
    });
  });

  describe("logout", () => {
    it("revokes all refresh tokens when none provided", async () => {
      client.refreshToken.updateMany.mockResolvedValue({ count: 2 });
      await expect(service.logout(IDS.user)).resolves.toEqual({ ok: true });
      expect(client.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: IDS.user, revokedAt: null },
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "auth.logout", actorId: IDS.user }),
      );
    });
  });

  describe("refresh", () => {
    it("rejects invalid refresh tokens", async () => {
      client.refreshToken.findFirst.mockResolvedValue(null);
      await expect(service.refresh({ refreshToken: "bad" })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
