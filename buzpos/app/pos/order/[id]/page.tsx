"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

type Product = { id: string; name: string; sellPrice: number; qty: number };
type OrderItem = {
  id: string;
  qty: number;
  unitPrice: number;
  productId: string;
  product: { id: string; name: string; qty: number; sellPrice: number };
};
type Order = {
  id: string;
  status: string;
  totalRevenue: number;
  items: OrderItem[];
  user: { displayName: string };
};

export default function OrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stockErrors, setStockErrors] = useState<string[]>([]);
  const [paying, setPaying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
    fetchProducts();
  }, [orderId]);

  async function fetchOrder() {
    setLoading(true);
    const res = await fetch(`/api/orders/${orderId}`);
    if (res.ok) {
      setOrder(await res.json());
    }
    setLoading(false);
  }

  async function fetchProducts() {
    const res = await fetch("/api/products");
    if (res.ok) setProducts(await res.json());
  }

  async function addItem(productId: string) {
    setError(null);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, qty: 1 }),
    });
    if (res.ok) {
      setOrder(await res.json());
    } else {
      const d = await res.json();
      setError(d.error);
    }
  }

  async function removeItem(itemId: string) {
    setError(null);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    if (res.ok) setOrder(await res.json());
  }

  async function handlePay() {
    setPaying(true);
    setError(null);
    setStockErrors([]);

    const res = await fetch(`/api/orders/${orderId}/pay`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      if (data.details) {
        setStockErrors(data.details);
      }
      setError(data.error || "Payment failed");
    } else {
      router.push("/pos");
    }
    setPaying(false);
  }

  function formatPrice(pesewas: number) {
    return `GHS ${(pesewas / 100).toFixed(2)}`;
  }

  const orderTotal = order?.items.reduce((s, i) => s + i.unitPrice * i.qty, 0) || 0;
  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  }

  if (!order) {
    return <div className="flex items-center justify-center h-64 text-red-400">Order not found</div>;
  }

  if (order.status !== "OPEN") {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-gray-400">This order is {order.status}</p>
        <button onClick={() => router.push("/pos")} className="mt-4 text-amber-400 hover:underline">
          Back to POS
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Order #{orderId.slice(-6)}</h1>
          <p className="text-sm text-gray-400">{order.user.displayName}</p>
        </div>
        <button onClick={() => router.push("/pos")} className="text-sm text-gray-400 hover:text-white">
          Back to POS
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Add Products</h2>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm mb-3 outline-none focus:border-amber-400"
          />
          <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addItem(p.id)}
                className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-left hover:border-amber-500 transition-colors"
              >
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-amber-400 text-sm">{formatPrice(p.sellPrice)}</p>
                <p className="text-xs text-gray-500">Stock: {p.qty}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Order Items</h2>
          {order.items.length === 0 ? (
            <p className="text-gray-500 text-sm">No items yet. Add products from the left.</p>
          ) : (
            <div className="space-y-2">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{item.product.name}</p>
                    <p className="text-xs text-gray-400">
                      {item.qty} x {formatPrice(item.unitPrice)} = {formatPrice(item.unitPrice * item.qty)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => addItem(item.product.id)}
                      className="w-7 h-7 bg-gray-700 hover:bg-gray-600 rounded text-sm font-bold"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="w-7 h-7 bg-red-900/50 hover:bg-red-800 rounded text-sm font-bold text-red-400"
                    >
                      X
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-amber-400">{formatPrice(orderTotal)}</span>
            </div>
          </div>

          {error && (
            <div className="mt-3 text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-md px-3 py-2">
              <p>{error}</p>
              {stockErrors.map((e, i) => (
                <p key={i} className="text-xs mt-1">{e}</p>
              ))}
            </div>
          )}

          <button
            onClick={handlePay}
            disabled={paying || order.items.length === 0}
            className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60"
          >
            {paying ? "Processing..." : `Pay ${formatPrice(orderTotal)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
