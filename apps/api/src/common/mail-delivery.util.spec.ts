import {
  classifySmtpSendError,
  getSmtpPassword,
  isNonDeliverableEmail,
  parseSmtpSecure,
  resolveSmtpPortAndSecure,
  shouldSendViaSmtp,
  smtpConfigured,
} from "./mail-delivery.util";

describe("mail-delivery.util", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = {
      ...env,
      SMTP_HOST: "smtp.example.com",
      SMTP_FROM: "test@example.com",
      SMTP_USER: "test@example.com",
      SMTP_PASS: "secret",
      SMTP_PORT: "587",
      SMTP_SECURE: "false",
    };
  });

  afterAll(() => {
    process.env = env;
  });

  it("blocks *.test recipients", () => {
    expect(isNonDeliverableEmail("user@reactivation.test")).toBe(true);
    expect(isNonDeliverableEmail("user@gmail.com")).toBe(false);
  });

  it("never sends SMTP during test runs", () => {
    process.env.NODE_ENV = "test";
    expect(shouldSendViaSmtp("user@gmail.com")).toBe(false);
  });

  it("blocks test domains even outside test env", () => {
    process.env.NODE_ENV = "development";
    expect(shouldSendViaSmtp("self-delete@reactivation.test")).toBe(false);
    expect(shouldSendViaSmtp("user@gmail.com")).toBe(true);
  });

  it('parses SMTP_SECURE="false" as boolean false', () => {
    process.env.SMTP_SECURE = "false";
    expect(parseSmtpSecure()).toBe(false);
  });

  it('parses SMTP_SECURE="true" as boolean true', () => {
    process.env.SMTP_SECURE = "true";
    expect(parseSmtpSecure()).toBe(true);
  });

  it("does not force secure=true when port is 465 and SMTP_SECURE=false", () => {
    process.env.SMTP_PORT = "465";
    process.env.SMTP_SECURE = "false";
    expect(resolveSmtpPortAndSecure()).toEqual({ port: 465, secure: true });
  });

  it("forces secure=false when port is 587", () => {
    process.env.SMTP_PORT = "587";
    process.env.SMTP_SECURE = "true";
    expect(resolveSmtpPortAndSecure()).toEqual({ port: 587, secure: false });
  });

  it("accepts SMTP_PASSWORD as fallback for SMTP_PASS", () => {
    delete process.env.SMTP_PASS;
    process.env.SMTP_PASSWORD = "fallback-secret";
    expect(getSmtpPassword()).toBe("fallback-secret");
    expect(smtpConfigured()).toBe(true);
  });

  it("classifies auth failures", () => {
    const detail = classifySmtpSendError({ code: "EAUTH", message: "Invalid login" });
    expect(detail.category).toBe("auth_failed");
  });

  it("classifies TLS mismatches", () => {
    const detail = classifySmtpSendError({
      message: "wrong version number",
    });
    expect(detail.category).toBe("tls_mismatch");
  });
});
