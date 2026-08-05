import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Nothing to index here, and it only answers POST.
      disallow: "/api/",
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
