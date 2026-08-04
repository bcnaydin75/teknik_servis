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

async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() ||
    "Teknik Servis <onboarding@resend.dev>";

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[dev] E-posta → ${opts.to}: ${opts.subject}`);
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
      subject: opts.subject,
      html: opts.html,
    });
    if (error) {
      console.error("[mail]", error);
      return { ok: false, message: "E-posta gönderilemedi." };
    }
    return { ok: true };
  } catch (err) {
    console.error("[mail]", err);
    return { ok: false, message: "E-posta gönderilemedi." };
  }
}

export async function sendPasswordResetCodeEmail(opts: {
  to: string;
  code: string;
  username: string;
  firmaAdi?: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
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
  return sendMail({ to: opts.to, subject, html });
}

const STATUS_LABEL_TR: Record<string, string> = {
  beklemede: "Beklemede",
  inceleniyor: "İnceleniyor",
  parca_bekliyor: "Parça Bekliyor",
  tamirde: "Tamirde",
  hazir: "Teslime Hazır",
  teslim_edildi: "Teslim Edildi",
};

export async function sendRepairStatusEmail(opts: {
  to: string;
  musteriAdi: string;
  takipKodu: string;
  cihazModeli: string;
  durum: string;
  firmaAdi?: string | null;
  firmaTelefon?: string | null;
  trackingUrl?: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const durumLabel = STATUS_LABEL_TR[opts.durum] ?? opts.durum;
  const subject =
    opts.durum === "hazir"
      ? `Cihazınız hazır — ${opts.takipKodu}`
      : `Tamir durumu güncellendi — ${opts.takipKodu}`;

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
      <h2 style="margin:0 0 12px">${opts.firmaAdi ?? "Teknik Servis"}</h2>
      <p style="margin:0 0 12px;color:#475569">
        Merhaba <strong>${opts.musteriAdi}</strong>,
      </p>
      <p style="margin:0 0 12px;color:#475569">
        <strong>${opts.cihazModeli}</strong> cihazınızın durumu güncellendi.
      </p>
      <p style="margin:16px 0;font-size:18px;font-weight:700">
        Yeni durum: ${durumLabel}
      </p>
      <p style="margin:0 0 8px;color:#64748b;font-size:14px">
        Takip kodu: <strong style="font-family:ui-monospace,monospace">${opts.takipKodu}</strong>
      </p>
      ${
        opts.trackingUrl
          ? `<p style="margin:16px 0"><a href="${opts.trackingUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:600">Durumu görüntüle</a></p>`
          : ""
      }
      ${
        opts.firmaTelefon
          ? `<p style="margin:12px 0 0;color:#64748b;font-size:14px">İletişim: ${opts.firmaTelefon}</p>`
          : ""
      }
    </div>
  `;

  return sendMail({ to: opts.to, subject, html });
}
