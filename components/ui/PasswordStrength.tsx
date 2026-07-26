"use client";

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

interface Rule {
  label: string;
  test: (p: string) => boolean;
}

const RULES: Rule[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "Contains uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "Contains lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "Contains a number", test: (p) => /[0-9]/.test(p) },
  { label: "Contains special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function getScore(password: string): number {
  return RULES.filter((r) => r.test(password)).length;
}

function getLevel(score: number): { label: string; color: string; barColor: string } {
  if (score <= 1) return { label: "Weak", color: "text-red-500", barColor: "bg-red-500" };
  if (score <= 2) return { label: "Fair", color: "text-emerald-400", barColor: "bg-emerald-400" };
  if (score <= 3) return { label: "Good", color: "text-emerald-500", barColor: "bg-emerald-500" };
  if (score <= 4) return { label: "Strong", color: "text-emerald-500", barColor: "bg-emerald-500" };
  return { label: "Very Strong", color: "text-emerald-600", barColor: "bg-emerald-600" };
}

export default function PasswordStrength({ password, className = "" }: PasswordStrengthProps) {
  if (!password) return null;

  const score = getScore(password);
  const level = getLevel(score);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Segmented bar */}
      <div className="space-y-1.5">
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= score ? level.barColor : "bg-stone-200 dark:bg-stone-700"
              }`}
            />
          ))}
        </div>
        <p className={`text-[10px] font-bold ml-1 ${level.color}`}>
          {level.label}
        </p>
      </div>

      {/* Checklist */}
      <div className="space-y-1.5">
        {RULES.map((rule, i) => {
          const passed = rule.test(password);
          return (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              {passed ? (
                <svg className="h-3.5 w-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5 text-stone-300 dark:text-stone-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className={passed ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-stone-400 dark:text-stone-500"}>
                {rule.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
