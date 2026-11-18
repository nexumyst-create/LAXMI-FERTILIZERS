import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Order } from '../../types';

function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (typeof val === 'string') return new Date(val);
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return (val as { toDate: () => Date }).toDate();
  }
  return new Date();
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadExcelTable(filename: string, headers: string[], rows: (string | number)[][]) {
  const tableHtml = `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
  const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const CHART_COLORS = ['#176B3A', '#4CAF50', '#F5B82E', '#0F766E', '#65A30D', '#B45309'];

export const AdminOverviewPanel: React.FC = () => {
  const { allOrders, products, allUsers, categories } = useStore();
  const [chartWindow, setChartWindow] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  const stats = useMemo(() => {
    const validOrders = allOrders.filter((o) => o.orderStatus !== 'CANCELLED' && o.orderStatus !== 'REFUNDED');
    const totalRevenue = validOrders.reduce((s, o) => s + (o.grandTotal || 0), 0);
    const pendingOrders = allOrders.filter((o) =>
      ['ORDER_PLACED', 'PAYMENT_CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(
        o.orderStatus
      )
    ).length;
    const completedOrders = allOrders.filter((o) => o.orderStatus === 'DELIVERED').length;
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStockAlert).length;
    const outOfStock = products.filter((p) => p.stock <= 0).length;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthStr = now.toISOString().slice(0, 7);

    const salesToday = validOrders
      .filter((o) => toDate(o.createdAt).toISOString().slice(0, 10) === todayStr)
      .reduce((s, o) => s + o.grandTotal, 0);
    const monthlySales = validOrders
      .filter((o) => toDate(o.createdAt).toISOString().slice(0, 7) === monthStr)
      .reduce((s, o) => s + o.grandTotal, 0);

    return {
      totalRevenue,
      totalOrders: allOrders.length,
      totalProducts: products.length,
      totalCustomers: allUsers.length,
      pendingOrders,
      completedOrders,
      lowStock,
      outOfStock,
      salesToday,
      monthlySales,
    };
  }, [allOrders, products, allUsers]);

  const timeSeriesData = useMemo(() => {
    const map = new Map<string, number>();
    allOrders
      .filter((o) => o.orderStatus !== 'CANCELLED')
      .forEach((o) => {
        const d = toDate(o.createdAt);
        let key = d.toISOString().slice(0, 10);
        if (chartWindow === 'monthly') key = d.toISOString().slice(0, 7);
        if (chartWindow === 'yearly') key = String(d.getFullYear());
        if (chartWindow === 'weekly') {
          const wk = Math.ceil(d.getDate() / 7);
          key = `${d.toISOString().slice(0, 7)} W${wk}`;
        }
        map.set(key, (map.get(key) || 0) + o.grandTotal);
      });
    const arr = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, revenue]) => ({ period, revenue }));
    return arr.length > 0 ? arr : [{ period: new Date().toISOString().slice(0, 7), revenue: 0 }];
  }, [allOrders, chartWindow]);

  const topProductsData = useMemo(() => {
    const counts = new Map<string, { name: string; sales: number }>();
    allOrders.forEach((o) => {
      o.items.forEach((item) => {
        const prev = counts.get(item.productId) || { name: item.productName.slice(0, 22), sales: 0 };
        prev.sales += item.unitPrice * item.qty;
        counts.set(item.productId, prev);
      });
    });
    const sorted = Array.from(counts.values()).sort((a, b) => b.sales - a.sales).slice(0, 6);
    return sorted.length > 0
      ? sorted
      : products.slice(0, 5).map((p) => ({ name: p.name.slice(0, 20), sales: 0 }));
  }, [allOrders, products]);

  const categorySalesData = useMemo(() => {
    const counts = new Map<string, number>();
    allOrders.forEach((o) => {
      o.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const catName = prod?.categoryName || 'Other';
        counts.set(catName, (counts.get(catName) || 0) + item.unitPrice * item.qty);
      });
    });
    const list = Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
    return list.length > 0
      ? list
      : categories.slice(0, 4).map((c) => ({ name: c.name, value: 1 }));
  }, [allOrders, products, categories]);

  const kpis = [
    { label: 'Total Revenue', val: `₹${stats.totalRevenue.toLocaleString('en-IN')}` },
    { label: 'Total Orders', val: stats.totalOrders },
    { label: 'Total Products', val: stats.totalProducts },
    { label: 'Total Customers', val: stats.totalCustomers },
    { label: 'Pending Orders', val: stats.pendingOrders },
    { label: 'Completed Orders', val: stats.completedOrders },
    { label: 'Low Stock Products', val: stats.lowStock },
    { label: 'Out of Stock', val: stats.outOfStock },
    { label: 'Sales Today', val: `₹${stats.salesToday.toLocaleString('en-IN')}` },
    { label: 'Monthly Sales', val: `₹${stats.monthlySales.toLocaleString('en-IN')}` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="text-xs text-neutral-500 font-medium">{k.label}</p>
            <p className="font-display text-xl font-bold text-[#252525] mt-1 tabular-nums">{k.val}</p>
          </div>
        ))}
      </div>

      {/* Revenue Over Time Chart */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-display font-bold text-base text-[#252525]">Sales & Revenue Trend</h2>
          <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg text-xs font-semibold">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((w) => (
              <button
                key={w}
                onClick={() => setChartWindow(w)}
                className={`px-3 py-1 rounded-md capitalize ${
                  chartWindow === w ? 'bg-white text-[#176B3A] shadow-xs' : 'text-neutral-600'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#176B3A" strokeWidth={2.5} name="Revenue (₹)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h2 className="font-display font-bold text-base text-[#252525] mb-4">Top Selling Products</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="sales" fill="#4CAF50" radius={[4, 4, 0, 0]} name="Sales (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h2 className="font-display font-bold text-base text-[#252525] mb-4">Category-wise Sales</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categorySalesData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {categorySalesData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminReportsPanel: React.FC = () => {
  const { allOrders, products, allUsers } = useStore();
  const [reportType, setReportType] = useState<
    'sales' | 'gst' | 'inventory' | 'products' | 'customers' | 'profit'
  >('sales');
  const [fromDate, setFromDate] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');

  const filteredOrders = useMemo(() => {
    return allOrders.filter((o) => {
      const iso = toDate(o.createdAt).toISOString().slice(0, 10);
      if (fromDate && iso < fromDate) return false;
      if (toDateFilter && iso > toDateFilter) return false;
      return true;
    });
  }, [allOrders, fromDate, toDateFilter]);

  const financialSummary = useMemo(() => {
    const grossRevenue = filteredOrders
      .filter((o) => o.orderStatus !== 'CANCELLED' && o.orderStatus !== 'REFUNDED')
      .reduce((s, o) => s + o.grandTotal, 0);
    const gstCollected = filteredOrders
      .filter((o) => o.orderStatus !== 'CANCELLED' && o.orderStatus !== 'REFUNDED')
      .reduce((s, o) => s + o.gstTotal, 0);
    const discountsGiven = filteredOrders.reduce((s, o) => s + (o.discountTotal || 0), 0);
    const refundsTotal = filteredOrders
      .filter((o) => o.orderStatus === 'REFUNDED')
      .reduce((s, o) => s + o.grandTotal, 0);

    let configuredCostTotal = 0;
    let hasMissingCost = false;
    filteredOrders
      .filter((o) => o.orderStatus !== 'CANCELLED' && o.orderStatus !== 'REFUNDED')
      .forEach((o: Order) => {
        o.items.forEach((item) => {
          const p = products.find((pr) => pr.id === item.productId);
          if (p && typeof p.costPrice === 'number' && p.costPrice > 0) {
            configuredCostTotal += p.costPrice * item.qty;
          } else {
            hasMissingCost = true;
          }
        });
      });

    const netRevenueExTax = Math.max(0, grossRevenue - gstCollected);
    const actualProfit = hasMissingCost ? null : netRevenueExTax - configuredCostTotal;

    return { grossRevenue, gstCollected, discountsGiven, refundsTotal, configuredCostTotal, actualProfit, hasMissingCost };
  }, [filteredOrders, products]);

  const reportTable = useMemo(() => {
    if (reportType === 'gst') {
      return {
        headers: ['Order #', 'Customer', 'Taxable Value (₹)', 'CGST (₹)', 'SGST (₹)', 'Total (₹)'],
        rows: filteredOrders.map((o) => {
          const taxable = Math.max(0, o.grandTotal - o.deliveryCharge - o.gstTotal);
          const cgst = Math.round(o.gstTotal / 2);
          const sgst = o.gstTotal - cgst;
          return [o.orderNumber, o.customerName, taxable, cgst, sgst, o.grandTotal];
        }),
      };
    }
    if (reportType === 'inventory') {
      return {
        headers: ['SKU', 'Product', 'Category', 'Batch', 'Expiry', 'Stock', 'Min Alert'],
        rows: products.map((p) => [
          p.sku,
          p.name,
          p.categoryName,
          p.batchNumber || '-',
          p.expiryDate || '-',
          p.stock,
          p.minStockAlert,
        ]),
      };
    }
    if (reportType === 'products') {
      const map = new Map<string, { name: string; qty: number; rev: number }>();
      filteredOrders.forEach((o) =>
        o.items.forEach((i) => {
          const cur = map.get(i.productId) || { name: i.productName, qty: 0, rev: 0 };
          cur.qty += i.qty;
          cur.rev += i.unitPrice * i.qty;
          map.set(i.productId, cur);
        })
      );
      return {
        headers: ['Product', 'Units Sold', 'Gross Sales (₹)'],
        rows: Array.from(map.values()).map((v) => [v.name, v.qty, v.rev]),
      };
    }
    if (reportType === 'customers') {
      return {
        headers: ['Customer', 'Email', 'Phone', 'District', 'Orders', 'Total Spend (₹)'],
        rows: allUsers.map((u) => {
          const uOrders = filteredOrders.filter((o) => o.userId === u.uid);
          const spend = uOrders.reduce((s, o) => s + o.grandTotal, 0);
          return [u.fullName, u.email, u.phone || '-', u.district || '-', uOrders.length, spend];
        }),
      };
    }
    return {
      headers: ['Order #', 'Date', 'Customer', 'Payment', 'Status', 'Discount (₹)', 'GST (₹)', 'Grand Total (₹)'],
      rows: filteredOrders.map((o) => [
        o.orderNumber,
        toDate(o.createdAt).toISOString().slice(0, 10),
        o.customerName,
        `${o.paymentMethod} (${o.paymentStatus})`,
        o.orderStatus,
        o.discountTotal || 0,
        o.gstTotal,
        o.grandTotal,
      ]),
    };
  }, [reportType, filteredOrders, products, allUsers]);

  return (
    <div className="space-y-6">
      {/* Explicit Revenue vs Tax vs Discounts vs Refunds vs Profit Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Gross Revenue</p>
          <p className="font-display text-lg font-bold tabular-nums">
            ₹{financialSummary.grossRevenue.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Included GST Tax</p>
          <p className="font-display text-lg font-bold tabular-nums">
            ₹{financialSummary.gstCollected.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Discounts Given</p>
          <p className="font-display text-lg font-bold tabular-nums">
            ₹{financialSummary.discountsGiven.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Refunds</p>
          <p className="font-display text-lg font-bold tabular-nums">
            ₹{financialSummary.refundsTotal.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Net Profit (Ex-Tax - Cost)</p>
          <p className="font-display text-lg font-bold tabular-nums text-[#176B3A]">
            {financialSummary.actualProfit !== null
              ? `₹${financialSummary.actualProfit.toLocaleString('en-IN')}`
              : 'Configure Product Costs'}
          </p>
        </div>
      </div>

      {/* Filters & Exports */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as typeof reportType)}
              className="border border-neutral-200 rounded-lg px-3 py-2 font-semibold bg-white"
            >
              <option value="sales">Sales & Payment Report</option>
              <option value="gst">GST Tax Report</option>
              <option value="products">Product Sales Report</option>
              <option value="customers">Customer Purchase Report</option>
              <option value="inventory">Inventory & Expiry Report</option>
            </select>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-neutral-200 rounded-lg px-2.5 py-2"
            />
            <span className="text-neutral-400">to</span>
            <input
              type="date"
              value={toDateFilter}
              onChange={(e) => setToDateFilter(e.target.value)}
              className="border border-neutral-200 rounded-lg px-2.5 py-2"
            />
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => downloadCsv(`laksmi-${reportType}-report.csv`, reportTable.headers, reportTable.rows)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 font-semibold hover:bg-neutral-50"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <button
              onClick={() =>
                downloadExcelTable(`laksmi-${reportType}-report.xls`, reportTable.headers, reportTable.rows)
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 font-semibold hover:bg-neutral-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#176B3A] text-white font-semibold"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / PDF
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-y border-neutral-200 bg-neutral-50 text-left">
                {reportTable.headers.map((h) => (
                  <th key={h} className="py-2.5 px-3 font-semibold text-neutral-700">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {reportTable.rows.length === 0 ? (
                <tr>
                  <td colSpan={reportTable.headers.length} className="py-8 text-center text-neutral-500">
                    No records matched the selected report range.
                  </td>
                </tr>
              ) : (
                reportTable.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#F3F8F1]/50">
                    {row.map((cell, ci) => (
                      <td key={ci} className="py-2.5 px-3 tabular-nums">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
