"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { UserIcon, LockClosedIcon } from "@heroicons/react/24/solid";

export default function SignInPage() {
  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setSuccess(`Welcome back, ${data.user.fullName}!`);
      setTimeout(() => { window.location.href = "/dashboard"; }, 500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="card-large w-full max-w-4xl flex flex-col lg:flex-row overflow-hidden mb-4">
        {/* Left Side */}
        <div className="hidden lg:flex lg:w-1/2 auth-panel-left items-center justify-center">
          <div className="text-center">
            <div className="icon-container mx-auto mb-6">
              <LockClosedIcon className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-3">Welcome Back!</h2>
            <p className="text-blue-100 dark:text-gray-300">
              Sign in to continue to the dashboard
            </p>
          </div>
        </div>

        {/* Right Side */}
        <div className="w-full lg:w-1/2 p-10 flex flex-col justify-center">
          <h3 className="text-2xl text-heading text-center mb-8">
            Sign In
          </h3>

          {error && (
            <div className="alert-error text-center mb-6">
              {error}
            </div>
          )}
          {success && (
            <div className="alert-success text-center mb-6">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <fieldset disabled={loading} className="space-y-5">
              <div className="relative">
                <UserIcon className="input-icon" />
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  required
                  autoComplete="username"
                  value={form.identifier}
                  onChange={handleChange}
                  placeholder="Email or Username"
                  className="input-field"
                />
              </div>

              <div className="relative">
                <LockClosedIcon className="input-icon" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Password"
                  className="input-field"
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </fieldset>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Don&apos;t have an account?{" "}
            <Link
              href="/account/signup"
              className="text-link font-medium"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

