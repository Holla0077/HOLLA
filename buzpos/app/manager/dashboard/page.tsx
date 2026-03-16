"use client";

import { useEffect, useState } from "react";

type Report = {
  totalRevenue: number;
  totalProfit: number;
  orderCount: number;
  lowStockProducts: { id: string; name: string; qty: number; sellPrice: number }[];
};

export default function DashboardPage() {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    fetchReport();
    const interval = setInterval(fetchReport, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchReport() {
    const res = await fetch("/api/reports/today");
    if (res.ok) setReport(await res.json());
  }

  function formatPrice(pesewas: number) {
    return `GHS ${(pesewas / 100).toFixed(2)}`;
  }

  if (!report) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Dashboard — Today</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <p className="text-sm text-gray-400">Total Sales</p>
          <p className="text-2xl font-bold text-amber-400">{formatPrice(report.totalRevenue)}</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <p className="text-sm text-gray-400">Profit</p>
          <p className="text-2xl font-bold text-green-400">{formatPrice(report.totalProfit)}</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <p className="text-sm text-gray-400">Paid Orders</p>
          <p className="text-2xl font-bold">{report.orderCount}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 text-red-400">Low Stock Alerts (≤ 10)</h2>
        {report.lowStockProducts.length === 0 ? (
          <p className="text-sm text-gray-500">All products are well stocked.</p>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                  <th className="text-left p-3">Product</th>
                  <th className="text-right p-3">Stock</th>
                  <th className="text-right p-3">Price</th>
                </tr>
              </thead>
              <tbody>
                {report.lowStockProducts.map((p) => (
                  <tr key={p.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="p-3">{p.name}</td>
                    <td className="p-3 text-right">
                      <span className={`font-semibold ${p.qty <= 5 ? "text-red-400" : "text-amber-400"}`}>
                        {p.qty}
                      </span>
                    </td>
                    <td className="p-3 text-right text-gray-400">{formatPrice(p.sellPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
