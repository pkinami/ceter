"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

export function AdminNotificationBell() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/admin/notifications/count", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as { count?: number };
        if (active) setCount(Number(data.count ?? 0));
      } catch { /* a later poll will retry */ }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 30_000);
    return () => { active = false; window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, []);
  return <Link className="ceter-admin-bell" href="/admin/notifications" aria-label={`Open notifications${count ? `, ${count} unread` : ""}`}>
    <Bell size={18} />
    <span>{count > 99 ? "99+" : count}</span>
  </Link>;
}
