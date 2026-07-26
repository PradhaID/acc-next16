import Link from "next/link";

interface ErrorPageProps {
  code: number;
  title: string;
  description: string;
  action?: { label: string; href: string };
  icon: React.ReactNode;
}

export default function ErrorPage({ code, title, description, action, icon }: ErrorPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-950 px-4">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-500 to-emerald-500 text-white shadow-lg shadow-emerald-500/20">
          {icon}
        </div>

        <span className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
          Error {code}
        </span>

        <h1 className="mb-3 text-2xl font-bold text-stone-900 dark:text-white">
          {title}
        </h1>

        <p className="mb-8 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          {description}
        </p>

        {action && (
          <Link
            href={action.href}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/10 transition-all hover:scale-105 hover:from-emerald-600 hover:to-emerald-700 active:scale-95"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 9-3 3m0 0 3 3m-3-3h7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}

export function NotFoundIcon() {
  return (
    <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

export function ForbiddenIcon() {
  return (
    <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

export function MethodNotAllowedIcon() {
  return (
    <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  );
}
