#!/usr/bin/env node
/**
 * Local Hostinger SMTP verification (reads secrets from env / .env only).
 *
 * Usage:
 *   node --env-file=.env scripts/verify-smtp.mjs [recipient@example.com]
 *
 * Do not commit secrets. Do not hardcode passwords.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadDotEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

const host = process.env.SMTP_HOST?.trim();
const port = Number.parseInt(process.env.SMTP_PORT ?? '587', 10);
const secure =
  String(process.env.SMTP_SECURE ?? 'false')
    .trim()
    .toLowerCase() === 'true';
const user = process.env.SMTP_USER?.trim();
const pass = process.env.SMTP_PASS?.trim() || process.env.SMTP_PASSWORD?.trim();
const from = process.env.SMTP_FROM?.trim();
const to = process.argv[2]?.trim() || user;

if (!host || !user || !pass || !from || !to) {
  console.error('Missing SMTP_HOST, SMTP_USER, SMTP_PASS/SMTP_PASSWORD, SMTP_FROM, or recipient.');
  process.exit(1);
}

console.log('SMTP verify config:');
console.log(`- host: ${host}`);
console.log(`- port: ${port}`);
console.log(`- secure: ${secure}`);
console.log(`- user: ${user}`);
console.log(`- password present: yes`);
console.log(`- from: ${from}`);
console.log(`- to: ${to}`);

const nodemailer = await import('nodemailer');

try {
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure && port === 587,
    auth: { user, pass },
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 15_000,
  });

  await transporter.verify();
  console.log('SMTP verify: connection OK');

  const info = await transporter.sendMail({
    from,
    to,
    subject: 'Velon ERP SMTP verification',
    text: 'If you received this, Hostinger SMTP is working from this environment.',
  });

  console.log(`SMTP verify: message sent (messageId=${info.messageId ?? 'unknown'})`);
} catch (err) {
  const e = err;
  console.error('SMTP verify: FAILED');
  console.error(`- code: ${e?.code ?? 'n/a'}`);
  console.error(`- command: ${e?.command ?? 'n/a'}`);
  console.error(`- responseCode: ${e?.responseCode ?? 'n/a'}`);
  console.error(`- message: ${String(e?.message ?? err)}`);
  process.exit(1);
}
