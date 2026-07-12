import { prisma } from "./prisma";
import type { NotificationType } from "@prisma/client";

/**
 * Record an in-app notification and best-effort fire the matching n8n webhook.
 * n8n is optional infrastructure — failures here never block the app.
 */
export async function notify(opts: {
  type: NotificationType;
  title: string;
  message: string;
  employeeId?: string | null;
}) {
  await prisma.notification.create({
    data: {
      type: opts.type,
      title: opts.title,
      message: opts.message,
      employeeId: opts.employeeId ?? null,
    },
  });
  await fireN8n(opts.type, opts);
}

/** POST an event to the configured n8n webhook. Swallows all errors. */
export async function fireN8n(event: string, payload: unknown) {
  const base = process.env.N8N_WEBHOOK_URL;
  if (!base) return;
  try {
    await fetch(`${base}/ecosphere`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event, payload }),
    });
  } catch {
    /* n8n is optional; never block the request */
  }
}
