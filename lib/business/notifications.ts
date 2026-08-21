import net from "node:net";
import tls from "node:tls";
import type { NotificationStatus, NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatKes } from "@/lib/utils";

type NotificationContext = {
  recipientEmail?: string | null;
  recipientName?: string | null;
  documentTitle?: string | null;
  documentNumber?: string | null;
  amountKes?: number | null;
  statusLabel?: string | null;
  actionUrl?: string | null;
};

type SmtpConfig = {
  host: string;
  port: number;
  username: string | null;
  password: string | null;
  secure: boolean;
  fromName: string;
  fromEmail: string;
  timeoutMs: number;
  maxRetries: number;
};

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function smtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST ?? process.env.EMAIL_HOST;
  const fromEmail = process.env.SMTP_FROM_EMAIL ?? process.env.EMAIL_FROM ?? process.env.CETER_COMPANY_EMAIL;
  if (!host || !fromEmail) return null;
  return {
    host,
    port: Number.parseInt(process.env.SMTP_PORT ?? "587", 10),
    username: process.env.SMTP_USER ?? process.env.EMAIL_USERNAME ?? null,
    password: process.env.SMTP_PASSWORD ?? process.env.EMAIL_PASSWORD ?? null,
    secure: String(process.env.SMTP_SECURE ?? "").toLowerCase() === "true",
    fromName: process.env.SMTP_FROM_NAME ?? process.env.CETER_COMPANY_NAME ?? "Ceter Technologies",
    fromEmail,
    timeoutMs: Number.parseInt(process.env.SMTP_TIMEOUT_MS ?? "15000", 10),
    maxRetries: Math.max(1, Number.parseInt(process.env.SMTP_MAX_RETRIES ?? "3", 10))
  };
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char] ?? char);
}

function notificationCopy(type: NotificationType, context: NotificationContext) {
  const number = context.documentNumber ? ` ${context.documentNumber}` : "";
  const amount = context.amountKes ? ` for ${formatKes(context.amountKes)}` : "";
  switch (type) {
    case "invoice_created":
      return { subject: `Ceter invoice${number}`, title: `Invoice${number} is ready`, body: `Your Ceter invoice${amount} has been issued and is available in your account.` };
    case "payment_received":
      return { subject: `Ceter payment received${number}`, title: "Payment received", body: `We have received your payment${amount}. Thank you for settling with Ceter Technologies.` };
    case "quote_created":
      return { subject: `Ceter quotation${number}`, title: `Quotation${number} is ready`, body: `Your Ceter quotation${amount} has been prepared and is available in your account.` };
    case "quote_approved":
      return { subject: `Ceter quotation approved${number}`, title: `Quotation${number} approved`, body: "Your quotation has been approved. We will continue with the next business step." };
    case "receipt_generated":
      return { subject: `Ceter receipt${number}`, title: `Receipt${number} is ready`, body: `Your receipt${amount} has been generated and is available in your account.` };
  }
}

function brandedTemplate(type: NotificationType, context: NotificationContext) {
  const copy = notificationCopy(type, context);
  const accountUrl = context.actionUrl ?? `${siteUrl()}/account`;
  const logoUrl = `${siteUrl()}/ceter-logo-pack/lockup/ceter-logo-horizontal-300.png`;
  const name = context.recipientName ? escapeHtml(context.recipientName) : "Customer";
  const status = context.statusLabel ? `<p style="margin:0 0 16px;color:#475569;font-size:14px;">Status: <strong>${escapeHtml(context.statusLabel)}</strong></p>` : "";
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:24px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dbe3ea;border-radius:8px;overflow:hidden;">
            <tr><td style="background:#082635;padding:22px 28px;"><img src="${logoUrl}" width="150" alt="Ceter Technologies" style="display:block;border:0;max-width:150px;height:auto;"></td></tr>
            <tr>
              <td style="padding:30px 28px;">
                <p style="margin:0 0 12px;color:#d9902f;font-weight:700;font-size:12px;text-transform:uppercase;">Ceter Technologies</p>
                <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;color:#082635;">${escapeHtml(copy.title)}</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hello ${name},</p>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">${escapeHtml(copy.body)}</p>
                ${status}
                <p style="margin:28px 0;"><a href="${accountUrl}" style="background:#082635;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:700;display:inline-block;">Open account dashboard</a></p>
                <p style="margin:24px 0 0;color:#64748b;font-size:12px;line-height:1.5;">For security, documents are available only after signing in to your Ceter account.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  const text = `Ceter Technologies\n\n${copy.title}\n\nHello ${context.recipientName ?? "Customer"},\n\n${copy.body}\n\nOpen your account dashboard: ${accountUrl}\n\nFor security, documents are available only after signing in.`;
  return { subject: copy.subject, html, text };
}

function encodeHeader(value: string) {
  return /[^\x20-\x7e]/.test(value) ? `=?UTF-8?B?${Buffer.from(value).toString("base64")}?=` : value;
}

function formatMailbox(name: string, email: string) {
  return `"${name.replace(/["\\]/g, "")}" <${email}>`;
}

function smtpDate() {
  return new Date().toUTCString();
}

