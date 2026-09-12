import { subscribe, type RealtimeMessage } from "@/lib/bus";
import { expireClaims, fn_escalate_rewards, fn_expire_bounty } from "@/lib/money";
import { db, persist } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  let unsub: () => void = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (msg: RealtimeMessage) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
      };
      unsub = subscribe(send);
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ channel: "hello" })}\n\n`));
    },
    cancel() {
      unsub();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }
  const d = db();
  fn_escalate_rewards(d);
  expireClaims(d);
  for (const b of d.bounties) {
    if (new Date(b.expires_at).getTime() < Date.now() && b.status !== "settled") fn_expire_bounty(d, b.id);
  }
  persist();
  return Response.json({ data: { ok: true } });
}
