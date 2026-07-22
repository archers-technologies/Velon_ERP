export type EmailQueueJobData = {
  logId: string;
  templateKey: string;
  toEmail: string;
  subject: string;
  text: string;
  html: string;
  from?: string;
  eventType?: string;
  entityId?: string;
  attempt?: number;
};
