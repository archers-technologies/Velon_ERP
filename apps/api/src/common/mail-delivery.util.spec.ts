import {
  isNonDeliverableEmail,
  shouldSendViaSmtp,
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
});
