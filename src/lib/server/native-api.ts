import { NextRequest, NextResponse } from "next/server";
import { isNativeApiEnabled } from "./supabase";
import { handleAuth, handlePing } from "./handlers/auth";
import { handlePublicSettings } from "./handlers/public-settings";
import {
  handleAddDevice,
  handleDashboardStats,
  handleDeleteDevice,
  handleGetDevices,
  handleRepairStatus,
  handleUpdateDevice,
} from "./handlers/devices";
import { handleSettings } from "./handlers/settings";
import { handleInventory, handleFinance } from "./handlers/inventory-finance";
import { handleCheckCustomer, handleUpdateCustomer } from "./handlers/customers";
import { handleSuppliers } from "./handlers/suppliers";
import { handlePos, handleCari } from "./handlers/pos-cari";
import { jsonFail } from "./api-response";

const ROUTES: Record<
  string,
  (request: NextRequest) => Promise<NextResponse>
> = {
  "auth.php": handleAuth,
  "ping.php": () => handlePing(),
  "public_settings.php": handlePublicSettings,
  "get_devices.php": handleGetDevices,
  "dashboard_stats.php": () => handleDashboardStats(),
  "add_device.php": handleAddDevice,
  "update_device.php": handleUpdateDevice,
  "delete_device.php": handleDeleteDevice,
  "repair-status.php": handleRepairStatus,
  "settings.php": handleSettings,
  "inventory.php": handleInventory,
  "finance.php": () => handleFinance(),
  "check_customer.php": handleCheckCustomer,
  "update_customer.php": handleUpdateCustomer,
  "suppliers.php": handleSuppliers,
  "pos.php": handlePos,
  "cari.php": handleCari,
};

/**
 * Supabase native API — cPanel PHP yerine Next.js route handler.
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY tanımlıysa devreye girer.
 */
export async function handleNativeApi(
  request: NextRequest,
  path: string
): Promise<NextResponse | null> {
  if (!isNativeApiEnabled()) return null;

  const file = path.split("/").pop() ?? path;
  const handler = ROUTES[file];

  if (!handler) {
    return jsonFail(`Native API: ${file} henüz yok.`, 501);
  }

  try {
    return await handler(request);
  } catch (err) {
    console.error("[native-api]", file, err);
    return jsonFail("Sunucu hatası.", 500);
  }
}

export { isNativeApiEnabled };
