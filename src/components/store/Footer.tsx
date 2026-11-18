import React from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { getT } from '../../i18n/translations';
import { BrandLogo } from '../common/BrandLogo';

export const Footer: React.FC = () => {
  const { language, navigate, settings } = useStore();
  const t = getT(language);

  return (
    <footer className="bg-[#0F3F23] text-emerald-50 no-print">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Store Identity */}
        <div>
          <BrandLogo onDark />
          <p className="text-xs text-emerald-100/80 mt-3 leading-relaxed">{t.tagline}</p>
          <div className="mt-4 space-y-2 text-xs text-emerald-100/85">
            <p className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#F5B82E] shrink-0 mt-0.5" />
              <span>{settings.address}</span>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#F5B82E] shrink-0" />
              <span>{settings.phone}</span>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#F5B82E] shrink-0" />
              <span>{settings.email}</span>
            </p>
          </div>
        </div>

        {/* Shop Categories */}
        <div>
          <h3 className="font-display font-bold text-sm text-white mb-3">Agricultural Catalog</h3>
          <ul className="space-y-2 text-xs text-emerald-100/80">
            <li>
              <button onClick={() => navigate('/catalog?category=cat-fertilizers')} className="hover:text-[#F5B82E]">
                {t.nav.fertilizers}
              </button>
            </li>
            <li>
              <button onClick={() => navigate('/catalog?category=cat-pesticides')} className="hover:text-[#F5B82E]">
                {t.nav.pesticides}
              </button>
            </li>
            <li>
              <button onClick={() => navigate('/catalog?category=cat-seeds')} className="hover:text-[#F5B82E]">
                {t.nav.seeds}
              </button>
            </li>
            <li>
              <button onClick={() => navigate('/catalog?category=cat-bio-products')} className="hover:text-[#F5B82E]">
                {t.nav.bioFertilizers}
              </button>
            </li>
            <li>
              <button onClick={() => navigate('/catalog?category=cat-micronutrients')} className="hover:text-[#F5B82E]">
                {t.nav.micronutrients}
              </button>
            </li>
            <li>
              <button onClick={() => navigate('/catalog?category=cat-farming-accessories')} className="hover:text-[#F5B82E]">
                {t.nav.farmingTools}
              </button>
            </li>
          </ul>
        </div>

        {/* Customer Policies */}
        <div>
          <h3 className="font-display font-bold text-sm text-white mb-3">Customer Policies</h3>
          <ul className="space-y-2 text-xs text-emerald-100/80">
            <li>
              <button onClick={() => navigate('/about')} className="hover:text-[#F5B82E]">
                {t.footer.aboutUs}
              </button>
            </li>
            <li>
              <button onClick={() => navigate('/contact')} className="hover:text-[#F5B82E]">
                {t.footer.contactUs} / {t.footer.support}
              </button>
            </li>
            <li>
              <button onClick={() => navigate('/faq')} className="hover:text-[#F5B82E]">
                {t.footer.faqs}
              </button>
            </li>
            <li>
              <button onClick={() => navigate('/shipping-policy')} className="hover:text-[#F5B82E]">
                {t.footer.shippingPolicy}
              </button>
            </li>
            <li>
              <button onClick={() => navigate('/refund-policy')} className="hover:text-[#F5B82E]">
                {t.footer.refundPolicy}
              </button>
            </li>
            <li>
              <button onClick={() => navigate('/cancellation-policy')} className="hover:text-[#F5B82E]">
                {t.footer.cancellationPolicy}
              </button>
            </li>
          </ul>
        </div>

        {/* Legal & Compliance */}
        <div>
          <h3 className="font-display font-bold text-sm text-white mb-3">Legal & Licensing</h3>
          <ul className="space-y-2 text-xs text-emerald-100/80 mb-4">
            <li>
              <button onClick={() => navigate('/privacy-policy')} className="hover:text-[#F5B82E]">
                {t.footer.privacyPolicy}
              </button>
            </li>
            <li>
              <button onClick={() => navigate('/terms')} className="hover:text-[#F5B82E]">
                {t.footer.terms}
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('/admin')}
                className="hover:text-[#F5B82E] text-[#F5B82E]/90 font-semibold"
              >
                Admin Panel
              </button>
            </li>
          </ul>
          <div className="text-[11px] text-emerald-100/75 space-y-1 border-t border-white/15 pt-3">
            <p>GSTIN: {settings.gstin}</p>
            <p>Fertilizer License: {settings.fertilizerLicenseNo}</p>
            <p>Pesticide License: {settings.pesticideLicenseNo}</p>
            <p>Seed License: {settings.seedLicenseNo}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-[#0B301A] px-4 sm:px-6 py-4">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-emerald-100/70">
          <p>© {new Date().getFullYear()} {settings.storeName}. All rights reserved.</p>
          <p className="text-center sm:text-right max-w-2xl">{t.footer.complianceNote}</p>
        </div>
      </div>
    </footer>
  );
};
