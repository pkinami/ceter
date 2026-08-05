import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { commitImport, previewImport, type ImportKind } from "@/lib/admin-import";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function importedCount(result: unknown) {
  if (!result || typeof result !== "object" || !("importedCount" in result)) return 0;
  const value = (result as { importedCount: unknown }).importedCount;
  return typeof value === "number" ? value : 0;
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;
  const profile = await prisma.profile.findUnique({ where: { id: userData.user.id }, select: { role: true } });
  return profile?.role === "admin";
}

function validKind(value: FormDataEntryValue | null): ImportKind | null {
  return value === "products" || value === "categories" ? value : null;
}

async function readRequest(request: Request) {
  const formData = await request.formData();
  const kind = validKind(formData.get("kind"));
  const mode = formData.get("mode") === "commit" ? "commit" : "preview";
  const file = formData.get("file");

  if (!kind) return { error: "Invalid import kind." };
  if (!(file instanceof File)) return { error: "Choose an .xlsx file." };
  if (!file.name.toLowerCase().endsWith(".xlsx")) return { error: "Only .xlsx files are accepted." };
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) return { error: "File must be larger than 0 bytes and no larger than 5 MB." };

  return { kind, mode, buffer: Buffer.from(await file.arrayBuffer()) };
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });

  try {
    const parsed = await readRequest(request);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const result = parsed.mode === "commit" ? await commitImport(parsed.kind, parsed.buffer) : await previewImport(parsed.kind, parsed.buffer);
    if (parsed.mode === "commit" && importedCount(result) > 0) {
      revalidatePath("/");
      revalidatePath("/admin");
      revalidatePath("/category");
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed." }, { status: 400 });
  }
}
