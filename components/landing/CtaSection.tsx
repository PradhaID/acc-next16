import Link from "next/link";

export default function CtaSection() {
  return (
    <section className="mt-32">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-6 py-16 text-center shadow-xl sm:px-16">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000,transparent)]" />
        <div className="relative">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Ready to Build Your Next Big Idea?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/90">
            Skip weeks of boilerplate setup. Get a production-ready foundation
            with auth, CMS, RBAC, API, and admin — deployed in minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/account/signup"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 font-semibold text-orange-600 shadow-md transition hover:bg-stone-50"
            >
              Get Started Free
            </Link>
            <Link
              href="/account/signin"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-white/40 px-8 font-semibold text-white transition hover:bg-white/10"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
