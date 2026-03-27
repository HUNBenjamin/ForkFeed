import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function resolveAppUrl(): string {
  // NEXT_PUBLIC_APP_URL – manually set override (highest priority)
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  // VERCEL_PROJECT_PRODUCTION_URL – stable production URL injected by Vercel (no https:// prefix)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  // VERCEL_URL – deployment-specific URL injected by Vercel on every deploy
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // Local fallback
  return "http://localhost:8080";
}

async function sendResetEmail(to: string, token: string): Promise<void> {
  const appUrl = resolveAppUrl();
  const resetUrl = `${appUrl}/pages/reset-password?token=${token}`;

  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? `"ForkFeed" <${process.env.SMTP_USER}>`,
    to,
    subject: "ForkFeed – Jelszó visszaállítása",
    text: `Helló!\n\nKaptunk egy jelszó-visszaállítási kérést a fiókodhoz.\n\nKattints az alábbi linkre a jelszavad megváltoztatásához (1 óráig érvényes):\n\n${resetUrl}\n\nHa nem te kérted, hagyd figyelmen kívül ezt az e-mailt.\n\nÜdvözlettel,\nA ForkFeed csapata`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 8px;">
        <h2 style="color: #e85d04; margin-bottom: 8px;">ForkFeed</h2>
        <h3 style="color: #333; margin-top: 0;">Jelszó visszaállítása</h3>
        <p style="color: #555;">Helló!</p>
        <p style="color: #555;">Kaptunk egy jelszó-visszaállítási kérést a fiókodhoz. Kattints az alábbi gombra a jelszavad megváltoztatásához. A link <strong>1 óráig</strong> érvényes.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}"
             style="background-color: #e85d04; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
            Jelszó visszaállítása
          </a>
        </div>
        <p style="color: #888; font-size: 13px;">Ha nem te kérted, hagyd figyelmen kívül ezt az e-mailt – a fiókod biztonságos.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px; text-align: center;">ForkFeed &copy; ${new Date().getFullYear()}</p>
      </div>
    `,
  });
}

export async function POST(request: Request) {
  let payload: { email?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const email = payload.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "email is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, is_active: true },
  });

  // Always return 200 — do not reveal whether the email exists.
  if (!user || !user.is_active) {
    return NextResponse.json(
      {
        message: "Ha ez az e-mail cím regisztrálva van, hamarosan kapsz egy visszaállítási linket.",
      },
      { status: 200 },
    );
  }

  // Invalidate any existing unused tokens for this user.
  await prisma.passwordResetToken.updateMany({
    where: { user_id: user.id, used_at: null },
    data: { used_at: new Date() },
  });

  const token = randomBytes(32).toString("hex");
  const expires_at = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: { user_id: user.id, token, expires_at },
  });

  try {
    await sendResetEmail(email, token);
  } catch (err) {
    console.error("[forgot-password] Failed to send reset email:", err);
    // Do not expose email-sending errors to the client.
  }

  return NextResponse.json(
    { message: "Ha ez az e-mail cím regisztrálva van, hamarosan kapsz egy visszaállítási linket." },
    { status: 200 },
  );
}
