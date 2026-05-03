import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Groundly PRO",
    short_name: "Groundly",
    description: "Field service management for local service businesses",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#f4f7fa",
    theme_color: "#007bb8",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
