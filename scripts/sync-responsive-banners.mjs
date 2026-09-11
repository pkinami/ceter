import { config } from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: ".env.local" });
config();

const root = process.cwd();
const sourceRoot = path.join(root, "public", "New_banner");
const bucket = process.env.SUPABASE_BANNER_IMAGES_BUCKET || "storefront-banners";
const dryRun = process.argv.includes("--dry-run");
const replaceAdminAssets = process.argv.includes("--replace-admin-assets");

const concepts = [
  { group: "hero", key: "hero-business-it-support", slug: "business-it-support", placement: "main", title: "Business IT support that keeps work moving", kicker: "IT support", body: "Responsive technical support, equipment sourcing and infrastructure services for active offices.", cta: "Request support", href: "/quote" },
  { group: "hero", key: "hero-toners-consumables", slug: "toners-consumables", placement: "main", title: "Toners and consumables for busy teams", kicker: "Commercial supply", body: "Source dependable cartridges, spares and office supplies with Ceter Technologies.", cta: "Shop toners", href: "/category/toner-ink-and-consumables" },
  { group: "hero", key: "hero-office-printer", slug: "office-printer", placement: "main", title: "Office printers supplied and supported", kicker: "Print infrastructure", body: "Choose printers, copiers and support plans sized for your workplace.", cta: "Explore printers", href: "/category/multifunction-printers" },
  { group: "services", key: "services-maintenance-support", slug: "maintenance-support", placement: "services", title: "Maintenance and support for office equipment", kicker: "Service desk", body: "Keep printers, copiers and IT equipment maintained with a responsive technical team.", cta: "Book service", href: "/quote" },
  { group: "services", key: "services-networking", slug: "networking", placement: "services", title: "Structured networking for growing offices", kicker: "Networking", body: "Plan and deploy cabling, Wi-Fi, switching and server connectivity with accountable support.", cta: "Plan a network", href: "/quote" },
  { group: "services", key: "services-cctv", slug: "cctv", placement: "services", title: "CCTV installation and support", kicker: "Security systems", body: "Protect sites with camera systems, installation, configuration and maintenance support.", cta: "Request CCTV quote", href: "/quote" },
  { group: "category", key: "category-toners", slug: "toners", placement: "category", categorySlug: "toner-ink-and-consumables", title: "Toners and printer consumables", kicker: "Category", body: "Find toner cartridges, drums and consumables for office print fleets.", cta: "Browse toners", href: "/category/toner-ink-and-consumables" },
  { group: "category", key: "category-photocopiers", slug: "photocopiers", placement: "category", categorySlug: "photocopiers", title: "Photocopiers for office productivity", kicker: "Category", body: "Compare copier options for reliable everyday document workflows.", cta: "Browse photocopiers", href: "/category/photocopiers" },
  { group: "category", key: "category-printers", slug: "printers", placement: "category", categorySlug: "multifunction-printers", title: "Printers for every department", kicker: "Category", body: "Shop office printers backed by installation, supplies and service.", cta: "Browse printers", href: "/category/multifunction-printers" }
];

const variants = {
  mobile: { width: 1080, height: 1350, shape: "tall", aspectRatio: "4:5" },
  landscape: { width: 1440, height: 1080, shape: "mid", aspectRatio: "4:3" },
  ultrawide: { width: 2048, height: 768, shape: "wide", aspectRatio: "8:3" }
};

const totals = { created: 0, updated: 0, unchanged: 0, warning: 0, error: 0, uploaded: 0 };
const details = [];

const prismaConnectionUrl = new URL(process.env.DATABASE_URL);
prismaConnectionUrl.searchParams.delete("sslmode");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: prismaConnectionUrl.toString(), ssl: { rejectUnauthorized: false } }) });

