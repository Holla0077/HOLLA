"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type User = { id: string; username: string; displayName: string; role: string };

export default function TopBar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  const role = user?.role;

  return (
    <nav className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-6">
        <Link href="/pos" className="text-xl font-bold text-amber-400 tracking-wide">
          BUZ POS
        </Link>
        <div className="hidden sm:flex items-center gap-4 text-sm">
          <Link href="/pos" className="hover:text-amber-300 transition-colors">
            POS
          </Link>
          {(role === "CEO" || role === "MANAGER") && (
            <>
              <Link href="/manager/dashboard" className="hover:text-amber-300 transition-colors">
                Dashboard
              </Link>
              <Link href="/manager/products" className="hover:text-amber-300 transition-colors">
                Products
              </Link>
              <Link href="/manager/stock-in" className="hover:text-amber-300 transition-colors">
                Stock In
              </Link>
            </>
          )}
          {role === "CEO" && (
            <Link href="/ceo/users" className="hover:text-amber-300 transition-colors">
              Users
            </Link>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <span className="text-xs text-gray-400">
            {user.displayName} <span className="text-amber-400">({user.role})</span>
          </span>
        )}
        <button
          onClick={handleLogout}
          className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
