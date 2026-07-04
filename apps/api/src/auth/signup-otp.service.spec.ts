import { BadRequestException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { SignupOtpService } from "./signup-otp.service";
import { getAuthOtpSecret } from "../config/env";
import * as mail from "../common/mail-delivery.util";

jest.mock("../common/mail-delivery.util", () => ({
  sendTransactionalMail: jest.fn(),
  formatMailProviderForLog: jest.fn().mockReturnValue("mail=mock"),
}));

describe("SignupOtpService", () => {
  const redisStore = new Map<string, string>();
  const redis = {
    client: {
      get: jest.fn(async (key: string) => redisStore.get(key) ?? null),
      set: jest.fn(async (key: string, value: string) => {
        redisStore.set(key, value);
        return "OK";
      }),
      del: jest.fn(async (key: string) => {
        redisStore.delete(key);
        return 1;
      }),
    },
  };
  const service = new SignupOtpService(redis as never);

  beforeEach(() => {
    jest.clearAllMocks();
    redisStore.clear();
    (mail.sendTransactionalMail as jest.Mock).mockResolvedValue({ delivered: true });
  });

  it("stores a signup OTP in redis mock and reports delivery", async () => {
    const result = await service.sendSignupOtp({
      email: "Owner@Example.TEST",
      companyName: "Acme",
    });
    expect(result.delivered).toBe(true);
    expect(redisStore.has("velon:signup:otp:owner@example.test")).toBe(true);
  });

  it("rejects missing or invalid OTP codes", async () => {
    await expect(
      service.verifySignupOtp({ email: "owner@example.test", code: "123456" }),
    ).rejects.toThrow(BadRequestException);

    const email = "owner@example.test";
    const otpHash = createHash("sha256")
      .update(`${email}:111111:${getAuthOtpSecret()}`)
      .digest("hex");
    redisStore.set(
      `velon:signup:otp:${email}`,
      JSON.stringify({
        email,
        companyName: "Acme",
        otpHash,
        attempts: 0,
        createdAt: new Date().toISOString(),
      }),
    );

    await expect(service.verifySignupOtp({ email, code: "000000" })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("returns a verification token for a valid OTP", async () => {
    const email = "owner@example.test";
    const code = "222222";
    const otpHash = createHash("sha256")
      .update(`${email}:${code}:${getAuthOtpSecret()}`)
      .digest("hex");
    redisStore.set(
      `velon:signup:otp:${email}`,
      JSON.stringify({
        email,
        companyName: "Acme",
        otpHash,
        attempts: 0,
        createdAt: new Date().toISOString(),
      }),
    );

    const result = await service.verifySignupOtp({ email, code });
    expect(result.verificationToken).toBeTruthy();
    expect(redisStore.has(`velon:signup:otp:${email}`)).toBe(false);
  });
});
