#!/usr/bin/env node
/**
 * İlk admin kullanıcısı oluşturur.
 *
 * Kullanım:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-admin.mjs bcnaydin75 Sifren123
 */
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.error("Kullanım: node scripts/create-admin.mjs <username> <password>");
  process.exit(1);
}

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.error("SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const hash = await bcrypt.hash(password, 10);

const { data: user, error } = await db
  .from("admin_users")
  .insert({
    username,
    password_hash: hash,
    role: "admin",
    aktif: true,
  })
  .select("id")
  .single();

if (error) {
  console.error("Hata:", error.message);
  process.exit(1);
}

await db.from("admin_users").update({ tenant_id: user.id }).eq("id", user.id);

await db.from("shop_settings").upsert(
  {
    tenant_id: user.id,
    firma_adi: "Teknik Servis",
  },
  { onConflict: "tenant_id" }
);

console.log(`Admin oluşturuldu: ${username} (id=${user.id}, tenant_id=${user.id})`);
