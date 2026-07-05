import { Injectable, Logger } from "@nestjs/common";
import { sendTransactionalMail } from "../common/mail-delivery.util";

export type InviteEmailPayload = {
  to: string;
  fullName: string;
  workspaceName: string;
  inviterName: string;
  inviteUrl: string;
  expiresAt: Date;
};

@Injectable()
export class InvitationMailer {
  private readonly log = new Logger(InvitationMailer.name);

  async sendInvite(payload: InviteEmailPayload): Promise<{ delivered: boolean; devUrl?: string }> {
    const expiresLabel = payload.expiresAt.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const text = [
      `Hello ${payload.fullName},`,
      ``,
      `${payload.inviterName} invited you to join ${payload.workspaceName} on Velon ERP.`,
      ``,
      `Accept invitation: ${payload.inviteUrl}`,
      `Expires: ${expiresLabel}`,
    ].join("\n");

    const html = `
      <p>Hello <strong>${payload.fullName}</strong>,</p>
      <p><strong>${payload.inviterName}</strong> invited you to join <strong>${payload.workspaceName}</strong> on Velon ERP.</p>
      <p><a href="${payload.inviteUrl}">Accept invitation</a></p>
      <p>Expires: ${expiresLabel}</p>
    `;

    try {
      const mail = await sendTransactionalMail({
        to: payload.to,
        subject: `You're invited to ${payload.workspaceName} on Velon ERP`,
        text,
        html,
      });
      if (mail.delivered) return { delivered: true };
    } catch (err) {
      this.log.warn(`SMTP invite failed for ${payload.to}: ${String(err)}`);
    }

    this.log.log(`[dev invite] ${payload.to} → ${payload.inviteUrl}`);
    return { delivered: false, devUrl: payload.inviteUrl };
  }
}
