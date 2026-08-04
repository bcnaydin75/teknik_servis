"use client";

import { useEffect, useState } from "react";
import { checkAuth } from "@/lib/auth-api";
import { getRoleBadgeStyle, getRoleDisplayKey } from "@/lib/permissions";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

interface AdminUserBadgeProps {
  compact?: boolean;
}

export default function AdminUserBadge({ compact = false }: AdminUserBadgeProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState<string | null>(null);
  const [roleKey, setRoleKey] = useState<string>("roles.admin");
  const [badgeStyle, setBadgeStyle] = useState(getRoleBadgeStyle("admin", false));

  useEffect(() => {
    checkAuth().then((res) => {
      if (!res.success || !res.data) return;
      const isSuperadmin = Boolean(res.data.is_superadmin);
      const role = res.data.role ?? "admin";
      setUsername(res.data.username);
      setRoleKey(getRoleDisplayKey(role, isSuperadmin));
      setBadgeStyle(getRoleBadgeStyle(role, isSuperadmin));
    });
  }, []);

  if (!username) return null;

  return (
    <div
      className={`flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-100/80 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:ring-slate-700 ${
        compact ? "px-2 py-1.5" : "px-3 py-2"
      }`}
      title={`${username} — ${t(roleKey)}`}
    >
      {!compact && (
        <span className="max-w-[9rem] truncate font-mono text-sm text-slate-800 dark:text-slate-100">
          {username}
        </span>
      )}
      <span
        className={`shrink-0 rounded-lg px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${badgeStyle}`}
      >
        {t(roleKey)}
      </span>
    </div>
  );
}
