import { revalidatePath } from "next/cache";

export function revalidateStorefront(paths: Array<string | null | undefined> = []) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/category");
  revalidatePath("/category/[slug]", "page");
  revalidatePath("/product/[slug]", "page");

  for (const path of paths) {
    if (path) revalidatePath(path);
  }
}
