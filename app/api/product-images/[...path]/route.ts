import { NextResponse } from "next/server";
import { productImagesBucket } from "@/lib/product-image-urls";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const params = await Promise.resolve(context.params);
  const path = (params.path ?? []).join("/");
  if (!path || path.includes("..")) return NextResponse.json({ error: "Invalid image path." }, { status: 400 });

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage.from(productImagesBucket()).download(path);
  if (error || !data) return productImagePlaceholder();

  return new NextResponse(data.stream(), {
    headers: {
      "content-type": data.type || contentTypeFromPath(path),
      "cache-control": "public, max-age=31536000, immutable"
    }
  });
}

function contentTypeFromPath(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  if (extension === "avif") return "image/avif";
  return "image/jpeg";
}

function productImagePlaceholder() {
  const body = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" role="img" aria-label="Product image pending"><rect width="640" height="480" fill="#f8fafc"/><rect x="112" y="96" width="416" height="288" rx="24" fill="#e2e8f0"/><path d="M196 316h248l-76-88-55 64-36-42-81 66Z" fill="#94a3b8"/><circle cx="256" cy="190" r="34" fill="#cbd5e1"/><text x="320" y="420" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#475569">Image pending</text></svg>`;
  return new NextResponse(body, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=3600"
    }
  });
}
