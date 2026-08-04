"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "react-qr-code";
import { fetchRepairStatus } from "@/lib/api";
import { fetchShopSettings } from "@/lib/settings-api";
import { getTrackingUrl } from "@/lib/whatsapp";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { formatDate } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";
import type { RepairData } from "@/types/repair";
import type { ShopSettings } from "@/types/settings";

export default function ReceiptPrintPage() {
  const { t, locale } = useTranslation();
  const params = useParams();
  const kod = decodeURIComponent(String(params.kod ?? ""));
  const [data, setData] = useState<RepairData | null>(null);
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!kod) return;
    fetchRepairStatus(kod)
      .then((res) => {
        if (res.success && res.data) setData(res.data);
        else setError(res.message ?? t("errors.notFound"));
      })
      .catch(() => setError(t("admin.receipt.loadFailed")));
    fetchShopSettings().then((res) => {
      if (res.success && res.data) setShop(res.data);
    });
  }, [kod, t]);

  const trackingUrl = getTrackingUrl(kod);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        /* Ekran: termal kağıt önizlemesi */
        .receipt-screen {
          min-height: 100vh;
          background: #e2e8f0;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 16px 40px;
        }
        .receipt-toolbar {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(255,255,255,0.95);
          border-bottom: 1px solid #e2e8f0;
          backdrop-filter: blur(8px);
        }
        .admin-dark .receipt-toolbar {
          background: rgba(15,23,42,0.95);
          border-bottom-color: #334155;
        }
        .admin-dark .receipt-screen {
          background: #0f172a;
        }
        .admin-dark .receipt-label {
          color: #94a3b8;
        }
        .receipt-label {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 12px;
          margin-top: 56px;
          text-align: center;
        }
        .receipt-paper-wrap {
          filter: drop-shadow(0 8px 24px rgba(0,0,0,0.12));
        }
        .receipt-paper {
          width: 80mm;
          min-width: 80mm;
          max-width: 80mm;
          background: #fff;
          color: #000;
          font-family: "Courier New", Courier, monospace;
          font-size: 11px;
          line-height: 1.45;
          padding: 4mm 3mm;
          box-sizing: border-box;
        }
        .receipt-paper::after {
          content: "";
          display: block;
          height: 8mm;
          background: repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 2px,
            #f1f5f9 2px,
            #f1f5f9 4px
          );
          margin-top: 4mm;
        }

        /* Yazdırma: sadece 80mm termal fiş */
        @media print {
          html, body {
            width: 80mm !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            overflow: visible !important;
          }
          .receipt-screen,
          .receipt-toolbar,
          .receipt-label,
          .no-print {
            display: none !important;
          }
          .receipt-print-only {
            display: block !important;
          }
          .receipt-paper-wrap {
            filter: none !important;
          }
          .receipt-paper {
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 2mm 3mm !important;
            box-shadow: none !important;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          .receipt-paper::after {
            display: none;
          }
        }
        @page {
          size: 80mm auto;
          margin: 0;
        }
        .receipt-print-only {
          display: none;
        }
      `}} />

      {/* Araç çubuğu — ekranda */}
      <div className="receipt-toolbar no-print">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          {t("admin.receipt.print")}
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {t("common.close")}
        </button>
      </div>

      {/* Önizleme */}
      <div className="receipt-screen no-print">
        <p className="receipt-label">
          {t("admin.receipt.preview")}
          <br />
          <span className="text-xs">{t("admin.receipt.printerHint")}</span>
        </p>
        <div className="receipt-paper-wrap">
          <ReceiptContent data={data} error={error} kod={kod} trackingUrl={trackingUrl} shop={shop} locale={locale} t={t} />
        </div>
      </div>

      {/* Yazdırma için ayrı kopya */}
      <div className="receipt-print-only">
        <ReceiptContent data={data} error={error} kod={kod} trackingUrl={trackingUrl} shop={shop} locale={locale} t={t} />
      </div>
    </>
  );
}

function ReceiptContent({
  data,
  error,
  kod,
  trackingUrl,
  shop,
  locale,
  t,
}: {
  data: RepairData | null;
  error: string | null;
  kod: string;
  trackingUrl: string;
  shop: ShopSettings | null;
  locale: Locale;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const firmaAdi = shop?.firma_adi?.trim() || t("admin.receipt.defaultShop");
  const telefon = shop?.telefon?.trim() || "";
  return (
    <div className="receipt-paper">
      {error && <p style={{ color: "red", fontSize: 11 }}>{error}</p>}
      {!data && !error && <p style={{ fontSize: 11 }}>{t("common.loading")}</p>}

      {data && (
        <>
          <div style={{ textAlign: "center", borderBottom: "1px dashed #000", paddingBottom: 8, marginBottom: 8 }}>
            {shop?.logo_url && (
              <div style={{ marginBottom: 6 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shop.logo_url}
                  alt={firmaAdi}
                  style={{ maxHeight: 48, maxWidth: "70mm", objectFit: "contain", margin: "0 auto", display: "block" }}
                />
              </div>
            )}
            <p style={{ fontSize: 15, fontWeight: "bold", margin: 0, letterSpacing: 0.3 }}>
              {firmaAdi.toUpperCase()}
            </p>
            {telefon ? (
              <p style={{ fontSize: 11, fontWeight: 600, margin: "4px 0 0" }}>{telefon}</p>
            ) : null}
            <p style={{ fontSize: 9, color: "#555", margin: "6px 0 0" }}>{t("admin.receipt.title")}</p>
          </div>

          <div style={{ fontSize: 10 }}>
            <Row label={t("admin.receipt.date")} value={formatDate(new Date().toISOString(), locale)} />
            <Row label={t("admin.receipt.customer")} value={data.musteri_adi} />
            <Row label={t("admin.receipt.device")} value={data.cihaz_modeli} />
          </div>

          <div style={{ textAlign: "center", margin: "10px 0", padding: "6px 0", border: "2px solid #000" }}>
            <p style={{ fontSize: 8, margin: 0, color: "#555" }}>{t("admin.receipt.trackingCode")}</p>
            <p style={{ fontSize: 16, fontWeight: "bold", margin: "2px 0 0", letterSpacing: 1 }}>{data.takip_kodu}</p>
          </div>

          <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
            <QRCode value={trackingUrl} size={100} level="M" style={{ width: 100, height: 100 }} />
          </div>

          <p style={{ textAlign: "center", fontSize: 8, color: "#555", margin: "4px 0 8px" }}>
            {t("admin.receipt.qrHint")}
          </p>

          {data.aciklama && (
            <div style={{ borderTop: "1px dashed #999", paddingTop: 6, marginTop: 6, fontSize: 9 }}>
              <p style={{ margin: 0, color: "#555" }}>{t("admin.receipt.note")}</p>
              <p style={{ margin: "2px 0 0" }}>{data.aciklama}</p>
            </div>
          )}

          <div style={{ borderTop: "1px dashed #000", marginTop: 10, paddingTop: 6, textAlign: "center", fontSize: 8, color: "#555" }}>
            <p style={{ margin: 0 }}>{t("admin.receipt.thanks")}</p>
            <p style={{ margin: "3px 0 0" }}>{trackingUrl.replace(/^https?:\/\//, "")}</p>
          </div>
        </>
      )}

      {!data && kod && !error && (
        <p style={{ fontSize: 10, textAlign: "center" }}>{t("admin.receipt.code", { code: kod })}</p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 4, marginBottom: 3 }}>
      <span style={{ color: "#555", flexShrink: 0 }}>{label}:</span>
      <span style={{ fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}
