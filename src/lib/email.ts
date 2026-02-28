/**
 * AWS SES email helper (stub — implement when AWS is configured).
 *
 * Usage:
 *   await sendInvoiceEmail({ to: "...", subject: "...", htmlBody: "..." })
 */

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

let sesClient: SESClient | null = null;

function getClient(): SESClient {
  if (!sesClient) {
    const region = process.env.AWS_REGION;
    if (!region) throw new Error("AWS_REGION is not configured.");
    sesClient = new SESClient({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return sesClient;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (!process.env.AWS_SES_FROM_EMAIL) {
    console.warn("[email] AWS_SES_FROM_EMAIL not set — skipping email send.");
    return;
  }

  const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

  const command = new SendEmailCommand({
    Source: process.env.AWS_SES_FROM_EMAIL,
    Destination: { ToAddresses: toAddresses },
    Message: {
      Subject: { Data: options.subject, Charset: "UTF-8" },
      Body: {
        Html: { Data: options.htmlBody, Charset: "UTF-8" },
        ...(options.textBody && {
          Text: { Data: options.textBody, Charset: "UTF-8" },
        }),
      },
    },
  });

  await getClient().send(command);
}

/**
 * Sends the invoice email to the Room I/C after a successful registration.
 * TODO: build the HTML invoice template.
 */
export async function sendInvoiceEmail(params: {
  to: string;
  invoiceNumber: string;
  roomInChargeName: string;
  totalAmount: number;
  htmlBody: string;
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: `COSBT Camp Registration — Invoice ${params.invoiceNumber}`,
    htmlBody: params.htmlBody,
  });
}
