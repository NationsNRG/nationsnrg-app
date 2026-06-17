"use client";

export default function GlobalError({
  error,
}: {
  error: Error;
}) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="rounded-xl border border-red-800 bg-red-950 p-6 max-w-md">
        <h1 className="text-lg font-semibold">Something broke</h1>
        <p className="text-sm text-red-300 mt-2">{error.message}</p>
      </div>
    </div>
  );
}