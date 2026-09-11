import { createHash } from "node:crypto";

export type ImageMetadata = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
  width: number;
  height: number;
  sha256: string;
};

export const ACCEPTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function cleanImageContentType(value: string | null | undefined) {
  const contentType = value?.split(";")[0]?.trim().toLowerCase() ?? "";
  return (ACCEPTED_IMAGE_MIME_TYPES as readonly string[]).includes(contentType) ? contentType as ImageMetadata["contentType"] : null;
}

export function validateImageBytes(bytes: Buffer, expectedType?: string | null): ImageMetadata {
  if (!bytes.length) throw new Error("Image file is empty.");
  const magicType = imageTypeFromMagicBytes(bytes);
  const cleanExpected = cleanImageContentType(expectedType);
  if (!magicType) throw new Error("Image bytes are not a supported JPEG, PNG, or WebP file.");
  if (cleanExpected && cleanExpected !== magicType) throw new Error("Image MIME type does not match the uploaded bytes.");
  const dimensions = imageDimensions(bytes, magicType);
  if (!dimensions) throw new Error("Image dimensions could not be decoded.");
  return {
    contentType: magicType,
    extension: extensionForImageType(magicType),
    width: dimensions.width,
    height: dimensions.height,
    sha256: createHash("sha256").update(bytes).digest("hex")
  };
}

export function imageTypeFromMagicBytes(bytes: Buffer): ImageMetadata["contentType"] | null {
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes.toString("ascii", 1, 4) === "PNG" && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}

export function extensionForImageType(type: ImageMetadata["contentType"]) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export function imageDimensions(bytes: Buffer, type: ImageMetadata["contentType"]) {
  if (type === "image/png" && bytes.length >= 24) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (type === "image/jpeg") return jpegDimensions(bytes);
  if (type === "image/webp") return webpDimensions(bytes);
  return null;
}

function jpegDimensions(bytes: Buffer) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2) return null;
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function webpDimensions(bytes: Buffer) {
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X" && bytes.length >= 30) {
    return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  }
  if (chunk === "VP8 " && bytes.length >= 30) {
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L" && bytes.length >= 25) {
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

export function safePathSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "asset";
}
