import React, { useState } from 'react';
import { HelpCircle, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const PolicyPage: React.FC<{ page: string }> = ({ page }) => {
  const { settings, navigate, showToast } = useStore();
  const [contactMsg, setContactMsg] = useState({ name: '', phone: '', message: '' });

  if (page === '/contact') {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-display text-3xl font-bold text-[#252525] mb-2">Contact Us & Farmer Support</h1>
        <p className="text-sm text-neutral-600 mb-8">
          Reach out to {settings.storeName} for order assistance, bulk agricultural quotes, or product label details.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#F3F8F1] rounded-xl border border-neutral-200 p-6 space-y-4 text-sm">
            <h2 className="font-display font-bold text-base text-[#176B3A]">Store Contact Details</h2>
            <p className="flex items-start gap-2.5 text-neutral-700">
              <MapPin className="w-4 h-4 text-[#176B3A] shrink-0 mt-1" />
              <span>{settings.address}</span>
            </p>
            <p className="flex items-center gap-2.5 text-neutral-700">
              <Phone className="w-4 h-4 text-[#176B3A] shrink-0" />
              <span>{settings.phone}</span>
            </p>
            <p className="flex items-center gap-2.5 text-neutral-700">
              <Mail className="w-4 h-4 text-[#176B3A] shrink-0" />
              <span>{settings.email}</span>
            </p>
            <div className="border-t border-neutral-200 pt-3 text-xs text-neutral-600 space-y-1">
              <p>GSTIN: {settings.gstin}</p>
              <p>Fertilizer License: {settings.fertilizerLicenseNo}</p>
              <p>Pesticide License: {settings.pesticideLicenseNo}</p>
              <p>Seed License: {settings.seedLicenseNo}</p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              showToast('Support inquiry received. Our team will respond shortly.', 'success');
              setContactMsg({ name: '', phone: '', message: '' });
            }}
            className="bg-white rounded-xl border border-neutral-200 p-6 space-y-3 text-xs"
          >
            <h2 className="font-display font-bold text-base text-[#252525]">Send a Support Request</h2>
            <input
              required
              value={contactMsg.name}
              onChange={(e) => setContactMsg({ ...contactMsg, name: e.target.value })}
              placeholder="Your Name *"
              className="w-full border border-neutral-200 rounded-lg px-3 py-2"
            />
            <input
              required
              value={contactMsg.phone}
              onChange={(e) => setContactMsg({ ...contactMsg, phone: e.target.value })}
              placeholder="Mobile Number *"
              className="w-full border border-neutral-200 rounded-lg px-3 py-2"
            />
            <textarea
              required
              rows={4}
              value={contactMsg.message}
              onChange={(e) => setContactMsg({ ...contactMsg, message: e.target.value })}
              placeholder="How can we help with your order or product query? *"
              className="w-full border border-neutral-200 rounded-lg px-3 py-2"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-[#176B3A] text-white font-bold hover:bg-[#12552e]"
            >
              Submit Inquiry
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (page === '/faq') {
    const faqs = [
      {
        q: 'Are pesticides and fertilizers sold with valid batch and expiry details?',
        a: 'Yes. Every agricultural input lists batch number, manufacturer, GST/HSN details, and approved label safety guidelines. Regulated crop protection items require buyer confirmation at checkout.',
      },
      {
        q: 'How is delivery calculated for village, mandal, and district PIN codes?',
        a: `Orders above ₹${settings.freeDeliveryThreshold.toLocaleString('en-IN')} qualify for Free Delivery. Orders below this threshold carry a flat ₹${settings.standardDeliveryFee} delivery charge.`,
      },
      {
        q: 'Can I download a GST tax invoice for my farm or dealer purchase?',
        a: 'Yes. You can view and print a detailed GST invoice (CGST + SGST + HSN codes) from the My Orders section immediately after placing an order.',
      },
      {
        q: 'What payment methods are accepted?',
        a: 'Cash on Delivery (COD), UPI, Debit/Credit Cards, Net Banking, and Razorpay (when configured on the server).',
      },
    ];
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-display text-3xl font-bold text-[#252525] mb-6 flex items-center gap-2">
          <HelpCircle className="w-7 h-7 text-[#176B3A]" />
          Frequently Asked Questions
        </h1>
        <div className="space-y-4">
          {faqs.map((f) => (
            <div key={f.q} className="bg-white rounded-xl border border-neutral-200 p-5">
              <h2 className="font-display font-bold text-sm text-[#252525] mb-1.5">{f.q}</h2>
              <p className="text-xs text-neutral-600 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </main>
    );
  }

  const contentMap: Record<string, { title: string; body: string[] }> = {
    '/about': {
      title: `About ${settings.storeName}`,
      body: [
        `${settings.storeName} is dedicated to supplying Indian farmers with genuine fertilizers, certified seeds, registered crop protection inputs, bio-fertilizers, micronutrients, and reliable farm equipment.`,
        'Every product listing includes transparent pack pricing, GST & HSN classification, batch tracking, and approved label instructions in English and Telugu.',
        `Configured Licenses — Fertilizer: ${settings.fertilizerLicenseNo} | Pesticide: ${settings.pesticideLicenseNo} | Seed: ${settings.seedLicenseNo}`,
      ],
    },
    '/privacy-policy': {
      title: 'Privacy Policy',
      body: [
        'We collect customer name, phone number, email address, delivery address (village, mandal, district, state, PIN code), and optional agricultural buyer license references solely to process orders, generate GST invoices, and comply with Indian agricultural input regulations.',
        'Customer profile and order records are isolated by user identity in Cloud Firestore and protected by role-based access rules.',
      ],
    },
    '/terms': {
      title: 'Terms & Conditions',
      body: [
        'All orders for fertilizers, seeds, and pesticides are subject to stock availability, valid agricultural input laws in India, and approved product label usage.',
        'Regulated pesticides may require buyer verification or license confirmation prior to dispatch. Unregistered or expired agricultural inputs are prohibited from sale.',
      ],
    },
    '/shipping-policy': {
      title: 'Shipping Policy',
      body: [
        `Standard shipping fee is ₹${settings.standardDeliveryFee}, waived automatically on orders above ₹${settings.freeDeliveryThreshold.toLocaleString('en-IN')}.`,
        'Orders are packed in leak-proof agricultural packaging and dispatched with courier tracking available in My Orders.',
      ],
    },
    '/refund-policy': {
      title: 'Return & Refund Policy',
      body: [
        'Unopened, sealed, and undamaged agricultural inputs may be requested for return within 7 days of delivery if incorrect or damaged in transit.',
        'Opened pesticide bottles or unsealed seed packets cannot be returned unless verified defective by batch inspection.',
      ],
    },
    '/cancellation-policy': {
      title: 'Cancellation Policy',
      body: [
        'Customers may cancel orders directly from My Orders before the shipment status reaches Packed or Shipped.',
        'Verified online payments for cancelled orders are refunded to the original payment source.',
      ],
    },
  };

  const docData = contentMap[page];
  if (!docData) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 text-center">
        <ShieldCheck className="w-12 h-12 text-[#176B3A] mx-auto mb-3" />
        <h1 className="font-display text-3xl font-bold mb-2">404 — Page Not Found</h1>
        <p className="text-sm text-neutral-600 mb-6">The requested page does not exist on {settings.storeName}.</p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-lg bg-[#176B3A] text-white text-sm font-semibold"
        >
          Back to Homepage
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl font-bold text-[#252525] mb-5">{docData.title}</h1>
      <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4 text-sm text-neutral-700 leading-relaxed">
        {docData.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </main>
  );
};
