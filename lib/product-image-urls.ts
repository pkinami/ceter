const DEFAULT_BUCKET = "product-images";

export function productImagesBucket() {
  return process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || DEFAULT_BUCKET;
}

export function productImageRenderUrl(value: string) {
  const path = storageObjectPathFromProductImageUrl(value);
  if (!path) return value;
  return `/api/product-images/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export function productImageRenderUrls(values: string[]) {
  return values.map(productImageRenderUrl);
}

export function storageObjectPathFromProductImageUrl(value: string | null | undefined) {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const bucket = productImagesBucket();
  const markers = [
    `/storage/v1/object/public/${bucket}/`,
    `/storage/v1/object/sign/${bucket}/`
  ];
  const marker = markers.find((item) => url.pathname.includes(item));
  if (!marker) return null;

  const markerIndex = url.pathname.indexOf(marker);
  const path = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  return path && !path.includes("..") ? path : null;
}
