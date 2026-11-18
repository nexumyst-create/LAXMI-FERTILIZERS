import React, { useEffect, useState } from 'react';
import { Bell, LogOut, MapPin, Plus, ShieldCheck, Trash2, User } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { DeliveryAddress } from '../../types';

export const AccountPage: React.FC = () => {
  const {
    firebaseUser,
    userProfile,
    isAdmin,
    userRole,
    setAuthModalOpen,
    saveUserProfile,
    myNotifications,
    markNotificationRead,
    logout,
    navigate,
  } = useStore();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [village, setVillage] = useState('');
  const [mandal, setMandal] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [buyerLicenseNo, setBuyerLicenseNo] = useState('');
  const [saving, setSaving] = useState(false);

  const [newAddrLabel, setNewAddrLabel] = useState('Farm Field');
  const [showAddAddress, setShowAddAddress] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.fullName || '');
      setPhone(userProfile.phone || '');
      setAddress(userProfile.address || '');
      setVillage(userProfile.village || '');
      setMandal(userProfile.mandal || '');
      setDistrict(userProfile.district || '');
      setStateName(userProfile.state || 'Andhra Pradesh');
      setPinCode(userProfile.pinCode || '');
      setBuyerLicenseNo(userProfile.buyerLicenseNo || '');
    }
  }, [userProfile]);

  if (!firebaseUser) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 text-center">
        <User className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
        <h1 className="font-display text-2xl font-bold mb-2">Customer Account</h1>
        <p className="text-sm text-neutral-600 mb-6">
          Sign in to edit your village/mandal/district profile, manage delivery addresses, and view notifications.
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveUserProfile({
        fullName,
        phone,
        address,
        village,
        mandal,
        district,
        state: stateName,
        pinCode,
        buyerLicenseNo,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddAddress = async () => {
    if (!address || !district || !pinCode) return;
    const nextAddr: DeliveryAddress = {
      id: `addr_${Date.now()}`,
      label: newAddrLabel || 'Farm',
      fullName: fullName || firebaseUser.displayName || 'Customer',
      phone,
      address,
      village,
      mandal,
      district,
      state: stateName,
      pinCode,
    };
    const existing = userProfile?.addresses || [];
    await saveUserProfile({ addresses: [...existing.slice(0, 9), nextAddr] });
    setShowAddAddress(false);
  };

  const handleRemoveAddress = async (id: string) => {
    const existing = userProfile?.addresses || [];
    await saveUserProfile({ addresses: existing.filter((a) => a.id !== id) });
  };

  return (
    <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#252525]">My Account</h1>
          <p className="text-xs text-neutral-500 mt-1">
            {firebaseUser.email} · Role: <strong className="text-[#176B3A]">{userRole}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#F5B82E] text-[#1D241E] text-xs font-bold"
            >
              <ShieldCheck className="w-4 h-4" />
              Open Admin Dashboard
            </button>
          )}
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-neutral-300 text-xs font-semibold hover:bg-neutral-50"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile Form */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-7 bg-white rounded-xl border border-neutral-200 p-6 space-y-4"
        >
          <h2 className="font-display font-bold text-base text-[#252525]">Farmer & Delivery Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold mb-1">Full Name</label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Mobile Number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Address / Door No / Street</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Village</label>
              <input
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Mandal</label>
              <input
                value={mandal}
                onChange={(e) => setMandal(e.target.value)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">District</label>
              <input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">State</label>
              <input
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">PIN Code</label>
              <input
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 font-mono-num"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Agricultural Buyer License / Farmer ID (Optional)</label>
              <input
                value={buyerLicenseNo}
                onChange={(e) => setBuyerLicenseNo(e.target.value)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-[#176B3A] text-white text-xs font-bold hover:bg-[#12552e]"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>

        {/* Saved Addresses & Notifications */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-base text-[#252525] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#176B3A]" />
                Saved Delivery Addresses
              </h2>
              <button
                onClick={() => setShowAddAddress((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#176B3A] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Save Current
              </button>
            </div>

            {showAddAddress && (
              <div className="bg-[#F3F8F1] rounded-lg p-3 mb-4 space-y-2 text-xs">
                <input
                  value={newAddrLabel}
                  onChange={(e) => setNewAddrLabel(e.target.value)}
                  placeholder="Address label (e.g. Home, Field Plot)"
                  className="w-full border border-neutral-200 rounded px-2.5 py-1.5 bg-white"
                />
                <button
                  onClick={handleAddAddress}
                  className="px-3 py-1.5 rounded bg-[#176B3A] text-white font-semibold"
                >
                  Save Profile Address to List
                </button>
              </div>
            )}

            {(!userProfile?.addresses || userProfile.addresses.length === 0) ? (
              <p className="text-xs text-neutral-500">No saved addresses yet. Fill your profile details on the left and click Save Current.</p>
            ) : (
              <div className="space-y-3">
                {userProfile.addresses.map((addr) => (
                  <div key={addr.id} className="border border-neutral-200 rounded-lg p-3 text-xs flex justify-between gap-2">
                    <div>
                      <p className="font-bold text-[#252525]">{addr.label}</p>
                      <p className="text-neutral-600">
                        {addr.address}, {addr.village}, {addr.mandal}, {addr.district}, {addr.state} - {addr.pinCode}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveAddress(addr.id)}
                      className="text-neutral-400 hover:text-red-600 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h2 className="font-display font-bold text-base text-[#252525] flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-[#176B3A]" />
              Order Notifications
            </h2>
            {myNotifications.length === 0 ? (
              <p className="text-xs text-neutral-500">No notifications yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {myNotifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markNotificationRead(n.id)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer ${
                      n.read ? 'border-neutral-100 bg-neutral-50' : 'border-[#4CAF50]/40 bg-[#F3F8F1]'
                    }`}
                  >
                    <p className="font-bold text-[#252525]">{n.title}</p>
                    <p className="text-neutral-600 mt-0.5">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};
