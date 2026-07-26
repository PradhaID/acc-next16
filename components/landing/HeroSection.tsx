import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="text-center lg:text-left lg:grid lg:grid-cols-12 lg:gap-8 items-center">
      <div className="lg:col-span-6 flex flex-col justify-center">
        <div className="inline-flex mx-auto lg:mx-0 w-fit items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50/50 px-3 py-1 text-xs font-semibold text-orange-750 backdrop-blur-sm dark:border-emerald-500/20 dark:bg-emerald-950/30 dark:text-orange-450">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          Next.js 16 + Tailwind CSS v4 + MongoDB
        </div>

        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-stone-900 dark:text-white sm:text-5xl lg:text-6xl leading-[1.1]">
          The Complete{" "}
          <span className="bg-gradient-to-r from-emerald-500 via-emerald-500 to-emerald-500 bg-clip-text text-transparent dark:from-emerald-400 dark:via-orange-450 dark:to-rose-450">
            SaaS Boilerplate
          </span>{" "}
          for Modern Web Apps
        </h1>

        <p className="mt-6 text-lg leading-8 text-stone-600 dark:text-stone-400 max-w-2xl mx-auto lg:mx-0">
          Everything you need to build production-ready applications — from
          authentication and granular RBAC to a full CMS, media library, public
          REST API, and a complete system administration panel.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-4">
          <Link
            href="/account/signup"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 font-semibold text-white shadow-md shadow-emerald-500/15 transition hover:from-emerald-600 hover:to-emerald-700"
          >
            Get Started Now
          </Link>
          <a
            href="#features"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-stone-200 bg-white px-6 font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 dark:border-stone-700/50 dark:bg-stone-900/80 dark:text-stone-300 dark:hover:bg-stone-800/80"
          >
            Explore Features
          </a>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs text-stone-500 dark:text-stone-400">
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Credentials + OTP Auth
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Full RBAC System
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            CMS + REST API
          </span>
        </div>
      </div>

      {/* Enhanced Dashboard Mock */}
      <div id="dashboard-preview" className="mt-16 lg:mt-0 lg:col-span-6 flex justify-center w-full">
        <div className="relative w-full max-w-[580px] overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-50/50 p-3 shadow-xl dark:border-stone-700/50 dark:bg-stone-900/80 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:border-emerald-500/30 group">
          <div className="absolute -inset-px -z-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-emerald-500 to-emerald-500 opacity-0 group-hover:opacity-10 transition-opacity duration-500" />

          {/* Browser Chrome */}
          <div className="flex items-center gap-2 border-b border-stone-200/80 pb-3 px-2 dark:border-stone-700/50">
            <span className="h-3 w-3 rounded-full bg-red-450/80 dark:bg-red-500/40" />
            <span className="h-3 w-3 rounded-full bg-yellow-455/80 dark:bg-yellow-500/40" />
            <span className="h-3 w-3 rounded-full bg-green-450/80 dark:bg-green-500/40" />
            <div className="ml-4 flex h-6 w-full max-w-[340px] items-center rounded-lg bg-stone-200/60 px-3 text-[10px] text-stone-500 dark:bg-stone-800/40 dark:text-stone-400 truncate">
              localhost:3000/dashboard
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="flex h-[360px] pt-3 gap-3 overflow-hidden text-xs">
            {/* Sidebar */}
            <div className="hidden md:flex w-40 shrink-0 flex-col gap-1 border-r border-stone-200/60 pr-3 dark:border-stone-700/50">
              <div className="h-7 w-full rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-2 px-2.5 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                Overview
              </div>
              <div className="h-7 w-full rounded-md text-stone-500 dark:text-stone-400 flex items-center gap-2 px-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-transparent" />
                Content
              </div>
              <div className="h-6 w-full rounded-md text-stone-400 dark:text-stone-500 flex items-center gap-2 px-2.5 pl-6 text-[10px]">
                Posts
              </div>
              <div className="h-6 w-full rounded-md text-stone-400 dark:text-stone-500 flex items-center gap-2 px-2.5 pl-6 text-[10px]">
                Pages
              </div>
              <div className="h-6 w-full rounded-md text-stone-400 dark:text-stone-500 flex items-center gap-2 px-2.5 pl-6 text-[10px]">
                Categories
              </div>
              <div className="h-7 w-full rounded-md text-stone-500 dark:text-stone-400 flex items-center gap-2 px-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-transparent" />
                Media
              </div>
              <div className="h-7 w-full rounded-md text-stone-500 dark:text-stone-400 flex items-center gap-2 px-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-transparent" />
                Users
              </div>
              <div className="h-7 w-full rounded-md text-stone-500 dark:text-stone-400 flex items-center gap-2 px-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-transparent" />
                Groups
              </div>
              <div className="h-7 w-full rounded-md text-stone-500 dark:text-stone-400 flex items-center gap-2 px-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-transparent" />
                Settings
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col gap-2.5 min-w-0 pr-1">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-stone-100">Welcome, Admin</h4>
                  <p className="text-[10px] text-stone-500">System overview at a glance.</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  All Systems OK
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-1.5">
                <div className="rounded-lg border border-stone-200/80 bg-white p-2 dark:border-stone-700/50 dark:bg-stone-900/80">
                  <span className="text-[8px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">Users</span>
                  <span className="text-sm font-bold text-stone-800 dark:text-stone-100 block mt-0.5">1,284</span>
                </div>
                <div className="rounded-lg border border-stone-200/80 bg-white p-2 dark:border-stone-700/50 dark:bg-stone-900/80">
                  <span className="text-[8px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">Posts</span>
                  <span className="text-sm font-bold text-stone-800 dark:text-stone-100 block mt-0.5">342</span>
                </div>
                <div className="rounded-lg border border-stone-200/80 bg-white p-2 dark:border-stone-700/50 dark:bg-stone-900/80">
                  <span className="text-[8px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">Groups</span>
                  <span className="text-sm font-bold text-stone-800 dark:text-stone-100 block mt-0.5">18</span>
                </div>
                <div className="rounded-lg border border-stone-200/80 bg-white p-2 dark:border-stone-700/50 dark:bg-stone-900/80">
                  <span className="text-[8px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">Pages</span>
                  <span className="text-sm font-bold text-stone-800 dark:text-stone-100 block mt-0.5">56</span>
                </div>
              </div>

              {/* Content Table */}
              <div className="flex-1 rounded-xl border border-stone-200/80 bg-white dark:border-stone-700/50 dark:bg-stone-900/80 overflow-hidden flex flex-col shadow-sm">
                <div className="bg-stone-50 border-b border-stone-200/80 px-3 py-1.5 flex justify-between items-center dark:bg-stone-800/40 dark:border-stone-700/50">
                  <span className="font-semibold text-stone-700 dark:text-stone-300 text-[10px]">Recent Content</span>
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400">View All</span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-700/30">
                  <div className="px-3 py-1.5 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-stone-800 dark:text-stone-200 truncate">Getting Started Guide</p>
                      <p className="text-[9px] text-stone-400">Post &middot; 2 hours ago</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Published</span>
                  </div>
                  <div className="px-3 py-1.5 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-stone-800 dark:text-stone-200 truncate">About Us</p>
                      <p className="text-[9px] text-stone-400">Page &middot; 5 hours ago</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Published</span>
                  </div>
                  <div className="px-3 py-1.5 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-stone-800 dark:text-stone-200 truncate">Product Launch Draft</p>
                      <p className="text-[9px] text-stone-400">Post &middot; 1 day ago</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Draft</span>
                  </div>
                  <div className="px-3 py-1.5 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-stone-800 dark:text-stone-200 truncate">Privacy Policy</p>
                      <p className="text-[9px] text-stone-400">Page &middot; 3 days ago</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Published</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
