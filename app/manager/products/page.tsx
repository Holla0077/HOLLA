"use client";

import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  sellPrice: number;
  costPrice?: number;
  qty: number;
  active: boolean;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", sellPrice: "", costPrice: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const res = await fetch("/api/products");
    if (res.ok) setProducts(await res.json());
  }

  function openAdd() {
    setEditId(null);
    setForm({ name: "", sellPrice: "", costPrice: "" });
    setError(null);
    setShowModal(true);
  }

  function openEdit(p: Product) {
    setEditId(p.id);
    setForm({
      name: p.name,
      sellPrice: (p.sellPrice / 100).toFixed(2),
      costPrice: p.costPrice !== undefined ? (p.costPrice / 100).toFixed(2) : "",
    });
    setError(null);
    setShowModal(true);
  }

  async function handleSave() {
    setError(null);
    const data: { name: string; sellPrice: number; costPrice: number; id?: string } = {
      name: form.name,
      sellPrice: Math.round(parseFloat(form.sellPrice) * 100),
      costPrice: Math.round(parseFloat(form.costPrice) * 100),
    };

    if (isNaN(data.sellPrice) || isNaN(data.costPrice)) {
      setError("Invalid price values");
      return;
    }

    let res;
    if (editId) {
      res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, ...data }),
      });
    } else {
      res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }

    if (res.ok) {
      setShowModal(false);
      fetchProducts();
    } else {
      const d = await res.json();
      setError(d.error || "Failed");
    }
  }

  async function toggleActive(p: Product) {
    await fetch("/api/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, active: !p.active }),
    });
    fetchProducts();
  }

  function formatPrice(pesewas: number) {
    return `GHS ${(pesewas / 100).toFixed(2)}`;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <button
          onClick={openAdd}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6 py-2 rounded-lg transition-colors"
        >
          + Add Product
        </button>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="text-left p-3">Name</th>
              <th className="text-right p-3">Sell Price</th>
              <th className="text-right p-3">Cost Price</th>
              <th className="text-right p-3">Stock</th>
              <th className="text-center p-3">Status</th>
              <th className="text-center p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 text-right text-amber-400">{formatPrice(p.sellPrice)}</td>
                <td className="p-3 text-right text-gray-400">
                  {p.costPrice !== undefined ? formatPrice(p.costPrice) : "—"}
                </td>
                <td className="p-3 text-right">{p.qty}</td>
                <td className="p-3 text-center">
                  <span className={`text-xs px-2 py-1 rounded ${p.active ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>
                    {p.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3 text-center space-x-2">
                  <button onClick={() => openEdit(p)} className="text-xs text-amber-400 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => toggleActive(p)} className="text-xs text-gray-400 hover:underline">
                    {p.active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{editId ? "Edit Product" : "Add Product"}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Sell Price (GHS)</label>
                <input
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400"
                  type="number"
                  step="0.01"
                  value={form.sellPrice}
                  onChange={(e) => setForm({ ...form, sellPrice: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Cost Price (GHS)</label>
                <input
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400"
                  type="number"
                  step="0.01"
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                />
              </div>
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-md px-3 py-2">
                {error}
              </p>
            )}
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
