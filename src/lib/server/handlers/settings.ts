import { NextRequest, NextResponse } from "next/server";
import { validatePassword } from "@/lib/password";
import {
  canAssignStaffRole,
  createShopOwnerUser,
  hashPassword,
  requireManageStaff,
  requirePermission,
  requireSession,
  verifyPassword,
} from "../auth";
import { jsonFail, jsonOk } from "../api-response";
import {
  getShopSettingsForTenant,
  normalizeLocale,
} from "../shop-settings";
import { getSupabaseAdmin } from "../supabase";
import { isShopOwnerUser, requireShopTenant } from "../tenant-context";

function isShopOwnerRow(row: { id: number; tenant_id: number | null }): boolean {
  return row.tenant_id != null && row.id === row.tenant_id;
}

export async function handleSettings(request: NextRequest): Promise<NextResponse> {
  const action = request.nextUrl.searchParams.get("action") ?? "";
  const db = getSupabaseAdmin();

  if (action === "profile" && request.method === "GET") {
    const auth = await requireSession();
    if (!auth) return jsonFail("Oturum gerekli.", 401);
    if (auth.user.is_superadmin) {
      return jsonOk({ data: null });
    }
    const shop = requireShopTenant(auth.user);
    if (!shop.ok) return jsonFail(shop.message, shop.status);
    const data = await getShopSettingsForTenant(shop.tenantId, {
      includeLogoQuery: true,
    });
    return jsonOk({ data });
  }

  if (action === "profile" && request.method === "POST") {
    const auth = await requirePermission("settings");
    if (!auth.ok) return jsonFail(auth.message, auth.status);
    const shop = requireShopTenant(auth.user);
    if (!shop.ok) return jsonFail(shop.message, shop.status);

    const body = await request.json();
    const firma = (body.firma_adi ?? "").trim();
    if (!firma) return jsonFail("Firma adı zorunludur.", 400);

    const update: Record<string, unknown> = {
      firma_adi: firma,
      adres: (body.adres ?? "").trim() || null,
      telefon: (body.telefon ?? "").trim() || null,
      email: (body.email ?? "").trim() || null,
      guncelleme_tarihi: new Date().toISOString(),
    };

    if (body.default_locale !== undefined) {
      update.default_locale = normalizeLocale(String(body.default_locale));
    }
    if (body.ucret_detayi_goster !== undefined) {
      update.ucret_detayi_goster = Boolean(body.ucret_detayi_goster);
    }

    await db
      .from("shop_settings")
      .update(update)
      .eq("tenant_id", shop.tenantId);

    const data = await getShopSettingsForTenant(shop.tenantId, {
      includeLogoQuery: true,
    });
    return jsonOk({ message: "Firma bilgileri kaydedildi.", data });
  }

  if (action === "upload_logo" && request.method === "POST") {
    const auth = await requirePermission("settings");
    if (!auth.ok) return jsonFail(auth.message, auth.status);
    const shop = requireShopTenant(auth.user);
    if (!shop.ok) return jsonFail(shop.message, shop.status);

    const form = await request.formData();
    const file = form.get("logo");
    if (!file || !(file instanceof Blob)) {
      return jsonFail("Logo yüklenemedi.", 400);
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      return jsonFail("Sadece JPG, PNG, WEBP veya GIF.", 400);
    }

    const ext =
      file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/webp"
          ? "webp"
          : file.type === "image/gif"
            ? "gif"
            : "png";

    const path = `${shop.tenantId}/logo.${ext}`;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "logos";
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await db.storage
      .from(bucket)
      .upload(path, buffer, { upsert: true, contentType: file.type });

    if (uploadErr) {
      return jsonFail("Dosya kaydedilemedi.", 500);
    }

    await db
      .from("shop_settings")
      .update({ logo_path: path, guncelleme_tarihi: new Date().toISOString() })
      .eq("tenant_id", shop.tenantId);

    const data = await getShopSettingsForTenant(shop.tenantId, {
      includeLogoQuery: true,
    });
    return jsonOk({ message: "Logo yüklendi.", data });
  }

  if (action === "staff" && request.method === "GET") {
    const auth = await requireManageStaff();
    if (!auth.ok) return jsonFail(auth.message, auth.status);

    if (auth.user.is_superadmin) {
      const { data: rows } = await db
        .from("admin_users")
        .select("id, username, role, ad_soyad, aktif, olusturma_tarihi, tenant_id, is_superadmin")
        .eq("role", "admin")
        .eq("is_superadmin", false)
        .order("id", { ascending: true });

      const owners = (rows ?? []).filter((r) => isShopOwnerRow(r));
      const ownerIds = owners.map((r) => r.id);

      const shopByTenant = new Map<number, string>();
      if (ownerIds.length > 0) {
        const { data: shops } = await db
          .from("shop_settings")
          .select("tenant_id, firma_adi")
          .in("tenant_id", ownerIds);
        for (const s of shops ?? []) {
          shopByTenant.set(s.tenant_id, s.firma_adi);
        }
      }

      const staff = owners.map((r) => ({
        id: r.id,
        username: r.username,
        role: r.role,
        ad_soyad: r.ad_soyad,
        firma_adi: shopByTenant.get(r.id) ?? null,
        aktif: Boolean(r.aktif),
        olusturma_tarihi: r.olusturma_tarihi,
        is_account_owner: true,
      }));

      return jsonOk({ data: staff });
    }

    const shop = requireShopTenant(auth.user);
    if (!shop.ok) return jsonFail(shop.message, shop.status);

    const { data: rows } = await db
      .from("admin_users")
      .select("id, username, role, ad_soyad, aktif, olusturma_tarihi, tenant_id")
      .eq("tenant_id", shop.tenantId)
      .order("id", { ascending: true });

    const staff = (rows ?? []).map((r) => ({
      id: r.id,
      username: r.username,
      role: r.role,
      ad_soyad: r.ad_soyad,
      aktif: Boolean(r.aktif),
      olusturma_tarihi: r.olusturma_tarihi,
      is_account_owner: isShopOwnerUser(r.id, shop.tenantId),
    }));

    return jsonOk({ data: staff });
  }

  if (action === "staff_add" && request.method === "POST") {
    const auth = await requireManageStaff();
    if (!auth.ok) return jsonFail(auth.message, auth.status);

    const body = await request.json();
    const username = (body.username ?? "").trim();
    const password = body.password ?? "";
    const role = (body.role ?? "teknisyen").trim();
    const adSoyad = (body.ad_soyad ?? "").trim() || null;
    const firmaAdi = (body.firma_adi ?? "").trim();

    if (!username || !password) {
      return jsonFail("Kullanıcı adı ve şifre zorunludur.", 400);
    }

    if (auth.user.is_superadmin && !firmaAdi) {
      return jsonFail("Firma adı zorunludur.", 400);
    }

    const pwdErr = validatePassword(password);
    if (pwdErr) return jsonFail(pwdErr, 400);

    if (!canAssignStaffRole(auth.user.is_superadmin, role)) {
      return jsonFail(
        auth.user.is_superadmin
          ? "Geliştirici yalnızca dükkan admini (admin rolü) oluşturabilir."
          : "Geçersiz rol.",
        403
      );
    }

    if (auth.user.is_superadmin) {
      const created = await createShopOwnerUser({
        username,
        passwordHash: await hashPassword(password),
        adSoyad,
        firmaAdi,
        createdBy: auth.user.id,
      });
      if (!created.ok) return jsonFail(created.message, 400);
      return jsonOk({ message: "Dükkan yöneticisi oluşturuldu." });
    }

    const shop = requireShopTenant(auth.user);
    if (!shop.ok) return jsonFail(shop.message, shop.status);

    const { error } = await db.from("admin_users").insert({
      username,
      password_hash: await hashPassword(password),
      role,
      ad_soyad: adSoyad,
      tenant_id: shop.tenantId,
      created_by: auth.user.id,
      is_superadmin: false,
    });

    if (error) {
      return jsonFail("Bu kullanıcı adı zaten kullanılıyor.", 400);
    }

    return jsonOk({ message: "Personel eklendi." });
  }

  if (action === "staff_update" && request.method === "POST") {
    const auth = await requireManageStaff();
    if (!auth.ok) return jsonFail(auth.message, auth.status);

    const body = await request.json();
    const id = Number(body.id);
    if (!id) return jsonFail("Geçersiz personel.", 400);

    if (auth.user.is_superadmin) {
      const { data: target } = await db
        .from("admin_users")
        .select("id, role, tenant_id, is_superadmin")
        .eq("id", id)
        .maybeSingle();

      if (!target || target.is_superadmin || !isShopOwnerRow(target)) {
        return jsonFail("Dükkan yöneticisi bulunamadı.", 404);
      }

      const newRole = String(body.role ?? target.role);
      if (newRole !== "admin") {
        return jsonFail("Dükkan yöneticisinin rolü değiştirilemez.", 400);
      }

      const update: Record<string, unknown> = {
        ad_soyad: (body.ad_soyad ?? "").trim() || null,
        aktif: body.aktif !== undefined ? Boolean(body.aktif) : true,
      };

      if (body.password) {
        const pwdErr = validatePassword(String(body.password));
        if (pwdErr) return jsonFail(pwdErr, 400);
        update.password_hash = await hashPassword(String(body.password));
        update.must_change_password = false;
      }

      const { error } = await db.from("admin_users").update(update).eq("id", id);
      if (error) return jsonFail("Güncellenemedi.", 500);

      const nextFirma = (body.firma_adi ?? "").trim();
      if (nextFirma) {
        await db
          .from("shop_settings")
          .update({ firma_adi: nextFirma, guncelleme_tarihi: new Date().toISOString() })
          .eq("tenant_id", id);
      }

      return jsonOk({ message: "Dükkan yöneticisi güncellendi." });
    }

    const shop = requireShopTenant(auth.user);
    if (!shop.ok) return jsonFail(shop.message, shop.status);

    const { data: target } = await db
      .from("admin_users")
      .select("id, role, tenant_id")
      .eq("id", id)
      .eq("tenant_id", shop.tenantId)
      .maybeSingle();

    if (!target) return jsonFail("Personel bulunamadı.", 404);

    if (isShopOwnerUser(target.id, shop.tenantId) && id !== auth.user.id) {
      return jsonFail("Dükkan sahibi yalnızca kendi hesabından düzenlenebilir.", 403);
    }

    const newRole = String(body.role ?? target.role);
    if (!canAssignStaffRole(false, newRole)) {
      return jsonFail("Geçersiz rol.", 403);
    }

    if (isShopOwnerUser(target.id, shop.tenantId) && newRole !== "admin") {
      return jsonFail("Dükkan sahibinin rolü değiştirilemez.", 400);
    }

    const update: Record<string, unknown> = {
      role: newRole,
      ad_soyad: (body.ad_soyad ?? "").trim() || null,
      aktif: body.aktif !== undefined ? Boolean(body.aktif) : true,
    };

    if (body.password) {
      const pwdErr = validatePassword(String(body.password));
      if (pwdErr) return jsonFail(pwdErr, 400);
      update.password_hash = await hashPassword(String(body.password));
      update.must_change_password = false;
    }

    const { error } = await db
      .from("admin_users")
      .update(update)
      .eq("id", id)
      .eq("tenant_id", shop.tenantId);

    if (error) return jsonFail("Güncellenemedi.", 500);
    return jsonOk({ message: "Personel güncellendi." });
  }

  if (action === "staff_delete" && request.method === "POST") {
    const auth = await requireManageStaff();
    if (!auth.ok) return jsonFail(auth.message, auth.status);

    const body = await request.json();
    const id = Number(body.id);
    if (!id) return jsonFail("Geçersiz personel.", 400);
    if (id === auth.user.id) {
      return jsonFail("Kendi hesabınızı silemezsiniz.", 400);
    }

    if (auth.user.is_superadmin) {
      const { data: target } = await db
        .from("admin_users")
        .select("id, username, tenant_id, is_superadmin")
        .eq("id", id)
        .maybeSingle();

      if (!target || target.is_superadmin || !isShopOwnerRow(target)) {
        return jsonFail("Dükkan yöneticisi bulunamadı.", 404);
      }

      await db.from("admin_users").delete().eq("id", id);
      return jsonOk({
        message: "Dükkan yöneticisi ve tüm dükkan verisi kalıcı olarak silindi.",
        data: { username: target.username },
      });
    }

    const shop = requireShopTenant(auth.user);
    if (!shop.ok) return jsonFail(shop.message, shop.status);

    const { data: target } = await db
      .from("admin_users")
      .select("id, username, role, tenant_id")
      .eq("id", id)
      .eq("tenant_id", shop.tenantId)
      .maybeSingle();

    if (!target) return jsonFail("Personel bulunamadı.", 404);

    if (isShopOwnerUser(target.id, shop.tenantId)) {
      return jsonFail("Dükkan sahibi silinemez.", 400);
    }

    await db.from("admin_users").delete().eq("id", id);
    return jsonOk({
      message: "Personel kalıcı olarak silindi.",
      data: { username: target.username },
    });
  }

  if (action === "change_password" && request.method === "POST") {
    const auth = await requireSession();
    if (!auth) return jsonFail("Oturum gerekli.", 401);

    const body = await request.json();
    const newPassword = body.new_password ?? "";
    const pwdErr = validatePassword(newPassword);
    if (pwdErr) return jsonFail(pwdErr, 400);

    const { data: user } = await db
      .from("admin_users")
      .select("password_hash")
      .eq("id", auth.user.id)
      .single();

    if (!user || !(await verifyPassword(user.password_hash, body.old_password ?? ""))) {
      return jsonFail("Mevcut şifre hatalı.", 401);
    }

    await db
      .from("admin_users")
      .update({
        password_hash: await hashPassword(newPassword),
        must_change_password: false,
      })
      .eq("id", auth.user.id);

    return jsonOk({ message: "Şifre değiştirildi." });
  }

  return jsonFail("Geçersiz istek.", 405);
}
