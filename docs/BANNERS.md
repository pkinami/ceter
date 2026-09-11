# Banners

The storefront uses the static manifest in `lib/banner-assets.ts` as the local fallback banner set. The active source files live under `public/New_banner/`.

## Required Files

Each banner concept needs three WebP crops:

```text
public/New_banner/<group>/<slug>-mobile.webp
public/New_banner/<group>/<slug>-landscape.webp
public/New_banner/<group>/<slug>-ultrawide.webp
```

Groups are `hero`, `category`, and `services`. The checksum file `public/New_banner/SHA256SUMS.txt` is required by `npm run banners:sync`.

## Dimensions

| Variant | Size | Used For |
|---|---:|---|
| `mobile` | 1080 x 1350 | phones |
| `landscape` | 1440 x 1080 | tablets and compact layouts |
| `ultrawide` | 2048 x 768 | desktop hero and wide strips |

## Workflow

```bash
npm run banners:sync
```

`banners:sync` validates source files and checksums, uploads validated assets to the configured Supabase banner bucket, and upserts banner records.

Use licensed or company-owned imagery only. Do not bake headlines, buttons, phone numbers, QR codes, or watermarks into banner artwork; the application renders copy and calls to action.