function smtpMessage(config: SmtpConfig, to: string, subject: string, html: string, text: string) {
  const boundary = `ceter-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return [
    `From: ${formatMailbox(config.fromName, config.fromEmail)}`,
    `To: <${to}>`,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${smtpDate()}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(text, "utf8").toString("base64"),
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(html, "utf8").toString("base64"),
    `--${boundary}--`,
    ""
  ].join("\r\n");
}

async function smtpSend(config: SmtpConfig, to: string, message: string) {
  const socket = config.secure
    ? tls.connect({ host: config.host, port: config.port, servername: config.host, timeout: config.timeoutMs })
    : net.connect({ host: config.host, port: config.port, timeout: config.timeoutMs });
  let current: net.Socket | tls.TLSSocket = socket;
  let buffer = "";
  const waitForLine = () => new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("SMTP response timed out.")), config.timeoutMs);
    const flush = () => {
      const index = buffer.indexOf("\n");
      if (index < 0) return;
      const line = buffer.slice(0, index + 1).trim();
      buffer = buffer.slice(index + 1);
      if (/^\d{3}-/.test(line)) return flush();
      clearTimeout(timer);
      cleanup();
      resolve(line);
    };
    const cleanup = () => {
      current.off("data", onData);
      current.off("error", onError);
    };
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      flush();
    };
    const onError = (error: Error) => {
      clearTimeout(timer);
      cleanup();
      reject(error);
    };
    current.on("data", onData);
    current.on("error", onError);
    flush();
  });
  const command = async (value: string, expected = /^[23]/) => {
    current.write(`${value}\r\n`);
    const line = await waitForLine();
    if (!expected.test(line)) throw new Error(`SMTP command failed after ${value.split(" ")[0]}: ${line}`);
    return line;
  };

  try {
    await waitForLine();
    await command(`EHLO ${config.host}`);
    if (!config.secure && process.env.SMTP_STARTTLS !== "false") {
      await command("STARTTLS");
      current = tls.connect({ socket: current, servername: config.host, timeout: config.timeoutMs });
      buffer = "";
      await command(`EHLO ${config.host}`);
    }
    if (config.username && config.password) {
      await command("AUTH LOGIN", /^3/);
      await command(Buffer.from(config.username).toString("base64"), /^3/);
      await command(Buffer.from(config.password).toString("base64"));
    }
    await command(`MAIL FROM:<${config.fromEmail}>`);
    await command(`RCPT TO:<${to}>`);
    await command("DATA", /^3/);
    current.write(`${message.replace(/\r?\n\./g, "\r\n..")}\r\n.\r\n`);
    const dataResponse = await waitForLine();
    if (!/^[23]/.test(dataResponse)) throw new Error(`SMTP DATA failed: ${dataResponse}`);
    await command("QUIT").catch(() => "QUIT failed");
    return { response: dataResponse };
  } finally {
    current.end();
  }
}

export async function recordNotification(input: {
  userId?: string | null;
  recipientEmail?: string | null;
  type: NotificationType;
  status?: NotificationStatus;
  subject?: string | null;
  errorMessage?: string | null;
  retryCount?: number;
  providerResponse?: unknown;
  sentAt?: Date | null;
}) {
  return prisma.notificationHistory.create({
    data: {
      user_id: input.userId ?? null,
      recipient_email: input.recipientEmail ?? null,
      notification_type: input.type,
      status: input.status ?? "pending",
      subject: input.subject ?? null,
      error_message: input.errorMessage ?? null,
      retry_count: input.retryCount ?? 0,
      provider_response: input.providerResponse === undefined ? undefined : json(input.providerResponse),
      sent_at: input.sentAt ?? null
    }
  });
}

export async function queueNotification(userId: string | null | undefined, type: NotificationType, context: NotificationContext = {}) {
  const profile = userId ? await prisma.profile.findUnique({ where: { id: userId }, select: { email: true, full_name: true } }) : null;
  const recipientEmail = context.recipientEmail ?? profile?.email ?? null;
  const recipientName = context.recipientName ?? profile?.full_name ?? null;
  const template = brandedTemplate(type, { ...context, recipientName });
  const config = smtpConfig();

  if (!recipientEmail) {
    return recordNotification({ userId, recipientEmail, type, status: "skipped", subject: template.subject, errorMessage: "No recipient email address available." });
  }
  if (!config) {
    return recordNotification({ userId, recipientEmail, type, status: "skipped", subject: template.subject, errorMessage: "SMTP host/from address are not configured." });
  }

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= config.maxRetries; attempt += 1) {
    try {
      const providerResponse = await smtpSend(config, recipientEmail, smtpMessage(config, recipientEmail, template.subject, template.html, template.text));
      return recordNotification({ userId, recipientEmail, type, status: "sent", subject: template.subject, retryCount: attempt - 1, providerResponse, sentAt: new Date() });
    } catch (error) {
      lastError = error;
      if (attempt < config.maxRetries) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  return recordNotification({
    userId,
    recipientEmail,
    type,
    status: "failed",
    subject: template.subject,
    retryCount: config.maxRetries,
    errorMessage: lastError instanceof Error ? lastError.message : "SMTP delivery failed.",
    providerResponse: { provider: "smtp", host: config.host }
  });
}
