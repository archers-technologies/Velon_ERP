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
    subject?: string;
    text?: string;
    html?: string;
  }

  export interface Transporter {
    sendMail(mailOptions: MailOptions): Promise<unknown>;
  }

  export function createTransport(options: TransportOptions): Transporter;
}
