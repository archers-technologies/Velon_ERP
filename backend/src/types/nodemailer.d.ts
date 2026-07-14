declare module 'nodemailer' {
  export interface TransportAuth {
    user: string;
    pass: string;
  }

  export interface TransportOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: TransportAuth;
  }

  export interface MailOptions {
    from?: string;
    to?: string;
    replyTo?: string;
    subject?: string;
    text?: string;
    html?: string;
    attachments?: Array<{
      filename?: string;
      content?: Buffer | string;
      contentType?: string;
    }>;
  }

  export interface Transporter {
    sendMail(mailOptions: MailOptions): Promise<unknown>;
  }

  export function createTransport(options: TransportOptions): Transporter;
}
