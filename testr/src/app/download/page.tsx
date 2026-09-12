import { Download } from "lucide-react";

export default function DownloadSourcePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium text-primary">testr</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Download the source</h1>
      <p className="mt-3 text-muted-foreground">
        Get <code className="text-foreground">testr_source.zip</code> (~240 KB). It is the full
        project without <code className="text-foreground">node_modules</code> or build output.
      </p>
      <a
        href="/testr_source.zip"
        download="testr_source.zip"
        className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
      >
        <Download className="size-4" />
        Download testr_source.zip
      </a>
      <ol className="mt-10 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Extract the zip on your PC (for example into Documents\testr).</li>
        <li>
          In that folder run <code className="text-foreground">npm install</code> then{" "}
          <code className="text-foreground">npm run dev</code>.
        </li>
        <li>Open the URL Next prints (port 43123).</li>
      </ol>
    </main>
  );
}
