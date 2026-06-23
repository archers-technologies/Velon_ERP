import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { isRazorpayEnabledFlag } from "../config/razorpay.env";
import { RazorpayBillingService } from "./razorpay-billing.service";

@ApiTags("billing")
@Controller("billing/webhooks")
export class RazorpayWebhookController {
  constructor(private readonly razorpay: RazorpayBillingService) {}

  @Post("razorpay")
  async razorpayWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-razorpay-signature") signature: string | undefined,
    @Headers("x-razorpay-event-id") eventId: string | undefined,
  ) {
    if (!isRazorpayEnabledFlag()) {
      throw new BadRequestException("Razorpay webhooks are disabled");
    }

    const rawBody = req.rawBody;
    if (!rawBody || rawBody.length === 0) {
      throw new BadRequestException("Missing webhook body");
    }

    try {
      return await this.razorpay.handleWebhook(rawBody, signature, eventId);
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw err;
    }
  }
}
