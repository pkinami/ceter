"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function AdminInstallHelp() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)));
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  }

  if (installed) return null;

  return (
    <>
      {installPrompt ? (
        <button className="ceter-admin-install-button" type="button" onClick={install} aria-label="Install Ceter Admin">
          <Download size={17} /> <span>Install</span>
        </button>
      ) : (
        <button className="ceter-admin-install-button" type="button" onClick={() => setHelpOpen(true)} aria-label="How to add Ceter Admin to your home screen">
          <Download size={17} /> <span>Add to Home</span>
        </button>
      )}
      {helpOpen ? (
        <div className="ceter-admin-install-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setHelpOpen(false); }}>
          <section className="ceter-admin-install-card" role="dialog" aria-modal="true" aria-labelledby="ceter-admin-install-title">
            <button className="ceter-admin-install-close" type="button" onClick={() => setHelpOpen(false)} aria-label="Close">×</button>
            <span className="ceter-admin-install-icon"><Download size={22} /></span>
            <h2 id="ceter-admin-install-title">Add Ceter Admin to your home screen</h2>
            <p>Open this admin page in your browser menu and choose the home screen option. The shortcut opens the same secure admin sign-in.</p>
            <div className="ceter-admin-install-steps">
              <p><strong>iPhone or iPad</strong><br />In Safari, tap <Share size={14} aria-label="Share" /> Share, then <b>Add to Home Screen</b>.</p>
              <p><strong>Android</strong><br />In Chrome, tap <b>⋮</b>, then <b>Install app</b> or <b>Add to Home screen</b>.</p>
            </div>
            <p className="ceter-admin-install-note">An internet connection is required. Admin pages and data are not available offline.</p>
            <button className="ceter-admin-install-done" type="button" onClick={() => setHelpOpen(false)}>Got it</button>
          </section>
        </div>
      ) : null}
    </>
  );
}
