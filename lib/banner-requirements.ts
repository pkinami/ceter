export const BANNER_MAX_FILE_SIZE = 3 * 1024 * 1024;
export const BANNER_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type BannerImageSlot = "wide_2400" | "wide_1600" | "wide_1280" | "mid_1280" | "mid_1024" | "tall_1080" | "tall_720";

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
  wide_2400: {
    label: "Wide 2400",
    field: "wide_2400_image_file",
    existingField: "existing_wide_2400_image",
    width: 2400,
    height: 675,
    aspectRatio: "32:9",
    shape: "wide",
    use: "Largest wide desktop screens."
  },
  wide_1600: {
    label: "Wide 1600",
    field: "wide_1600_image_file",
    existingField: "existing_wide_1600_image",
    width: 1600,
    height: 450,
    aspectRatio: "32:9",
    shape: "wide",
    use: "Standard wide desktop screens."
  },
  wide_1280: {
    label: "Wide 1280",
    field: "wide_1280_image_file",
    existingField: "existing_wide_1280_image",
    width: 1280,
    height: 360,
    aspectRatio: "32:9",
    shape: "wide",
    use: "Compact wide desktop screens."
  },
  mid_1280: {
    label: "Mid 1280",
    field: "mid_1280_image_file",
    existingField: "existing_mid_1280_image",
    width: 1280,
    height: 549,
    aspectRatio: "2.33:1",
    shape: "mid",
    use: "Balanced laptop and tablet screens."
  },
  mid_1024: {
    label: "Mid 1024",
    field: "mid_1024_image_file",
    existingField: "existing_mid_1024_image",
    width: 1024,
    height: 439,
    aspectRatio: "2.33:1",
    shape: "mid",
    use: "Smaller laptop and tablet screens."
  },
  tall_1080: {
    label: "Tall 1080",
    field: "tall_1080_image_file",
    existingField: "existing_tall_1080_image",
    width: 1080,
    height: 600,
    aspectRatio: "9:5",
    shape: "tall",
    use: "Large phones and narrow tablet screens."
  },
  tall_720: {
    label: "Tall 720",
    field: "tall_720_image_file",
    existingField: "existing_tall_720_image",
    width: 720,
    height: 400,
    aspectRatio: "9:5",
    shape: "tall",
    use: "Phone screens and low-bandwidth responsive fallback."
  }
};

export const BANNER_IMAGE_SLOTS = Object.keys(HOMEPAGE_BANNER_REQUIREMENTS) as BannerImageSlot[];
