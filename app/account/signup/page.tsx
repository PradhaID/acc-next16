"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { UserIcon, LockClosedIcon, EnvelopeIcon } from "@heroicons/react/24/solid";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    fullName: "",
    email: "",
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
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setSuccess(data.message);
      setTimeout(() => { window.location.href = data.redirectUrl; }, 1000);
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
              <UserIcon className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-3">Join Us!</h2>
            <p className="text-blue-100 dark:text-gray-300">
              Create an account to get started
            </p>
          </div>
        </div>

        {/* Right Side */}
        <div className="w-full lg:w-1/2 p-10 flex flex-col justify-center">
          <h3 className="text-2xl text-heading text-center mb-8">
            Create account
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
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Username"
                  className="input-field"
                />
              </div>

              <div className="relative">
                <UserIcon className="input-icon" />
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  autoComplete="name"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Full Name"
                  className="input-field"
                />
              </div>

              <div className="relative">
                <EnvelopeIcon className="input-icon" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email"
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
                  minLength={6}
                  autoComplete="new-password"
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
                {loading ? "Creating account..." : "Create account"}
              </button>
            </fieldset>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link
              href="/account/signin"
              className="text-link font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
