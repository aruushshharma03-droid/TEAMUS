import type { BugReport, DB } from "./types";
import { uid } from "./ids";

function keyOf(b: BugReport) {
  const t = `${b.title} ${b.body} ${(b.console_logs ?? []).map((l) => l.message).join(" ")}`.toLowerCase();
  if (t.includes("share") || t.includes("chooser") || t.includes("crash")) return "share-crash";
  if (t.includes("undo") || t.includes("photo") || t.includes("attach")) return "undo-photo";
  if (t.includes("duplicate") || t.includes("sync") || t.includes("airplane")) return "sync-dup";
  if (t.includes("contrast") || t.includes("tick") || t.includes("dark")) return "contrast";
  if (t.includes("csv")) return "csv";
  return t.slice(0, 18);
}

export function clusterBounty(d: DB, bountyId: string) {
  const reports = d.bugReports.filter(
    (b) => b.bounty_id === bountyId && (b.status === "pending" || !b.issue_id)
  );
  const groups = new Map<string, BugReport[]>();
  for (const r of reports) {
    const k = keyOf(r);
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const issues = [...groups.entries()].map(([, list]) => {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at));
    const first = list[0];
    const bounty = d.bounties.find((b) => b.id === bountyId)!;
    let issue = first.issue_id ? d.issues.find((i) => i.id === first.issue_id) : undefined;
    if (!issue) {
      issue = {
        id: uid(),
        bounty_id: bountyId,
        app_id: bounty.app_id,
        title: first.title,
        merged_repro: first.repro_steps,
        env_correlation:
          list.length >= 3
            ? "Clustered from matching titles, repro steps, and console errors."
            : list.some((r) => r.console_logs.some((l) => l.level === "error"))
              ? "Console errors shared across reports."
              : null,
        severity: first.proposed_severity,
        first_finder_id: first.tester_id,
        reporter_count: list.length,
        status: "open",
        is_public: false,
        created_at: first.created_at,
      };
      d.issues.push(issue);
    } else {
      issue.reporter_count = list.length;
      issue.merged_repro = first.repro_steps;
    }
    for (const r of list) {
      r.issue_id = issue.id;
      if (r.status === "pending") r.status = "clustered";
    }
    return {
      title: issue.title,
      bug_report_ids: list.map((r) => r.id),
      merged_repro: issue.merged_repro,
      suggested_severity: issue.severity,
      env_correlation: issue.env_correlation,
    };
  });
  return { issues, submissions: new Set(reports.map((r) => r.submission_id)).size };
}
