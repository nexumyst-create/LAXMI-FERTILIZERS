import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { Download, Eye, EyeOff, Printer, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react';
import { createAdminAuthAccount, db, handleFirestoreError, OperationType } from '../../firebase';
import { useStore } from '../../context/StoreContext';
import { AdminUserRecord, AuditLog, Order, OrderStatus, PaymentStatus, StoreSettings } from '../../types';

const ALL_STATUSES: OrderStatus[] = [
  'ORDER_PLACED',
  'PAYMENT_CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];

export const AdminOrdersPanel: React.FC = () => {
  const { allOrders, showToast, logAdminAudit } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [payFilter, setPayFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [courier, setCourier] = useState('');
  const [tracking, setTracking] = useState('');

  const filtered = useMemo(() => {
    return allOrders.filter((o) => {
      if (statusFilter !== 'ALL' && o.orderStatus !== statusFilter) return false;
      if (payFilter !== 'ALL' && o.paymentStatus !== payFilter) return false;
      if (dateFilter) {
        const dt =
          o.createdAt && typeof o.createdAt === 'object' && 'toDate' in o.createdAt
            ? (o.createdAt as { toDate: () => Date }).toDate().toISOString().slice(0, 10)
            : '';
        if (dt !== dateFilter) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allOrders, statusFilter, payFilter, dateFilter, search]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleStatusChange = async (order: Order, nextStatus: OrderStatus, nextPay?: PaymentStatus) => {
    const timeline = [
      ...(order.timeline || []),
      {
        status: nextStatus,
        label: nextStatus.replace(/_/g, ' '),
        timestamp: new Date().toISOString(),
        note: `Updated by admin`,
      },
    ].slice(-15);
    await updateDoc(doc(db, 'orders', order.id), {
      orderStatus: nextStatus,
      ...(nextPay ? { paymentStatus: nextPay } : {}),
      ...(courier ? { courierName: courier } : {}),
      ...(tracking ? { trackingNumber: tracking } : {}),
      timeline,
      updatedAt: serverTimestamp(),
    });
    await logAdminAudit('UPDATE_ORDER_STATUS', 'orders', order.id, `${order.orderNumber} → ${nextStatus}`);
    showToast(`Order ${order.orderNumber} updated to ${nextStatus}`, 'success');
    setSelectedOrder(null);
  };

  const handleExportOrders = () => {
    const headers = ['OrderNumber', 'Customer', 'Phone', 'PaymentMethod', 'PaymentStatus', 'OrderStatus', 'GrandTotal'];
    const rows = filtered.map((o) => [
      o.orderNumber,
      o.customerName,
      o.customerPhone,
      o.paymentMethod,
      o.paymentStatus,
      o.orderStatus,
      o.grandTotal,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'laksmi-orders.csv';
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search order #, customer, phone..."
          className="border border-neutral-200 rounded-lg px-3 py-2 bg-white w-56"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="border border-neutral-200 rounded-lg px-3 py-2 bg-white"
        >
          <option value="ALL">All Order Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select
          value={payFilter}
          onChange={(e) => {
            setPayFilter(e.target.value);
            setPage(1);
          }}
          className="border border-neutral-200 rounded-lg px-3 py-2 bg-white"
        >
          <option value="ALL">All Payment Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="VERIFIED">VERIFIED</option>
          <option value="PAID">PAID</option>
          <option value="REFUNDED">REFUNDED</option>
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="border border-neutral-200 rounded-lg px-3 py-2 bg-white"
        />
        <button
          onClick={handleExportOrders}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 bg-white font-semibold"
        >
          <Download className="w-3.5 h-3.5" />
          Export Orders CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200 text-left">
              <th className="py-3 px-3">Order #</th>
              <th className="py-3 px-3">Customer</th>
              <th className="py-3 px-3">Items</th>
              <th className="py-3 px-3">Payment</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Total</th>
              <th className="py-3 px-3 text-right">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-neutral-500">
                  No orders matched your filters.
                </td>
              </tr>
            ) : (
              paged.map((o) => (
                <tr key={o.id} className="hover:bg-[#F3F8F1]/40">
                  <td className="py-2.5 px-3 font-mono-num font-bold">{o.orderNumber}</td>
                  <td className="py-2.5 px-3">
                    <p className="font-semibold">{o.customerName}</p>
                    <p className="text-[11px] text-neutral-500">{o.customerPhone}</p>
                  </td>
                  <td className="py-2.5 px-3 tabular-nums">{o.items.length} item(s)</td>
                  <td className="py-2.5 px-3">
                    {o.paymentMethod} · <strong>{o.paymentStatus}</strong>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#176B3A]">{o.orderStatus.replace(/_/g, ' ')}</td>
                  <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                    ₹{o.grandTotal.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedOrder(o);
                        setCourier(o.courierName || '');
                        setTracking(o.trackingNumber || '');
                      }}
                      className="px-3 py-1 rounded bg-[#176B3A] text-white font-semibold"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-8 h-8 rounded text-xs font-bold border ${
                page === i + 1 ? 'bg-[#176B3A] text-white border-[#176B3A]' : 'bg-white border-neutral-200'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="font-display font-bold text-base">Manage Order {selectedOrder.orderNumber}</h3>
                <p className="text-neutral-500">
                  {selectedOrder.customerName} · {selectedOrder.customerPhone}
                </p>
              </div>
              <button onClick={() => window.print()} className="inline-flex items-center gap-1 px-2.5 py-1 border rounded">
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
            </div>

            <div className="bg-[#F3F8F1] rounded-lg p-3 space-y-1">
              <p className="font-bold">Delivery Address:</p>
              <p>
                {selectedOrder.shippingAddress?.address}, {selectedOrder.shippingAddress?.village},{' '}
                {selectedOrder.shippingAddress?.mandal}, {selectedOrder.shippingAddress?.district},{' '}
                {selectedOrder.shippingAddress?.state} - {selectedOrder.shippingAddress?.pinCode}
              </p>
              {selectedOrder.buyerLicenseRef && (
                <p className="font-semibold text-amber-800">Buyer License Ref: {selectedOrder.buyerLicenseRef}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Courier Partner</label>
                <input
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  placeholder="e.g. Delhivery / Local Agri Van"
                  className="w-full border border-neutral-200 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Tracking Number</label>
                <input
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="Tracking ID"
                  className="w-full border border-neutral-200 rounded px-3 py-2 font-mono-num"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1.5">Update Order Status</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_STATUSES.map((st) => (
                  <button
                    key={st}
                    onClick={() =>
                      handleStatusChange(
                        selectedOrder,
                        st,
                        st === 'PAYMENT_CONFIRMED' ? 'PAID' : st === 'REFUNDED' ? 'REFUNDED' : undefined
                      )
                    }
                    className={`px-2.5 py-1.5 rounded border font-semibold ${
                      selectedOrder.orderStatus === st
                        ? 'bg-[#176B3A] text-white border-[#176B3A]'
                        : 'hover:bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    {st.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button onClick={() => setSelectedOrder(null)} className="px-4 py-2 rounded border font-semibold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminCustomersPanel: React.FC = () => {
  const { allUsers, allOrders } = useStore();
  const [search, setSearch] = useState('');

  const filtered = allUsers.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search))
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers by name, email, phone..."
          className="border border-neutral-200 rounded-lg px-3 py-2 text-xs bg-white w-64"
        />
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200 text-left">
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Phone</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4 text-right">Orders</th>
              <th className="py-3 px-4 text-right">Total Spend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((u) => {
              const uOrders = allOrders.filter((o) => o.userId === u.uid);
              const spend = uOrders.reduce((s, o) => s + o.grandTotal, 0);
              return (
                <tr key={u.uid}>
                  <td className="py-2.5 px-4">
                    <p className="font-semibold">{u.fullName}</p>
                    <p className="text-[11px] text-neutral-500">{u.email}</p>
                  </td>
                  <td className="py-2.5 px-4">{u.phone || '-'}</td>
                  <td className="py-2.5 px-4">
                    {[u.village, u.mandal, u.district].filter(Boolean).join(', ') || '-'}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{uOrders.length}</td>
                  <td className="py-2.5 px-4 text-right font-bold tabular-nums">
                    ₹{spend.toLocaleString('en-IN')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const AdminPaymentsAndInvoicesPanel: React.FC<{ mode: 'payments' | 'invoices' }> = ({ mode }) => {
  const { allOrders, allInvoices, showToast } = useStore();

  if (mode === 'invoices') {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200 text-left">
              <th className="py-3 px-4">Invoice #</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4 text-right">Taxable</th>
              <th className="py-3 px-4 text-right">CGST</th>
              <th className="py-3 px-4 text-right">SGST</th>
              <th className="py-3 px-4 text-right">Grand Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {allInvoices.map((inv) => (
              <tr key={inv.id}>
                <td className="py-2.5 px-4 font-mono-num font-bold">{inv.invoiceNumber}</td>
                <td className="py-2.5 px-4">{inv.customerName}</td>
                <td className="py-2.5 px-4 text-right tabular-nums">₹{inv.taxableValue.toLocaleString('en-IN')}</td>
                <td className="py-2.5 px-4 text-right tabular-nums">₹{(inv.cgst || 0).toLocaleString('en-IN')}</td>
                <td className="py-2.5 px-4 text-right tabular-nums">₹{(inv.sgst || 0).toLocaleString('en-IN')}</td>
                <td className="py-2.5 px-4 text-right font-bold tabular-nums">
                  ₹{inv.grandTotal.toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200 text-left">
            <th className="py-3 px-4">Order #</th>
            <th className="py-3 px-4">Method</th>
            <th className="py-3 px-4">Reference</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4 text-right">Amount</th>
            <th className="py-3 px-4 text-right">Verify</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {allOrders.map((o) => (
            <tr key={o.id}>
              <td className="py-2.5 px-4 font-mono-num font-bold">{o.orderNumber}</td>
              <td className="py-2.5 px-4">{o.paymentMethod}</td>
              <td className="py-2.5 px-4 font-mono-num text-[11px]">{o.paymentRef || '-'}</td>
              <td className="py-2.5 px-4 font-semibold">{o.paymentStatus}</td>
              <td className="py-2.5 px-4 text-right font-bold tabular-nums">₹{o.grandTotal.toLocaleString('en-IN')}</td>
              <td className="py-2.5 px-4 text-right">
                {o.paymentStatus !== 'PAID' && (
                  <button
                    onClick={async () => {
                      await updateDoc(doc(db, 'orders', o.id), {
                        paymentStatus: 'PAID',
                        updatedAt: serverTimestamp(),
                      });
                      showToast(`Marked ${o.orderNumber} PAID`, 'success');
                    }}
                    className="px-2.5 py-1 rounded bg-[#176B3A] text-white font-semibold"
                  >
                    Confirm Paid
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const AdminStaffPanel: React.FC = () => {
  const { isSuperAdmin, allUsers, showToast, logAdminAudit } = useStore();
  const [staffList, setStaffList] = useState<AdminUserRecord[]>([]);
  const [mode, setMode] = useState<'credentials' | 'uid'>('credentials');
  const [uid, setUid] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'ADMIN' | 'STAFF'>('ADMIN');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isSuperAdmin) return;
    return onSnapshot(
      collection(db, 'admins'),
      (snap) => setStaffList(snap.docs.map((d) => d.data() as AdminUserRecord)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'admins')
    );
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-6 text-xs text-neutral-600">
        Only the Super Admin (nexumyst@gmail.com) can manage admin accounts and role permissions.
      </div>
    );
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanName = name.trim().slice(0, 120);
    const cleanEmail = email.trim().slice(0, 180);
    if (!cleanName || !cleanEmail) return;

    setSubmitting(true);
    try {
      let targetUid = uid.trim();

      if (mode === 'credentials') {
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters.');
          setSubmitting(false);
          return;
        }
        try {
          targetUid = await createAdminAuthAccount(cleanName, cleanEmail, password);
        } catch (authErr) {
          const msg = authErr instanceof Error ? authErr.message : String(authErr);
          if (msg.includes('operation-not-allowed')) {
            setErrorMsg(
              'Email/Password sign-in is currently disabled in Firebase Console. Enable it under Firebase Console → Authentication → Sign-in method → Email/Password, or switch to "Link Existing User / UID" if they sign in with Google.'
            );
            setSubmitting(false);
            return;
          }
          if (msg.includes('email-already-in-use')) {
            const matchedUser = allUsers.find((u) => u.email.toLowerCase() === cleanEmail.toLowerCase());
            if (matchedUser?.uid) {
              targetUid = matchedUser.uid;
            } else {
              setErrorMsg(
                'This email is already registered in Firebase Auth. Switch to "Link Existing User / UID" and select or paste their Firebase UID.'
              );
              setSubmitting(false);
              return;
            }
          } else {
            setErrorMsg(msg);
            setSubmitting(false);
            return;
          }
        }
      }

      if (!targetUid) {
        setErrorMsg('Please provide a valid Firebase User UID.');
        setSubmitting(false);
        return;
      }

      await setDoc(doc(db, 'admins', targetUid), {
        uid: targetUid,
        name: cleanName,
        email: cleanEmail,
        role,
        permissions: role === 'ADMIN' ? ['products', 'orders', 'inventory', 'reports'] : ['orders', 'inventory'],
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await logAdminAudit('ASSIGN_ROLE', 'admins', targetUid, `Created ${role} account for ${cleanEmail}`);
      setUid('');
      setName('');
      setEmail('');
      setPassword('');
      showToast(
        mode === 'credentials'
          ? `${role} account created for ${cleanName}. Verification email sent to ${cleanEmail}.`
          : `Assigned ${role} role to ${cleanName}.`,
        'success'
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create admin account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-base text-[#252525] flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#176B3A]" />
              Add Admin / Staff Account
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Create a new Admin login with Name, Email, and Password, or assign an existing registered user.
            </p>
          </div>
          <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('credentials');
                setErrorMsg(null);
              }}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                mode === 'credentials' ? 'bg-white text-[#176B3A] shadow-xs' : 'text-neutral-600'
              }`}
            >
              Name, Email & Password
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('uid');
                setErrorMsg(null);
              }}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                mode === 'uid' ? 'bg-white text-[#176B3A] shadow-xs' : 'text-neutral-600'
              }`}
            >
              Link Existing User / UID
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 leading-relaxed">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAddStaff} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Admin Name *</label>
            <input
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full border border-neutral-200 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Admin Email *</label>
            <input
              required
              type="email"
              maxLength={180}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full border border-neutral-200 rounded-lg px-3 py-2"
            />
          </div>

          {mode === 'credentials' ? (
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Password *</label>
              <div className="relative">
                <input
                  required
                  minLength={6}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full border border-neutral-200 rounded-lg pl-3 pr-9 py-2"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">User UID *</label>
              <input
                required
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                list="registered-users-list"
                placeholder="Paste or pick registered UID"
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 font-mono-num"
              />
              <datalist id="registered-users-list">
                {allUsers.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.fullName} ({u.email})
                  </option>
                ))}
              </datalist>
            </div>
          )}

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Role *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'ADMIN' | 'STAFF')}
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 bg-white"
            >
              <option value="ADMIN">ADMIN (Full Operations)</option>
              <option value="STAFF">STAFF (Orders & Stock)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#176B3A] hover:bg-[#12552e] disabled:opacity-60 text-white font-bold rounded-lg px-4 py-2 min-h-[38px]"
            >
              {submitting ? 'Creating...' : mode === 'credentials' ? 'Add Admin' : 'Assign Role'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-5 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-[#176B3A] pb-2 border-b">
          <ShieldCheck className="w-4 h-4" />
          Bootstrapped Super Admin: nexumyst@gmail.com (Full System Access)
        </div>
        {staffList.length === 0 && (
          <p className="text-neutral-500 py-2">No additional admin or staff accounts added yet.</p>
        )}
        {staffList.map((st) => (
          <div key={st.uid} className="flex flex-wrap items-center justify-between gap-3 py-2.5 border-b border-neutral-100 last:border-b-0">
            <div>
              <p className="font-bold text-[#252525]">
                {st.name}{' '}
                <span className="ml-1 px-2 py-0.5 rounded bg-[#F3F8F1] text-[#176B3A] text-[10px]">{st.role}</span>
                {!st.active && (
                  <span className="ml-1 px-2 py-0.5 rounded bg-neutral-100 text-neutral-500 text-[10px]">Paused</span>
                )}
              </p>
              <p className="text-neutral-500 mt-0.5">
                {st.email} · UID: <span className="font-mono-num">{st.uid}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  await updateDoc(doc(db, 'admins', st.uid), {
                    active: !st.active,
                    updatedAt: serverTimestamp(),
                  });
                  showToast(`${st.name} ${st.active ? 'paused' : 'activated'}.`, 'info');
                }}
                className="text-neutral-600 font-semibold hover:underline"
              >
                {st.active ? 'Pause' : 'Activate'}
              </button>
              <button
                onClick={async () => {
                  await deleteDoc(doc(db, 'admins', st.uid));
                  await logAdminAudit('REVOKE_ROLE', 'admins', st.uid, `Revoked ${st.role} from ${st.email}`);
                  showToast(`Revoked access for ${st.name}.`, 'info');
                }}
                className="text-red-600 font-semibold hover:underline"
              >
                Revoke
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AdminSettingsPanel: React.FC = () => {
  const { settings, showToast, logAdminAudit } = useStore();
  const [form, setForm] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'business'), { ...form, updatedAt: serverTimestamp() }, { merge: true });
      await logAdminAudit('UPDATE_SETTINGS', 'settings', 'business', 'Updated store & website settings');
      showToast('Business & website settings saved.', 'success');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border border-neutral-200 p-6 space-y-5 text-xs">
      <h3 className="font-display font-bold text-base">Business, Compliance & Website Settings</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-semibold mb-1">Business Name</label>
          <input
            value={form.storeName}
            onChange={(e) => setForm({ ...form, storeName: e.target.value })}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Tagline</label>
          <input
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Business Address</label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Support Phone</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Support Email</label>
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">GSTIN</label>
          <input
            value={form.gstin}
            onChange={(e) => setForm({ ...form, gstin: e.target.value })}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 font-mono-num"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Fertilizer License No</label>
          <input
            value={form.fertilizerLicenseNo}
            onChange={(e) => setForm({ ...form, fertilizerLicenseNo: e.target.value })}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Pesticide License No</label>
          <input
            value={form.pesticideLicenseNo}
            onChange={(e) => setForm({ ...form, pesticideLicenseNo: e.target.value })}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Seed License No</label>
          <input
            value={form.seedLicenseNo}
            onChange={(e) => setForm({ ...form, seedLicenseNo: e.target.value })}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block font-semibold mb-1">Free Delivery Above (₹)</label>
            <input
              type="number"
              value={form.freeDeliveryThreshold}
              onChange={(e) => setForm({ ...form, freeDeliveryThreshold: Number(e.target.value) })}
              className="w-full border border-neutral-200 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Standard Delivery (₹)</label>
            <input
              type="number"
              value={form.standardDeliveryFee}
              onChange={(e) => setForm({ ...form, standardDeliveryFee: Number(e.target.value) })}
              className="w-full border border-neutral-200 rounded-lg px-3 py-2"
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="block font-semibold mb-1">Top Bar Announcement (English)</label>
          <input
            value={form.topBarAnnouncement}
            onChange={(e) => setForm({ ...form, topBarAnnouncement: e.target.value })}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block font-semibold mb-1">Top Bar Announcement (Telugu)</label>
          <input
            value={form.topBarAnnouncementTe}
            onChange={(e) => setForm({ ...form, topBarAnnouncementTe: e.target.value })}
            className="w-full border border-neutral-200 rounded-lg px-3 py-2"
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="font-bold mb-2">Homepage Section Visibility</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {Object.entries(form.sectionsVisibility).map(([key, val]) => (
            <label key={key} className="flex items-center gap-1.5 capitalize cursor-pointer">
              <input
                type="checkbox"
                checked={val}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sectionsVisibility: { ...form.sectionsVisibility, [key]: e.target.checked },
                  })
                }
                className="accent-[#176B3A]"
              />
              {key}
            </label>
          ))}
        </div>
      </div>

      <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg bg-[#176B3A] text-white font-bold">
        {saving ? 'Saving...' : 'Save Business & Website Settings'}
      </button>
    </form>
  );
};

export const AdminAuditLogsPanel: React.FC = () => {
  const { isAdmin, seedDemoCatalogToFirestore } = useStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    return onSnapshot(
      collection(db, 'auditLogs'),
      (snap) => setLogs(snap.docs.map((d) => ({ ...(d.data() as AuditLog), id: d.id }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
    );
  }, [isAdmin]);

  return (
    <div className="space-y-4">
      <div className="bg-[#F3F8F1] rounded-xl border border-neutral-200 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span>Sync or restore clearly-marked demo agricultural catalog & categories into Cloud Firestore.</span>
        <button
          onClick={seedDemoCatalogToFirestore}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#176B3A] text-white font-bold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync Demo Catalog to Firestore
        </button>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200 text-left">
              <th className="py-3 px-4">Actor</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Entity</th>
              <th className="py-3 px-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-neutral-500">
                  No administrative audit activity logged yet.
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id}>
                  <td className="py-2.5 px-4">{l.actorEmail || l.actorUid}</td>
                  <td className="py-2.5 px-4 font-bold">{l.action}</td>
                  <td className="py-2.5 px-4 font-mono-num">
                    {l.entityType}/{l.entityId}
                  </td>
                  <td className="py-2.5 px-4 text-neutral-600">{l.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
