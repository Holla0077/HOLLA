"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Product = { id: string; name: string; sellPrice: number; qty: number };
type OrderItem = { id: string; qty: number; unitPrice: number; productId: string };
type Order = { id: string; status: string; createdAt: string; items: OrderItem[]; user: { displayName: string } };

export default function PosPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  async function fetchProducts() {
    const res = await fetch("/api/products");
    if (res.ok) setProducts(await res.json());
  }

  async function fetchOrders() {
    const res = await fetch("/api/orders?status=OPEN");
    if (res.ok) setOrders(await res.json());
  }

  async function createOrder() {
    setCreating(true);
    const res = await fetch("/api/orders", { method: "POST" });
    if (res.ok) {
      const order = await res.json();
      router.push(`/pos/order/${order.id}`);
    }
    setCreating(false);
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  function formatPrice(pesewas: number) {
    return `GHS ${(pesewas / 100).toFixed(2)}`;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Point of Sale</h1>
        <button
          onClick={createOrder}
          disabled={creating}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-60"
        >
          {creating ? "Creating..." : "+ New Order"}
        </button>
      </div>

      {orders.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-amber-400">Open Orders</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {orders.map((o) => (
              <button
                key={o.id}
                onClick={() => router.push(`/pos/order/${o.id}`)}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-left hover:border-amber-500 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-400">Order #{o.id.slice(-6)}</p>
                    <p className="text-xs text-gray-500">{o.user.displayName}</p>
                  </div>
                  <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">
                    {o.items.length} items
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(o.createdAt).toLocaleTimeString()}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Products</h2>
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm mb-4 outline-none focus:border-amber-400 transition-colors"
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center"
            >
              <p className="font-medium text-sm">{p.name}</p>
              <p className="text-amber-400 font-semibold mt-1">{formatPrice(p.sellPrice)}</p>
              <p className="text-xs text-gray-500 mt-1">Stock: {p.qty}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
