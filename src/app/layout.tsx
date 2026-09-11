import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

// System font stack (globals.css) — no remote font fetch needed.

export const metadata: Metadata = {
  title: "LLD Coach",
  description: "Practice low-level design and see whether your thinking is actually improving.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-background text-text antialiased">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto max-w-5xl px-6 py-3.5 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-text hover:text-accent transition">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
                <rect x="1" y="1" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
                <path d="M6 13.5 9 6.5M9 6.5 6 6.5M9 6.5 12 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm font-semibold tracking-tight">LLD Coach</span>
            </Link>
            <p className="text-xs text-muted hidden sm:block">
              Evaluated against a rubric, not a reference solution
            </p>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
