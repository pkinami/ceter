"use client";

import { Toaster } from "sonner";

export function NotificationSystem() {
  return <Toaster richColors position="top-right" closeButton toastOptions={{ duration: 3000 }} />;
}
