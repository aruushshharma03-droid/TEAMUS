import { z } from "zod";
import { fail, handleError, ok } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { db, persist } from "@/lib/store";
import { uid, nowIso } from "@/lib/ids";

export async function POST(req: Request) {
  try {
    await requireUser();
    const body = z
      .object({
        bucket: z.enum(["evidence", "builds", "instructions", "avatars", "icons"]),
        filename: z.string(),
        contentType: z.string(),
        size: z.number(),
      })
      .safeParse(await req.json());
    if (!body.success) return fail("BAD_REQUEST", "Invalid upload request");
    const allowed = ["image/png", "image/jpeg", "image/webp", "video/mp4", "application/pdf", "application/vnd.android.package-archive"];
    if (!allowed.some((t) => body.data.contentType.startsWith(t.split("/")[0]) || allowed.includes(body.data.contentType))) {
      if (!body.data.contentType.startsWith("image/") && !body.data.contentType.startsWith("video/"))
        return fail("TYPE", "Unsupported type");
    }
    if (body.data.size > 80 * 1024 * 1024) return fail("TOO_LARGE", "File too large");
    const path = `${body.data.bucket}/${uid()}-${body.data.filename}`;
    dPushEvidence(path);
    return ok({ path, signedUrl: `/api/upload/mock?path=${encodeURIComponent(path)}` });
  } catch (e) {
    return handleError(e);
  }
}

function dPushEvidence(path: string) {
  const d = db();
  d.evidence.push({
    id: uid(),
    bug_report_id: null,
    submission_id: null,
    storage_path: path,
    kind: path.match(/mp4|webm/) ? "video" : path.match(/png|jpe?g|webp/) ? "image" : "file",
    meta: {},
    created_at: nowIso(),
  });
  persist();
}
