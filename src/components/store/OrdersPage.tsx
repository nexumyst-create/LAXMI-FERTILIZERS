import React, { useState } from 'react';
import { CheckCircle2, FileText, Package, Printer, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Order, OrderStatus } from '../../types';

const STATUS_STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'ORDER_PLACED', label: 'Order Placed' },
  { key: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'PACKED', label: 'Packed' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export const OrdersPage: React.FC = () => {
  const {
    firebaseUser,
    setAuthModalOpen,
    myOrders,
    settings,
    cancelCustomerOrder,
    requestCustomerReturn,
    reorderFromOrder,
    navigate,
  } = useStore();

  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [cancelOrderTarget, setCancelOrderTarget] = useState<Order | null>(null);
  const [returnOrderTarget, setReturnOrderTarget] = useState<Order | null>(null);
  const [reasonText, setReasonText] = useState('');

  if (!firebaseUser) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 text-center">
        <Package className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
        <h1 className="font-display text-2xl font-bold mb-2">Sign In to View Your Orders</h1>
        <p className="text-sm text-neutral-600 mb-6">
          Track live delivery status, download GST invoices, and reorder farm inputs.
        </p>
        <button
          onClick={() => setAuthModalOpen(true)}
          className="px-5 py-2.5 rounded-lg bg-[#176B3A] text-white text-sm font-semibold"
        >
          Sign In
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6 no-print">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#252525]">My Orders</h1>
          <p className="text-xs text-neutral-500 mt-1">Track shipments, download GST invoices, or reorder inputs</p>
        </div>
        <button
          onClick={() => navigate('/catalog')}
          className="px-4 py-2 rounded-lg bg-[#176B3A] text-white text-xs font-semibold"
        >
          Shop More Inputs
        </button>
      </div>

      {myOrders.length === 0 ? (
        <div className="bg-[#F3F8F1] rounded-xl border border-neutral-200 p-12 text-center no-print">
          <Package className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
          <p className="font-display font-bold text-base mb-1">No orders placed yet</p>
          <p className="text-xs text-neutral-600 mb-4">Your confirmed orders and invoices will appear here.</p>
        </div>
      ) : (
        <div className="space-y-6 no-print">
          {myOrders.map((order) => {
            const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === order.orderStatus);
            const isCancelled = order.orderStatus === 'CANCELLED' || order.orderStatus === 'REFUNDED';
            const canCancel = ['ORDER_PLACED', 'PAYMENT_CONFIRMED', 'PROCESSING'].includes(order.orderStatus);
            const canReturn = order.orderStatus === 'DELIVERED' && !order.returnReason;

            return (
              <div key={order.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                {/* Order Header */}
                <div className="bg-[#F8FAF7] px-5 py-3.5 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-5">
                    <div>
                      <span className="text-neutral-500 block">Order Number</span>
                      <span className="font-mono-num font-bold text-[#252525]">{order.orderNumber}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Total Amount</span>
                      <span className="font-bold text-[#176B3A] tabular-nums">
                        ₹{order.grandTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Payment</span>
                      <span className="font-semibold text-[#252525]">
                        {order.paymentMethod} · {order.paymentStatus}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Status</span>
                      <span className="font-bold text-[#176B3A]">{order.orderStatus.replace(/_/g, ' ')}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setInvoiceOrder(order)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 bg-white hover:border-[#176B3A] font-semibold"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Invoice
                    </button>
                    <button
                      onClick={() => reorderFromOrder(order)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#176B3A] text-white font-semibold hover:bg-[#12552e]"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reorder
                    </button>
                    {canCancel && (
                      <button
                        onClick={() => {
                          setReasonText('');
                          setCancelOrderTarget(order);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-semibold"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    )}
                    {canReturn && (
                      <button
                        onClick={() => {
                          setReasonText('');
                          setReturnOrderTarget(order);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-50 font-semibold"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Return / Refund
                      </button>
                    )}
                  </div>
                </div>

                {/* Tracking Timeline */}
                <div className="p-5">
                  {isCancelled ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 mb-4">
                      <strong>{order.orderStatus}:</strong> {order.cancellationReason || 'Order cancelled/refunded.'}
                    </div>
                  ) : (
                    <div className="mb-5 overflow-x-auto">
                      <div className="flex items-center justify-between min-w-[600px] gap-2">
                        {STATUS_STEPS.map((step, idx) => {
                          const done = currentStepIdx >= idx;
                          return (
                            <div key={step.key} className="flex-1 flex flex-col items-center text-center relative">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 ${
                                  done ? 'bg-[#176B3A] text-white' : 'bg-neutral-200 text-neutral-500'
                                }`}
                              >
                                {done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                              </div>
                              <span className={`text-[11px] font-medium ${done ? 'text-[#176B3A]' : 'text-neutral-500'}`}>
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {order.trackingNumber && (
                    <p className="text-xs text-neutral-600 mb-3">
                      Courier: <strong>{order.courierName || 'Agri Express'}</strong> · Tracking ID:{' '}
                      <span className="font-mono-num font-bold">{order.trackingNumber}</span>
                    </p>
                  )}

                  <div className="divide-y divide-neutral-100 text-xs">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-[#252525]">{item.productName}</span>
                          <span className="text-neutral-500 ml-2">
                            ({item.packSize}) × {item.qty}
                          </span>
                        </div>
                        <span className="font-bold tabular-nums">
                          ₹{(item.unitPrice * item.qty).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Printable GST Invoice Modal */}
      {invoiceOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl">
            <div className="flex justify-between items-start border-b border-neutral-200 pb-4 mb-5">
              <div>
                <h2 className="font-display text-lg font-bold text-[#176B3A]">{settings.storeName}</h2>
                <p className="text-xs text-neutral-600">{settings.address}</p>
                <p className="text-xs text-neutral-600">GSTIN: {settings.gstin}</p>
              </div>
              <div className="text-right text-xs">
                <p className="font-bold text-sm">TAX INVOICE</p>
                <p className="font-mono-num">INV-{invoiceOrder.orderNumber}</p>
                <p>Order: {invoiceOrder.orderNumber}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs mb-5">
              <div>
                <p className="font-bold text-neutral-500 mb-1">Billed & Shipped To:</p>
                <p className="font-semibold text-[#252525]">{invoiceOrder.customerName}</p>
                <p>{invoiceOrder.shippingAddress?.address}</p>
                <p>
                  {invoiceOrder.shippingAddress?.village}, {invoiceOrder.shippingAddress?.mandal}
                </p>
                <p>
                  {invoiceOrder.shippingAddress?.district}, {invoiceOrder.shippingAddress?.state} -{' '}
                  {invoiceOrder.shippingAddress?.pinCode}
                </p>
                <p>Phone: {invoiceOrder.customerPhone}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-neutral-500 mb-1">Payment Details:</p>
                <p>Method: {invoiceOrder.paymentMethod}</p>
                <p>Status: {invoiceOrder.paymentStatus}</p>
                {invoiceOrder.paymentRef && <p className="font-mono-num">Ref: {invoiceOrder.paymentRef}</p>}
              </div>
            </div>

            <table className="w-full text-xs border-collapse mb-5">
              <thead>
                <tr className="border-y border-neutral-300 bg-neutral-50 text-left">
                  <th className="py-2 px-2">Item</th>
                  <th className="py-2 px-2">HSN</th>
                  <th className="py-2 px-2 text-right">Qty</th>
                  <th className="py-2 px-2 text-right">GST%</th>
                  <th className="py-2 px-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoiceOrder.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-neutral-100">
                    <td className="py-2 px-2">
                      {item.productName} ({item.packSize})
                    </td>
                    <td className="py-2 px-2 font-mono-num">{item.hsnCode}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{item.qty}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{item.gstRate}%</td>
                    <td className="py-2 px-2 text-right tabular-nums font-semibold">
                      ₹{(item.unitPrice * item.qty).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-xs space-y-1 max-w-xs ml-auto mb-6">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="tabular-nums">₹{invoiceOrder.subtotal.toLocaleString('en-IN')}</span>
              </div>
              {invoiceOrder.discountTotal > 0 && (
                <div className="flex justify-between text-[#176B3A]">
                  <span>Discount:</span>
                  <span className="tabular-nums">-₹{invoiceOrder.discountTotal.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery:</span>
                <span className="tabular-nums">₹{invoiceOrder.deliveryCharge.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Included CGST + SGST:</span>
                <span className="tabular-nums">₹{invoiceOrder.gstTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold text-sm border-t border-neutral-300 pt-2">
                <span>Grand Total:</span>
                <span className="tabular-nums">₹{invoiceOrder.grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 no-print">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#176B3A] text-white text-xs font-semibold"
              >
                <Printer className="w-4 h-4" />
                Print / Save PDF
              </button>
              <button
                onClick={() => setInvoiceOrder(null)}
                className="px-4 py-2 rounded-lg border border-neutral-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel / Return Modals */}
      {(cancelOrderTarget || returnOrderTarget) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-display font-bold text-base">
              {cancelOrderTarget ? 'Cancel Order' : 'Request Return / Refund'}
            </h3>
            <textarea
              required
              rows={3}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder={
                cancelOrderTarget
                  ? 'Reason for cancelling order...'
                  : 'Describe damaged/incorrect item details for return review...'
              }
              className="w-full border border-neutral-200 rounded-lg p-3 text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setCancelOrderTarget(null);
                  setReturnOrderTarget(null);
                }}
                className="px-4 py-2 rounded-lg border border-neutral-200 text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  if (!reasonText.trim()) return;
                  if (cancelOrderTarget) {
                    await cancelCustomerOrder(cancelOrderTarget.id, reasonText);
                    setCancelOrderTarget(null);
                  } else if (returnOrderTarget) {
                    await requestCustomerReturn(returnOrderTarget.id, reasonText);
                    setReturnOrderTarget(null);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-[#176B3A] text-white text-xs font-semibold"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
