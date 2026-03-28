"use client";

import Link from "next/link";
import HollaLogo from "@/public/brand/components/HollaLogo";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // For now we treat identifier as email.
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: identifier,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
      } else {
        // API sets the httpOnly cookie; here we just redirect
        router.push("/app/home"); // we'll create this page next
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
  <main className="min-h-screen flex items-center justify-center bg-[#070B1A] text-white px-4">
    <div className="w-full max-w-md">
      {/* Logo only (top) */}
      <div className="flex justify-center mb-8">
  <div className="scale-[4]">
    <HollaLogo variant="icon" />
  </div>
</div>

      {/* White card like PayPal */}
      <div className="bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 p-6">

        {/* ✅ PUT YOUR FORM HERE */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">
              Email / Username
            </label>
            <input
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Password</label>
            <div className="flex items-center gap-2">
              <input
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-xs px-2 py-1 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
  type="submit"
  disabled={loading}
  className="w-full rounded-lg py-3 font-semibold bg-emerald-500 hover:bg-emerald-600 text-black disabled:opacity-60"
>
  {loading ? "Logging in..." : "Log In"}
</button>
        </form>
        <div className="text-center mt-4">
          <Link href="/forgot-password" className="text-sm text-emerald-600 hover:underline">
            Forgot password?
          </Link>
        </div>
        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px bg-slate-200 w-full" />
          <span className="text-xs text-slate-400">OR</span>
          <div className="h-px bg-slate-200 w-full" />
        </div>

        {/* Sign Up button */}
        <Link
          href="/signup"
          className="block w-full text-center rounded-lg py-3 font-semibold bg-slate-100 hover:bg-slate-200 text-slate-900"
        >
          Sign Up
        </Link>

        {/* Optional helper text like PayPal */}
        
      </div>
    </div>
  </main>
);
}
