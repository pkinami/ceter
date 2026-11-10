"use client";

import { Toaster } from "sonner";

export function NotificationSystem() {
  return <Toaster richColors position="top-right" closeButton visibleToasts={3} toastOptions={{ duration: 5000, className: "ceter-toast" }} />;
}