try {
  const checksums = await readChecksums();
  const supabase = supabaseClient();
  if (!dryRun) await ensureBucket(supabase);

  for (const concept of concepts) {
    try {
      const assets = await validateConcept(concept, checksums);
      const uploaded = [];
      for (const asset of assets) {
        const storagePath = `${concept.key}/${asset.variant}/${asset.sha256}.webp`;
        const publicUrl = publicStorageUrl(storagePath);
        if (!dryRun) {
          const exists = await objectExists(supabase, storagePath);
          if (!exists) {
            const { error } = await supabase.storage.from(bucket).upload(storagePath, asset.bytes, { contentType: "image/webp", upsert: false, cacheControl: "31536000" });
            if (error && !/already exists/i.test(error.message)) throw new Error(`Storage upload failed for ${storagePath}: ${error.message}`);
            if (!error) totals.uploaded += 1;
          }
        }
        uploaded.push({ ...asset, storagePath, publicUrl });
      }
      await upsertBanner(concept, uploaded);
    } catch (error) {
      totals.error += 1;
      details.push({ level: "error", concept: concept.key, message: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  await writeAudit();
  console.log(JSON.stringify({ dryRun, replaceAdminAssets, bucket, totals, details }, null, 2));
  process.exitCode = totals.error ? 1 : 0;
} finally {
  await prisma.$disconnect();
}

async function validateConcept(concept, checksums) {
  const output = [];
  for (const [variant, requirement] of Object.entries(variants)) {
    const filePath = path.join(sourceRoot, concept.group, `${concept.slug}-${variant}.webp`);
    const bytes = await fs.readFile(filePath);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const checksumKey = `responsive-v2/${concept.group}/${concept.slug}-${variant}.webp`;
    if (checksums.get(checksumKey) !== sha256) throw new Error(`Checksum mismatch for ${checksumKey}`);
    const dimensions = webpDimensions(bytes);
    if (!dimensions) throw new Error(`Could not decode WebP dimensions for ${checksumKey}`);
    if (dimensions.width !== requirement.width || dimensions.height !== requirement.height) {
      throw new Error(`${checksumKey} is ${dimensions.width}x${dimensions.height}; expected ${requirement.width}x${requirement.height}`);
    }
    output.push({ variant, bytes, sha256, ...requirement });
  }
  return output;
}

async function upsertBanner(concept, assets) {
  const existing = await db(() => prisma.banner.findUnique({ where: { banner_key: concept.key } }));
  const mobile = assets.find((asset) => asset.variant === "mobile");
  const landscape = assets.find((asset) => asset.variant === "landscape");
  const ultrawide = assets.find((asset) => asset.variant === "ultrawide");
  const category = concept.categorySlug ? await db(() => prisma.category.findFirst({ where: { slug: concept.categorySlug }, select: { id: true } })) : null;
  if (concept.categorySlug && !category) {
    totals.warning += 1;
    details.push({ level: "warning", concept: concept.key, message: `Category slug not found: ${concept.categorySlug}` });
  }
  const imageVariants = assets.map((asset) => ({
    slot: asset.variant,
    url: asset.publicUrl,
    path: asset.storagePath,
    width: asset.width,
    height: asset.height,
    aspectRatio: asset.aspectRatio,
    shape: asset.shape,
    sha256: asset.sha256
  }));
  const assetPayload = {
    image: ultrawide.publicUrl,
    laptop_image: landscape.publicUrl,
    mobile_image: mobile.publicUrl,
    image_path: ultrawide.storagePath,
    laptop_image_path: landscape.storagePath,
    mobile_image_path: mobile.storagePath,
    image_variants: imageVariants
  };
  if (!existing) {
    totals.created += 1;
    if (!dryRun) {
      const created = await db(() => prisma.banner.create({
        data: {
          banner_key: concept.key,
          internal_name: concept.key,
          title: concept.title,
          kicker: concept.kicker,
          body: concept.body,
          cta_label: concept.cta,
          cta_href: concept.href,
          destination_type: "internal",
          placement: concept.placement,
          category_id: category?.id ?? null,
          sort_order: sortOrder(concept),
          is_enabled: true,
          alt_text: concept.title,
          ...assetPayload
        }
      }));
      await db(() => prisma.auditLog.create({ data: { entity: "Banner", entity_id: created.id, action: "banner.bootstrap.create", after: { banner_key: concept.key, source: "public/New_banner" } } }));
    }
    return;
  }
  const canReplace = replaceAdminAssets || assetsMissing(existing);
  const update = {
    internal_name: existing.internal_name || concept.key,
    alt_text: existing.alt_text || concept.title,
    category_id: existing.category_id ?? category?.id ?? null,
    is_enabled: true,
    ...(canReplace ? assetPayload : {})
  };
  const changed = JSON.stringify(pickComparable(existing, update)) !== JSON.stringify(update);
  if (!changed) {
    totals.unchanged += 1;
    return;
  }
  totals.updated += 1;
  if (!dryRun) {
    await db(() => prisma.$transaction([
      prisma.banner.update({ where: { id: existing.id }, data: update }),
      prisma.auditLog.create({ data: { entity: "Banner", entity_id: existing.id, action: "banner.bootstrap.update", before: pickComparable(existing, update), after: update } })
    ]));
  }
}

function assetsMissing(banner) {
  return !banner.image || !banner.laptop_image || !banner.mobile_image;
}

function pickComparable(existing, update) {
  return Object.fromEntries(Object.keys(update).map((key) => [key, existing[key] ?? null]));
}

async function readChecksums() {
  const text = await fs.readFile(path.join(sourceRoot, "SHA256SUMS.txt"), "utf8");
  return new Map(text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [hash, rel] = line.split(/\s+/);
    return [rel.replaceAll("\\", "/"), hash];
  }));
}

function supabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL and service role key are required.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function ensureBucket(supabase) {
  const { data } = await supabase.storage.getBucket(bucket);
  if (data) return;
  const created = await supabase.storage.createBucket(bucket, { public: true, fileSizeLimit: "3MB", allowedMimeTypes: ["image/webp", "image/png", "image/jpeg"] });
  if (created.error && !/already exists/i.test(created.error.message)) throw new Error(`Bucket creation failed: ${created.error.message}`);
}

async function objectExists(supabase, storagePath) {
  const dir = storagePath.split("/").slice(0, -1).join("/");
  const name = storagePath.split("/").pop();
  const { data, error } = await supabase.storage.from(bucket).list(dir, { search: name, limit: 1 });
  if (error) return false;
  return data?.some((item) => item.name === name) ?? false;
}

function publicStorageUrl(storagePath) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${url}/storage/v1/object/public/${bucket}/${storagePath.split("/").map(encodeURIComponent).join("/")}`;
}

function sortOrder(concept) {
  const groupOffset = concept.group === "hero" ? 10 : concept.group === "services" ? 100 : 200;
  return groupOffset + concepts.filter((item) => item.group === concept.group).findIndex((item) => item.key === concept.key);
}

async function writeAudit() {
  if (dryRun) return;
  await db(() => prisma.auditLog.create({
    data: {
      entity: "Banner",
      entity_id: "responsive-banner-bootstrap",
      action: "banner.bootstrap.summary",
      after: { source: "public/New_banner", bucket, totals, details, digest: createHash("sha256").update(JSON.stringify(details)).digest("hex") }
    }
  }));
}

async function db(operation) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!/EAUTHTIMEOUT|timeout while waiting|Connection terminated|ECONNRESET|ETIMEDOUT/i.test(message) || attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
    }
  }
  throw lastError;
}

function webpDimensions(bytes) {
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X" && bytes.length >= 30) return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  if (chunk === "VP8 " && bytes.length >= 30) return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L" && bytes.length >= 25) {
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}
