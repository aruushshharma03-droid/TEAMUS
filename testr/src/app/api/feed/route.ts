import { db } from "@/lib/store";
import { getSessionUser } from "@/lib/session";
import { feedCards } from "@/lib/queries";
import { ok } from "@/lib/http";

export const revalidate = 15;

export async function GET(req: Request) {
  const filter = new URL(req.url).searchParams.get("filter") ?? "all";
  const viewer = await getSessionUser();
  const cards = feedCards(db(), viewer, filter);
  return ok({ cards });
}
