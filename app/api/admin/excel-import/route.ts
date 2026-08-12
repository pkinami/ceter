import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { categoryTemplateWorkbook, commitImport, previewImport, productTemplateWorkbook, type ImportKind, type ImportProgress } from "@/lib/admin-import";
import { getAdminSession, type AdminSession } from "@/lib/admin/auth";

export const maxDuration = 60;

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const IMPORT_JOB_TTL_MS = 30 * 60 * 1000;

type ImportJob = {
  id: string;
  kind: ImportKind;
  status: "queued" | "running" | "success" | "error";
  progress: ImportProgress;
  createdAt: number;
  updatedAt: number;
  result?: unknown;
  error?: string;
};

const globalForImports = globalThis as unknown as {
  ceterImportJobs?: Map<string, ImportJob>;
  ceterActiveImport?: string | null;
};

const importJobs = globalForImports.ceterImportJobs ?? new Map<string, ImportJob>();
globalForImports.ceterImportJobs = importJobs;
globalForImports.ceterActiveImport ??= null;

function importedCount(result: unknown) {
  if (!result || typeof result !== "object" || !("importedCount" in result)) return 0;
  const value = (result as { importedCount: unknown }).importedCount;
  return typeof value === "number" ? value : 0;
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
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });

  try {
    const parsed = await readRequest(request);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    if (parsed.mode === "preview") {
      const result = await previewImport(parsed.kind, parsed.buffer);
      return NextResponse.json(result);
    }

    const activeJobId = globalForImports.ceterActiveImport;
    const activeJob = activeJobId ? importJobs.get(activeJobId) : null;
    if (activeJob && (activeJob.status === "queued" || activeJob.status === "running")) {
      return NextResponse.json({ error: "Another import is already running.", jobId: activeJob.id }, { status: 409 });
    }

    const job = createJob(parsed.kind);
    startImportJob(job, parsed.buffer, session);
    return NextResponse.json({ jobId: job.id, status: job.status, progress: job.progress });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed." }, { status: 400 });
  }
}

export async function GET(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");
  if (jobId) {
    pruneJobs();
    const job = importJobs.get(jobId);
    if (!job) return NextResponse.json({ error: "Import job was not found." }, { status: 404 });
    return NextResponse.json(job);
  }

  const kind = validKind(url.searchParams.get("kind"));
  if (!kind) return NextResponse.json({ error: "Invalid import kind." }, { status: 400 });

  const buffer = kind === "products" ? productTemplateWorkbook() : categoryTemplateWorkbook();
  const filename = kind === "products" ? "ceter-products-import-template.xlsx" : "ceter-categories-import-template-v2.xlsx";
  return new NextResponse(buffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${filename}"`
    }
  });
}

function createJob(kind: ImportKind) {
  pruneJobs();
  const job: ImportJob = {
    id: crypto.randomUUID(),
    kind,
    status: "queued",
    progress: { stage: "Validating", processed: 0, total: 0 },
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  importJobs.set(job.id, job);
  globalForImports.ceterActiveImport = job.id;
  return job;
}

function startImportJob(job: ImportJob, buffer: Buffer, session: AdminSession) {
  setTimeout(async () => {
    job.status = "running";
    job.updatedAt = Date.now();
    try {
      const result = await commitImport(job.kind, buffer, {
        userId: session.userId,
        onProgress(progress) {
          job.progress = progress;
          job.updatedAt = Date.now();
        }
      });
      job.result = result;
      job.status = "success";
      job.progress = { stage: "Complete", processed: importedCount(result), total: job.progress.total };
      job.updatedAt = Date.now();
      if (importedCount(result) > 0) {
        revalidatePath("/");
        revalidatePath("/admin");
        revalidatePath("/category");
      }
    } catch (error) {
      job.status = "error";
      job.error = error instanceof Error ? error.message : "Import failed.";
      job.updatedAt = Date.now();
    } finally {
      if (globalForImports.ceterActiveImport === job.id) globalForImports.ceterActiveImport = null;
    }
  }, 0);
}

function pruneJobs() {
  const cutoff = Date.now() - IMPORT_JOB_TTL_MS;
  for (const [id, job] of importJobs) {
    if (job.updatedAt < cutoff && job.status !== "running" && job.status !== "queued") importJobs.delete(id);
  }
}
