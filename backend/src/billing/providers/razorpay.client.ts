import { BadRequestException } from "@nestjs/common";
import { assertRazorpayConfigured } from "../../config/razorpay.env";

export type RazorpayOrderNotes = Record<string, string>;

export type CreateRazorpayOrderInput = {
  amountMinor: number;
  currency: string;
  receipt: string;
  notes?: RazorpayOrderNotes;
};

export type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
};

/** HTTP client for Razorpay Orders API — override `createOrderImpl` in tests. */
export type RazorpayOrderCreator = (input: CreateRazorpayOrderInput) => Promise<RazorpayOrderResponse>;

let createOrderImpl: RazorpayOrderCreator = defaultCreateOrder;

async function defaultCreateOrder(input: CreateRazorpayOrderInput): Promise<RazorpayOrderResponse> {
  const secrets = assertRazorpayConfigured();
  const auth = Buffer.from(`${secrets.keyId}:${secrets.keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountMinor,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes ?? {},
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new BadRequestException(`Razorpay order creation failed: ${detail}`);
  }

  return res.json() as Promise<RazorpayOrderResponse>;
}

export function setRazorpayOrderCreatorForTests(impl: RazorpayOrderCreator | null): void {
  createOrderImpl = impl ?? defaultCreateOrder;
}

export async function createRazorpayOrder(
  input: CreateRazorpayOrderInput,
): Promise<RazorpayOrderResponse> {
  return createOrderImpl(input);
}
