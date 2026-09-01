"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-lg px-5 py-24 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-gold">出錯</p>
      <h1 className="mt-3 display text-3xl">呢頁暫時開唔到</h1>
      <p className="mt-3 text-sm text-muted">{error.message || "請再試一次，或返回日曆。"}</p>
      <div className="mt-8 flex justify-center gap-3">
        <button onClick={reset} className="rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-bg">
          再試
        </button>
        <a href="/live" className="rounded-full border border-line px-5 py-2.5 text-sm">
          返回日曆
        </a>
      </div>
    </main>
  );
}
