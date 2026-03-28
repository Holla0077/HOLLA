"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HollaLogo from "@/public/brand/components/HollaLogo";

export default function SignupPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+233");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!acceptTerms) {
      setError("Please accept the terms & privacy policy to continue.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          phone,
          password,
          acceptTerms,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
      } else {
        setSuccess("Account created. Redirecting to login...");
        setTimeout(() => router.push("/login"), 1200);
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
        <div className="flex justify-center mb-6">
          {/* Use "icon" for clean PayPal vibe. Switch to "full" if you want the text too */}
          <HollaLogo variant="icon" className="scale-300" />
        </div>

        {/* White card like PayPal */}
        <div className="bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Username</label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Phone</label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                Format example: +233XXXXXXXXX
              </p>
            </div>

            <div>
              <label className="block text-sm mb-1">Password</label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-emerald-500"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" target="_blank" className="text-emerald-600 underline hover:text-emerald-700">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" target="_blank" className="text-emerald-600 underline hover:text-emerald-700">Privacy Policy</Link>.
              </span>
            </label>

            {error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            {success && (
              <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-3 font-semibold bg-emerald-500 hover:bg-emerald-600 text-black disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create Wallet"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px bg-slate-200 w-full" />
            <span className="text-xs text-slate-400">OR</span>
            <div className="h-px bg-slate-200 w-full" />
          </div>

          {/* Log In button */}
          <Link
            href="/login"
            className="block w-full text-center rounded-lg py-3 font-semibold bg-slate-100 hover:bg-slate-200 text-slate-900"
          >
            Log In
          </Link>

          {/* Optional helper text */}
          <div className="text-center mt-4">
            <button
              type="button"
              className="text-sm text-emerald-600 hover:underline"
              onClick={() => router.push("/login")}
            >
              Already have an account?
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}