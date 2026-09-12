import Link from "next/link";

export default function NotFound() {
  return (
    <div className="p-10 text-center">
      <p className="font-medium">Nothing here</p>
      <Link href="/" className="mt-3 inline-block text-primary">
        Back to the feed
      </Link>
    </div>
  );
}
