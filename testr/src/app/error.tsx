"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-10 text-center">
      <p className="font-medium">This page hit a snag</p>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button className="mt-4 text-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
