"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  active: boolean;
  createdAt: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", displayName: "", role: "WAITER", credential: "" });
  const [error, setError] = useState<string | null>(null);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetCredential, setResetCredential] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const body: {
      username: string;
      displayName: string;
      role: string;
      pin?: string;
      password?: string;
    } = {
      username: form.username,
      displayName: form.displayName,
      role: form.role,
    };

    if (form.role === "WAITER") {
      body.pin = form.credential;
    } else {
      body.password = form.credential;
    }

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowForm(false);
      setForm({ username: "", displayName: "", role: "WAITER", credential: "" });
      fetchUsers();
    } else {
      const d = await res.json();
      setError(d.error || "Failed");
    }
  }

  async function toggleActive(user: User) {
    const res = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, active: !user.active }),
    });
    if (res.ok) {
      fetchUsers();
    } else {
      const d = await res.json();
      alert(d.error || "Failed");
    }
  }

  async function handleResetCredential() {
    if (!resetUserId || !resetCredential) return;
    const user = users.find((u) => u.id === resetUserId);
    if (!user) return;

    const body: { id: string; pin?: string; password?: string } = { id: resetUserId };
    if (user.role === "WAITER") {
      body.pin = resetCredential;
    } else {
      body.password = resetCredential;
    }

    const res = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setResetUserId(null);
      setResetCredential("");
    } else {
      const d = await res.json();
      alert(d.error || "Failed");
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button
          onClick={() => { setShowForm(!showForm); setError(null); }}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6 py-2 rounded-lg transition-colors"
        >
          {showForm ? "Cancel" : "+ Add User"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Username</label>
              <input
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Display Name</label>
              <input
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Role</label>
              <select
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value, credential: "" })}
              >
                <option value="WAITER">WAITER</option>
                <option value="MANAGER">MANAGER</option>
                <option value="CEO">CEO</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {form.role === "WAITER" ? "PIN (digits)" : "Password"}
              </label>
              <input
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400"
                type={form.role === "WAITER" ? "text" : "password"}
                value={form.credential}
                onChange={(e) => setForm({ ...form, credential: e.target.value })}
                required
                placeholder={form.role === "WAITER" ? "e.g. 1234" : ""}
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-md px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6 py-2 rounded-lg text-sm"
          >
            Create User
          </button>
        </form>
      )}

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="text-left p-3">Username</th>
              <th className="text-left p-3">Display Name</th>
              <th className="text-center p-3">Role</th>
              <th className="text-center p-3">Status</th>
              <th className="text-center p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="p-3 font-medium">{u.username}</td>
                <td className="p-3">{u.displayName}</td>
                <td className="p-3 text-center">
                  <span className="text-xs px-2 py-1 rounded bg-gray-700">{u.role}</span>
                </td>
                <td className="p-3 text-center">
                  <span className={`text-xs px-2 py-1 rounded ${u.active ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>
                    {u.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3 text-center space-x-2">
                  <button onClick={() => toggleActive(u)} className="text-xs text-amber-400 hover:underline">
                    {u.active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => { setResetUserId(u.id); setResetCredential(""); }}
                    className="text-xs text-gray-400 hover:underline"
                  >
                    Reset Cred
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resetUserId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4">Reset Credential</h2>
            <p className="text-sm text-gray-400 mb-3">
              {users.find((u) => u.id === resetUserId)?.role === "WAITER"
                ? "Enter new PIN:"
                : "Enter new password:"}
            </p>
            <input
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400"
              type="text"
              value={resetCredential}
              onChange={(e) => setResetCredential(e.target.value)}
            />
            <div className="mt-4 flex gap-3 justify-end">
              <button onClick={() => setResetUserId(null)} className="px-4 py-2 text-sm text-gray-400">
                Cancel
              </button>
              <button
                onClick={handleResetCredential}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg text-sm"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
