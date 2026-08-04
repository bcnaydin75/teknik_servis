import { createHash, randomInt } from "node:crypto";
import { Resend } from "resend";

export function generateResetCode(): string {
  return String(randomInt(100000, 1000000));
}

export function hashResetCode(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const keep = local.slice(0, Math.min(2, local.length));
  return `${keep}***@${domain}`;
}

export async function sendPasswordResetCodeEmail(opts: {
  to: string;
  code: string;
  username: string;
  firmaAdi?: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() ||
    "Teknik Servis <onboarding@resend.dev>";

  const subject = "Şifre sıfırlama kodu";
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
      <h2 style="margin:0 0 12px">Şifre sıfırlama</h2>
      <p style="margin:0 0 12px;color:#475569">
        ${opts.firmaAdi ? `<strong>${opts.firmaAdi}</strong> — ` : ""}
        <strong>${opts.username}</strong> hesabı için sıfırlama kodu:
      </p>
      <p style="font-size:28px;letter-spacing:6px;font-weight:700;margin:16px 0">${opts.code}</p>
      <p style="margin:0;color:#64748b;font-size:14px">Kod 15 dakika geçerlidir. Bu isteği siz yapmadıysanız e-postayı yok sayın.</p>
    </div>
  `;

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[dev] Şifre sıfırlama kodu → ${opts.to}: ${opts.code}`);
      return { ok: true };
    }
    return {
      ok: false,
      message:
        "E-posta gönderimi yapılandırılmamış. Vercel'e RESEND_API_KEY ekleyin.",
    };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: opts.to,
      subject,
      html,
    });
    if (error) {
      console.error("[mail]", error);
      return { ok: false, message: "E-posta gönderilemedi. Daha sonra tekrar deneyin." };
    }
    return { ok: true };
  } catch (err) {
    console.error("[mail]", err);
    return { ok: false, message: "E-posta gönderilemedi. Daha sonra tekrar deneyin." };
  }
}
