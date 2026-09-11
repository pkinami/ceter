export const BANNER_MAX_FILE_SIZE = 3 * 1024 * 1024;
export const BANNER_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type BannerImageSlot = "mobile" | "landscape" | "ultrawide";

export const HOMEPAGE_BANNER_REQUIREMENTS: Record<BannerImageSlot, {
  label: string;
  field: string;
  existingField: string;
  width: number;
  height: number;
  aspectRatio: string;
  shape: "wide" | "mid" | "tall";
  use: string;
}> = {
  mobile: {
    label: "Mobile",
    field: "mobile_image_file",
    existingField: "existing_mobile_image",
    width: 1080,
    height: 1350,
    aspectRatio: "4:5",
    shape: "tall",
    use: "Phone screens up to 767px."
  },
  landscape: {
    label: "Landscape/tablet",
    field: "landscape_image_file",
    existingField: "existing_landscape_image",
    width: 1440,
    height: 1080,
    aspectRatio: "4:3",
    shape: "mid",
    use: "Tablet and laptop screens from 768px to 1279px."
  },
  ultrawide: {
    label: "Ultra-wide",
    field: "ultrawide_image_file",
    existingField: "existing_ultrawide_image",
    width: 2048,
    height: 768,
    aspectRatio: "8:3",
    shape: "wide",
    use: "Desktop and ultra-wide screens from 1280px."
  }
};

export const BANNER_IMAGE_SLOTS = Object.keys(HOMEPAGE_BANNER_REQUIREMENTS) as BannerImageSlot[];
