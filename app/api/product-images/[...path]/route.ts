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
  if (error || !data) return NextResponse.json({ error: "Product image not found." }, { status: 404 });

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
