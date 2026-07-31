interface WhatsAppMessageParams {
  musteriAdi: string;
  cihazModeli: string;
  tutar: number;
  takipKodu: string;
}

export function formatPhoneForWhatsApp(phone: string | null): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = "90" + digits.slice(1);
  } else if (!digits.startsWith("90")) {
    digits = "90" + digits;
  }
  return digits.length >= 12 ? digits : null;
}

export function buildReadyMessage({
  musteriAdi,
  cihazModeli,
  tutar,
  takipKodu,
}: WhatsAppMessageParams): string {
  const tutarStr = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(tutar);

  return (
    `Merhaba ${musteriAdi}, ${cihazModeli} cihazınızın tamiri tamamlanmıştır. ` +
    `Toplam tutar: ${tutarStr} TL. Takip kodunuz: ${takipKodu}. ` +
    `Dükkanımızdan teslim alabilirsiniz.`
  );
}

export function getWhatsAppUrl(phone: string | null, message: string): string | null {
  const formatted = formatPhoneForWhatsApp(phone);
  if (!formatted) return null;
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
}

export function getTrackingUrl(takipKodu: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/?kod=${encodeURIComponent(takipKodu)}`;
  }
  return `http://localhost:3000/?kod=${encodeURIComponent(takipKodu)}`;
}
