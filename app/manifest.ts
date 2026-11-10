import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  const adminUrl = `${SITE_URL}/admin/`;
  return {
    name: `${SITE_NAME} Admin`,
    short_name: "Ceter Admin",
    description: `Mobile admin workspace for ${SITE_NAME}. ${SITE_DESCRIPTION}`,
    start_url: adminUrl,
    scope: `${SITE_URL}/admin/`,
    id: adminUrl,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0B1E39",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/ceter-logo-pack/app-icon/ceter-app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/ceter-logo-pack/app-icon/ceter-app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
