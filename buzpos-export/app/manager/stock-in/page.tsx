"use client";

import { useEffect, useState } from "react";

type Product = { id: string; name: string; sellPrice: number; costPrice?: number; qty: number };

export default function StockInPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const res = await fetch("/api/products");
    if (res.ok) setProducts(await res.json());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    const body: { productId: string; qty: number; costPrice?: number } = {
      productId,
      qty: parseInt(qty),
    };
    if (costPrice) body.costPrice = Math.round(parseFloat(costPrice) * 100);

    const res = await fetch("/api/stock-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const updated = await res.json();
      setMessage({ type: "success", text: `Added ${qty} units. New stock: ${updated.qty}` });
      setQty("");
      setCostPrice("");
      fetchProducts();
    } else {
      const d = await res.json();
      setMessage({ type: "error", text: d.error || "Failed" });
    }
    setSubmitting(false);
  }

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Stock In</h1>

      <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Product</label>
          <select
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-amber-400"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
          >
            <option value="">Select a product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (current stock: {p.qty})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Quantity to add</label>
          <input
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-amber-400"
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            New Cost Price (GHS) — optional
          </label>
          <input
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-amber-400"
            type="number"
            step="0.01"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            placeholder={
              selectedProduct?.costPrice !== undefined
                ? `Current: GHS ${(selectedProduct.costPrice / 100).toFixed(2)}`
                : ""
            }
          />
        </div>

        {message && (
          <p
            className={`text-sm px-3 py-2 rounded-md border ${
              message.type === "success"
                ? "text-green-400 bg-green-950/40 border-green-800"
                : "text-red-400 bg-red-950/40 border-red-800"
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold py-3 rounded-lg transition-colors disabled:opacity-60"
        >
          {submitting ? "Adding..." : "Add Stock"}
        </button>
      </form>
    </div>
  );
}
