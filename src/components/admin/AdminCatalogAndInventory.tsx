import React, { useState } from 'react';
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { Download, Edit3, Plus, Trash2, Upload } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { useStore } from '../../context/StoreContext';
import { IMG_PROD_NPK } from '../../data/demoCatalog';
import { Banner, Brand, Category, Coupon, CropSeason, LicenseRequirement, Product } from '../../types';
import { SafeImage } from '../common/SafeImage';

export const AdminProductsPanel: React.FC = () => {
  const { products, categories, brands, showToast, logAdminAudit } = useStore();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.categoryName.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    const firstCat = categories[0];
    const firstBrand = brands[0];
    setEditing({
      id: `prod_${Date.now()}`,
      name: '',
      nameTe: '',
      sku: `LKS-${Date.now().toString().slice(-5)}`,
      brandId: firstBrand?.id || '',
      brandName: firstBrand?.name || '',
      categoryId: firstCat?.id || 'cat-fertilizers',
      categoryName: firstCat?.name || 'Fertilizers',
      subcategory: firstCat?.subcategories[0] || '',
      description: '',
      descriptionTe: '',
      mrp: 500,
      price: 450,
      costPrice: 350,
      gstRate: 5,
      hsnCode: '31052000',
      stock: 50,
      minStockAlert: 10,
      images: [IMG_PROD_NPK],
      packSizes: [{ label: '1 kg Pack', mrp: 500, price: 450, stock: 50 }],
      specifications: '',
      manufacturer: '',
      registrationNumber: '',
      licenseRequirement: 'none',
      cropTags: ['Paddy'],
      season: 'All',
      usageInstructions: '',
      safetyInstructions: '',
      batchNumber: '',
      mfgDate: '',
      expiryDate: '',
      isFeatured: false,
      isBestSeller: false,
      isTodaysDeal: false,
      active: true,
      ratingAvg: 4.5,
      ratingCount: 0,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editing.id || !editing.name || !editing.sku) return;
    setSaving(true);
    try {
      const cat = categories.find((c) => c.id === editing.categoryId);
      const brand = brands.find((b) => b.id === editing.brandId);
      const payload = {
        ...editing,
        categoryName: cat?.name || editing.categoryName || 'Fertilizers',
        brandName: brand?.name || editing.brandName || 'Store Brand',
        slug: (editing.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        updatedAt: serverTimestamp(),
        createdAt: editing.createdAt || serverTimestamp(),
      };
      await setDoc(doc(db, 'products', editing.id), payload, { merge: true });
      await logAdminAudit('UPSERT_PRODUCT', 'products', editing.id, `Saved ${editing.name}`);
      showToast(`Product ${editing.name} saved.`, 'success');
      setEditing(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `products/${editing.id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
    try {
      await deleteDoc(doc(db, 'products', p.id));
      await logAdminAudit('DELETE_PRODUCT', 'products', p.id, `Deleted ${p.name}`);
      showToast(`Deleted ${p.name}`, 'info');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${p.id}`);
    }
  };

  const handleCsvExport = () => {
    const headers = ['id', 'sku', 'name', 'categoryId', 'brandName', 'mrp', 'price', 'costPrice', 'gstRate', 'hsnCode', 'stock'];
    const rows = products.map((p) =>
      headers.map((h) => `"${String((p as unknown as Record<string, unknown>)[h] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'laksmi-products.csv';
    a.click();
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return;
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx] || '';
      });
      if (!row.name || !row.sku) continue;
      const id = row.id || `csv_${Date.now()}_${i}`;
      const mrp = Number(row.mrp) || 500;
      const price = Number(row.price) || mrp;
      const stock = Number(row.stock) || 20;
      await setDoc(
        doc(db, 'products', id),
        {
          id,
          name: row.name,
          slug: row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          sku: row.sku,
          categoryId: row.categoryId || 'cat-fertilizers',
          categoryName: categories.find((c) => c.id === row.categoryId)?.name || 'Fertilizers',
          subcategory: '',
          brandId: 'brand-greenharvest',
          brandName: row.brandName || 'GreenHarvest Agri',
          description: row.description || row.name,
          mrp,
          price,
          costPrice: Number(row.costPrice) || 0,
          gstRate: Number(row.gstRate) || 5,
          hsnCode: row.hsnCode || '3105',
          stock,
          minStockAlert: 10,
          images: [IMG_PROD_NPK],
          packSizes: [{ label: 'Standard Pack', mrp, price, stock }],
          specifications: 'Imported via CSV',
          manufacturer: row.brandName || 'Agri Supplier',
          licenseRequirement: 'none',
          cropTags: ['Paddy'],
          season: 'All',
          usageInstructions: 'Follow approved pack label.',
          safetyInstructions: 'Store in dry area.',
          isFeatured: false,
          isBestSeller: false,
          isTodaysDeal: false,
          active: true,
          ratingAvg: 4.5,
          ratingCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      imported++;
    }
    showToast(`Imported ${imported} products from CSV.`, 'success');
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products by name, SKU, category..."
          className="border border-neutral-200 rounded-lg px-3 py-2 text-xs w-64 bg-white"
        />
        <div className="flex flex-wrap gap-2 text-xs">
          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 bg-white font-semibold cursor-pointer hover:bg-neutral-50">
            <Upload className="w-3.5 h-3.5" />
            Import CSV
            <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
          </label>
          <button
            onClick={handleCsvExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 bg-white font-semibold hover:bg-neutral-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#176B3A] text-white font-bold"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200 text-left">
              <th className="py-3 px-3">Product</th>
              <th className="py-3 px-3">SKU</th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3 text-right">MRP / Price</th>
              <th className="py-3 px-3 text-right">GST</th>
              <th className="py-3 px-3 text-right">Stock</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-[#F3F8F1]/40">
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2.5">
                    <SafeImage src={p.images[0]} alt={p.name} className="w-9 h-9 rounded object-cover shrink-0" />
                    <div>
                      <p className="font-semibold text-[#252525]">{p.name}</p>
                      <p className="text-[11px] text-neutral-500">{p.brandName}</p>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-3 font-mono-num">{p.sku}</td>
                <td className="py-2.5 px-3">{p.categoryName}</td>
                <td className="py-2.5 px-3 text-right tabular-nums">
                  <span className="text-neutral-400 line-through mr-1">₹{p.mrp}</span>
                  <strong>₹{p.price}</strong>
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums">{p.gstRate}%</td>
                <td className="py-2.5 px-3 text-right tabular-nums font-bold">
                  <span className={p.stock <= p.minStockAlert ? 'text-red-600' : 'text-[#176B3A]'}>{p.stock}</span>
                </td>
                <td className="py-2.5 px-3">
                  <span className={p.active ? 'text-[#176B3A] font-semibold' : 'text-neutral-400'}>
                    {p.active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => setEditing(p)} className="text-[#176B3A] hover:underline font-semibold">
                    <Edit3 className="w-3.5 h-3.5 inline mr-1" />
                    Edit
                  </button>
                  <button onClick={() => handleDelete(p)} className="text-red-600 hover:underline font-semibold">
                    <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Product Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs"
          >
            <h3 className="font-display font-bold text-lg text-[#252525]">Save Agricultural Product</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Product Name (English) *</label>
                <input
                  required
                  value={editing.name || ''}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Product Name (Telugu)</label>
                <input
                  value={editing.nameTe || ''}
                  onChange={(e) => setEditing({ ...editing, nameTe: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">SKU *</label>
                <input
                  required
                  value={editing.sku || ''}
                  onChange={(e) => setEditing({ ...editing, sku: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 font-mono-num"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Category *</label>
                <select
                  value={editing.categoryId}
                  onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Subcategory</label>
                <input
                  value={editing.subcategory || ''}
                  onChange={(e) => setEditing({ ...editing, subcategory: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Brand</label>
                <select
                  value={editing.brandId}
                  onChange={(e) => setEditing({ ...editing, brandId: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">MRP (₹) *</label>
                <input
                  type="number"
                  required
                  value={editing.mrp ?? 0}
                  onChange={(e) => setEditing({ ...editing, mrp: Number(e.target.value) })}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Selling Price (₹) *</label>
                <input
                  type="number"
                  required
                  value={editing.price ?? 0}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      price: Number(e.target.value),
                      packSizes: [
                        {
                          label: editing.packSizes?.[0]?.label || 'Standard Pack',
                          mrp: editing.mrp || Number(e.target.value),
                          price: Number(e.target.value),
                          stock: editing.stock || 0,
                        },
                      ],
                    })
                  }
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Cost Price (₹, for Profit Reports)</label>
                <input
                  type="number"
                  value={editing.costPrice ?? 0}
                  onChange={(e) => setEditing({ ...editing, costPrice: Number(e.target.value) })}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">GST %</label>
                  <input
                    type="number"
                    value={editing.gstRate ?? 5}
                    onChange={(e) => setEditing({ ...editing, gstRate: Number(e.target.value) })}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">HSN Code</label>
                  <input
                    value={editing.hsnCode || ''}
                    onChange={(e) => setEditing({ ...editing, hsnCode: e.target.value })}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 font-mono-num"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Stock Qty</label>
                  <input
                    type="number"
                    value={editing.stock ?? 0}
                    onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Min Stock Alert</label>
                  <input
                    type="number"
                    value={editing.minStockAlert ?? 10}
                    onChange={(e) => setEditing({ ...editing, minStockAlert: Number(e.target.value) })}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Season</label>
                <select
                  value={editing.season || 'All'}
                  onChange={(e) => setEditing({ ...editing, season: e.target.value as CropSeason })}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                >
                  <option value="All">All Seasons</option>
                  <option value="Kharif">Kharif</option>
                  <option value="Rabi">Rabi</option>
                  <option value="Summer">Summer</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Compliance Requirement</label>
                <select
                  value={editing.licenseRequirement || 'none'}
                  onChange={(e) =>
                    setEditing({ ...editing, licenseRequirement: e.target.value as LicenseRequirement })
                  }
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                >
                  <option value="none">None</option>
                  <option value="farmer_declaration">Farmer Safe Usage Declaration</option>
                  <option value="licensed_buyer">Licensed Buyer / Dealer Verification</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Registration / License Info</label>
                <input
                  value={editing.registrationNumber || ''}
                  onChange={(e) => setEditing({ ...editing, registrationNumber: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Batch Number & Expiry Date</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={editing.batchNumber || ''}
                    onChange={(e) => setEditing({ ...editing, batchNumber: e.target.value })}
                    placeholder="Batch #"
                    className="border border-neutral-200 rounded-lg px-2 py-2"
                  />
                  <input
                    type="date"
                    value={editing.expiryDate || ''}
                    onChange={(e) => setEditing({ ...editing, expiryDate: e.target.value })}
                    className="border border-neutral-200 rounded-lg px-2 py-2"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Image URL</label>
                <input
                  value={editing.images?.[0] || ''}
                  onChange={(e) => setEditing({ ...editing, images: [e.target.value] })}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Description & Label Instructions</label>
                <textarea
                  rows={2}
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Safety & Storage Instructions</label>
                <textarea
                  rows={2}
                  value={editing.safetyInstructions || ''}
                  onChange={(e) => setEditing({ ...editing, safetyInstructions: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              {[
                { k: 'active', label: 'Active' },
                { k: 'isFeatured', label: 'Featured' },
                { k: 'isBestSeller', label: 'Best Seller' },
                { k: 'isTodaysDeal', label: "Today's Deal" },
              ].map((t) => (
                <label key={t.k} className="flex items-center gap-1.5 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean((editing as Record<string, unknown>)[t.k])}
                    onChange={(e) => setEditing({ ...editing, [t.k]: e.target.checked })}
                    className="accent-[#176B3A]"
                  />
                  {t.label}
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#176B3A] text-white font-bold"
              >
                {saving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export const AdminCategoriesPanel: React.FC = () => {
  const { categories, showToast } = useStore();
  const [name, setName] = useState('');
  const [nameTe, setNameTe] = useState('');
  const [subs, setSubs] = useState('');
  const [sortOrder, setSortOrder] = useState(categories.length + 1);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `cat-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    await setDoc(doc(db, 'categories', id), {
      name,
      nameTe,
      slug: id,
      image: IMG_PROD_NPK,
      subcategories: subs.split(',').map((s) => s.trim()).filter(Boolean),
      sortOrder,
      active: true,
    });
    setName('');
    setNameTe('');
    setSubs('');
    showToast('Category saved.', 'success');
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-neutral-200 p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category Name (EN) *"
          className="border border-neutral-200 rounded-lg px-3 py-2"
        />
        <input
          value={nameTe}
          onChange={(e) => setNameTe(e.target.value)}
          placeholder="Category Name (TE)"
          className="border border-neutral-200 rounded-lg px-3 py-2"
        />
        <input
          value={subs}
          onChange={(e) => setSubs(e.target.value)}
          placeholder="Subcategories (comma separated)"
          className="border border-neutral-200 rounded-lg px-3 py-2"
        />
        <div className="flex gap-2">
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="w-20 border border-neutral-200 rounded-lg px-2 py-2"
          />
          <button type="submit" className="flex-1 bg-[#176B3A] text-white font-bold rounded-lg px-3 py-2">
            Add Category
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200 text-left">
              <th className="py-3 px-4">Order</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Subcategories</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {categories.map((cat: Category) => (
              <tr key={cat.id}>
                <td className="py-2.5 px-4 tabular-nums">{cat.sortOrder}</td>
                <td className="py-2.5 px-4 font-semibold">
                  {cat.name} / {cat.nameTe}
                </td>
                <td className="py-2.5 px-4 text-neutral-600">{cat.subcategories.join(', ')}</td>
                <td className="py-2.5 px-4">
                  <button
                    onClick={() => updateDoc(doc(db, 'categories', cat.id), { active: !cat.active })}
                    className={`font-semibold ${cat.active ? 'text-[#176B3A]' : 'text-neutral-400'}`}
                  >
                    {cat.active ? 'Enabled' : 'Disabled'}
                  </button>
                </td>
                <td className="py-2.5 px-4 text-right">
                  <button
                    onClick={() => deleteDoc(doc(db, 'categories', cat.id))}
                    className="text-red-600 font-semibold hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const AdminBrandsPanel: React.FC = () => {
  const { brands, showToast } = useStore();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `brand-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    await setDoc(doc(db, 'brands', id), { name, description: desc, featured: true, active: true });
    setName('');
    setDesc('');
    showToast('Brand saved.', 'success');
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-neutral-200 p-5 flex flex-wrap gap-3 text-xs">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Brand Name *"
          className="border border-neutral-200 rounded-lg px-3 py-2 flex-1 min-w-[200px]"
        />
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Short description"
          className="border border-neutral-200 rounded-lg px-3 py-2 flex-1 min-w-[240px]"
        />
        <button type="submit" className="px-4 py-2 rounded-lg bg-[#176B3A] text-white font-bold">
          Add Brand
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {brands.map((b: Brand) => (
          <div key={b.id} className="bg-white rounded-xl border border-neutral-200 p-4 flex justify-between items-start text-xs">
            <div>
              <p className="font-bold text-sm text-[#252525]">{b.name}</p>
              <p className="text-neutral-500 mt-1">{b.description}</p>
            </div>
            <button
              onClick={() => updateDoc(doc(db, 'brands', b.id), { active: !b.active })}
              className={`font-semibold ${b.active ? 'text-[#176B3A]' : 'text-neutral-400'}`}
            >
              {b.active ? 'Active' : 'Hidden'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AdminInventoryPanel: React.FC = () => {
  const { products, allSuppliers, allStockMovements, firebaseUser, showToast } = useStore();
  const [selectedProdId, setSelectedProdId] = useState(products[0]?.id || '');
  const [adjustQty, setAdjustQty] = useState(10);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [batchNo, setBatchNo] = useState('');
  const [note, setNote] = useState('');

  // Supplier Add
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');

  const handleStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === selectedProdId);
    if (!prod || !firebaseUser) return;
    const prev = prod.stock;
    const next =
      adjustType === 'IN' ? prev + adjustQty : adjustType === 'OUT' ? Math.max(0, prev - adjustQty) : adjustQty;
    await updateDoc(doc(db, 'products', prod.id), {
      stock: next,
      ...(batchNo ? { batchNumber: batchNo } : {}),
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'stockMovements', `mov_${Date.now()}`), {
      productId: prod.id,
      productName: prod.name,
      type: adjustType,
      quantity: adjustQty,
      previousStock: prev,
      newStock: next,
      batchNumber: batchNo || prod.batchNumber || '',
      note: note || `Admin ${adjustType}`,
      actorUid: firebaseUser.uid,
      createdAt: serverTimestamp(),
    });
    showToast(`Updated stock for ${prod.name}: ${prev} → ${next}`, 'success');
    setNote('');
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    await setDoc(doc(db, 'suppliers', `sup_${Date.now()}`), {
      name: supName,
      contactPerson: '',
      phone: supPhone,
      email: '',
      gstin: '',
      address: '',
      active: true,
    });
    setSupName('');
    setSupPhone('');
    showToast('Supplier added.', 'success');
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleStockUpdate} className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3 text-xs">
        <h3 className="font-display font-bold text-base">Stock In / Stock Out / Adjustment & Purchase Entry</h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <select
            value={selectedProdId}
            onChange={(e) => setSelectedProdId(e.target.value)}
            className="sm:col-span-2 border border-neutral-200 rounded-lg px-3 py-2"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (Stock: {p.stock})
              </option>
            ))}
          </select>
          <select
            value={adjustType}
            onChange={(e) => setAdjustType(e.target.value as 'IN' | 'OUT' | 'ADJUSTMENT')}
            className="border border-neutral-200 rounded-lg px-3 py-2"
          >
            <option value="IN">Stock IN (+)</option>
            <option value="OUT">Stock OUT (-)</option>
            <option value="ADJUSTMENT">Set Exact Qty</option>
          </select>
          <input
            type="number"
            min={0}
            value={adjustQty}
            onChange={(e) => setAdjustQty(Number(e.target.value))}
            className="border border-neutral-200 rounded-lg px-3 py-2"
          />
          <input
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
            placeholder="Batch #"
            className="border border-neutral-200 rounded-lg px-3 py-2"
          />
        </div>
        <div className="flex gap-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Purchase invoice # or adjustment note"
            className="flex-1 border border-neutral-200 rounded-lg px-3 py-2"
          />
          <button type="submit" className="px-5 py-2 rounded-lg bg-[#176B3A] text-white font-bold">
            Record Movement
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h3 className="font-display font-bold text-sm mb-3">Low & Out-of-Stock Alerts</h3>
          <div className="space-y-2 text-xs">
            {products
              .filter((p) => p.stock <= p.minStockAlert)
              .map((p) => (
                <div key={p.id} className="flex justify-between py-2 border-b border-neutral-100">
                  <span className="font-medium">{p.name}</span>
                  <span className="font-bold text-red-600 tabular-nums">
                    {p.stock} left (Min: {p.minStockAlert})
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Suppliers */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3 text-xs">
          <h3 className="font-display font-bold text-sm">Suppliers</h3>
          <form onSubmit={handleAddSupplier} className="flex gap-2">
            <input
              required
              value={supName}
              onChange={(e) => setSupName(e.target.value)}
              placeholder="Supplier Name"
              className="flex-1 border border-neutral-200 rounded-lg px-2.5 py-1.5"
            />
            <input
              value={supPhone}
              onChange={(e) => setSupPhone(e.target.value)}
              placeholder="Phone"
              className="w-28 border border-neutral-200 rounded-lg px-2.5 py-1.5"
            />
            <button type="submit" className="px-3 py-1.5 rounded-lg bg-[#176B3A] text-white font-bold">
              Add
            </button>
          </form>
          <div className="divide-y divide-neutral-100">
            {allSuppliers.map((s) => (
              <div key={s.id} className="py-2 flex justify-between">
                <span className="font-semibold">{s.name}</span>
                <span className="text-neutral-500">{s.phone}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stock Movement Trail */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="font-display font-bold text-sm mb-3">Stock Movement History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-left">
                <th className="py-2 px-3">Product</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3 text-right">Qty</th>
                <th className="py-2 px-3 text-right">Prev → New</th>
                <th className="py-2 px-3">Batch</th>
                <th className="py-2 px-3">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {allStockMovements.slice(0, 20).map((m) => (
                <tr key={m.id}>
                  <td className="py-2 px-3 font-medium">{m.productName}</td>
                  <td className="py-2 px-3 font-bold">{m.type}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{m.quantity}</td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {m.previousStock} → {m.newStock}
                  </td>
                  <td className="py-2 px-3 font-mono-num">{m.batchNumber || '-'}</td>
                  <td className="py-2 px-3 text-neutral-600">{m.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const AdminCouponsPanel: React.FC = () => {
  const { coupons, showToast } = useStore();
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValue, setDiscountValue] = useState(10);
  const [minOrderValue, setMinOrderValue] = useState(1000);
  const [expiryDate, setExpiryDate] = useState('2027-12-31');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    await setDoc(doc(db, 'coupons', `cp_${clean}`), {
      code: clean,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount: discountType === 'PERCENT' ? 500 : discountValue,
      expiryDate,
      usedCount: 0,
      active: true,
    });
    setCode('');
    showToast(`Coupon ${clean} created.`, 'success');
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-neutral-200 p-5 grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
        <input
          required
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Coupon Code (e.g. RABI15)"
          className="border border-neutral-200 rounded-lg px-3 py-2 font-mono-num"
        />
        <select
          value={discountType}
          onChange={(e) => setDiscountType(e.target.value as 'PERCENT' | 'FIXED')}
          className="border border-neutral-200 rounded-lg px-3 py-2"
        >
          <option value="PERCENT">Percentage (%)</option>
          <option value="FIXED">Fixed Amount (₹)</option>
        </select>
        <input
          type="number"
          value={discountValue}
          onChange={(e) => setDiscountValue(Number(e.target.value))}
          placeholder="Value"
          className="border border-neutral-200 rounded-lg px-3 py-2"
        />
        <input
          type="number"
          value={minOrderValue}
          onChange={(e) => setMinOrderValue(Number(e.target.value))}
          placeholder="Min Order (₹)"
          className="border border-neutral-200 rounded-lg px-3 py-2"
        />
        <button type="submit" className="bg-[#176B3A] text-white font-bold rounded-lg px-4 py-2">
          Create Coupon
        </button>
      </form>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200 text-left">
              <th className="py-3 px-4">Code</th>
              <th className="py-3 px-4">Discount</th>
              <th className="py-3 px-4">Min Order</th>
              <th className="py-3 px-4">Expiry</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {coupons.map((c: Coupon) => (
              <tr key={c.id}>
                <td className="py-2.5 px-4 font-mono-num font-bold">{c.code}</td>
                <td className="py-2.5 px-4">
                  {c.discountType === 'PERCENT' ? `${c.discountValue}%` : `₹${c.discountValue}`}
                </td>
                <td className="py-2.5 px-4 tabular-nums">₹{c.minOrderValue}</td>
                <td className="py-2.5 px-4">{c.expiryDate || '-'}</td>
                <td className="py-2.5 px-4">
                  <button
                    onClick={() => updateDoc(doc(db, 'coupons', c.id), { active: !c.active })}
                    className={`font-semibold ${c.active ? 'text-[#176B3A]' : 'text-neutral-400'}`}
                  >
                    {c.active ? 'Active' : 'Disabled'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const AdminBannersPanel: React.FC = () => {
  const { banners, showToast } = useStore();
  const [title, setTitle] = useState('');
  const [titleTe, setTitleTe] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState(IMG_PROD_NPK);
  const [placement, setPlacement] = useState<'hero' | 'promo'>('hero');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `banner_${Date.now()}`;
    await setDoc(doc(db, 'banners', id), {
      title,
      titleTe,
      subtitle,
      subtitleTe: subtitle,
      ctaText: 'Shop Now',
      ctaLink: 'catalog',
      imageUrl,
      placement,
      sortOrder: banners.length + 1,
      active: true,
    });
    setTitle('');
    setTitleTe('');
    setSubtitle('');
    showToast('Homepage banner added.', 'success');
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-neutral-200 p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Banner Headline (EN) *"
          className="border border-neutral-200 rounded-lg px-3 py-2"
        />
        <input
          value={titleTe}
          onChange={(e) => setTitleTe(e.target.value)}
          placeholder="Banner Headline (TE)"
          className="border border-neutral-200 rounded-lg px-3 py-2"
        />
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Subtitle"
          className="border border-neutral-200 rounded-lg px-3 py-2"
        />
        <select
          value={placement}
          onChange={(e) => setPlacement(e.target.value as 'hero' | 'promo')}
          className="border border-neutral-200 rounded-lg px-3 py-2"
        >
          <option value="hero">Hero Slider</option>
          <option value="promo">Promo Card Grid</option>
        </select>
        <input
          required
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Image URL"
          className="sm:col-span-2 border border-neutral-200 rounded-lg px-3 py-2"
        />
        <button type="submit" className="sm:col-span-2 py-2 rounded-lg bg-[#176B3A] text-white font-bold">
          Add Homepage Banner
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {banners.map((b: Banner) => (
          <div key={b.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden flex text-xs">
            <SafeImage src={b.imageUrl} alt={b.title} className="w-32 h-28 object-cover shrink-0" />
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#176B3A] uppercase">{b.placement}</span>
                <p className="font-bold text-sm text-[#252525]">{b.title}</p>
                <p className="text-neutral-500 line-clamp-1">{b.subtitle}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => updateDoc(doc(db, 'banners', b.id), { active: !b.active })}
                  className="font-semibold text-[#176B3A]"
                >
                  {b.active ? 'Active' : 'Hidden'}
                </button>
                <button
                  onClick={() => deleteDoc(doc(db, 'banners', b.id))}
                  className="font-semibold text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AdminReviewsPanel: React.FC = () => {
  const { reviews, questions, showToast } = useStore();
  const [answerMap, setAnswerMap] = useState<Record<string, string>>({});

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="font-display font-bold text-base mb-4">Customer Reviews Moderation</h3>
        <div className="space-y-3 text-xs">
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-neutral-100 pb-3 flex items-center justify-between gap-4">
              <div>
                <p className="font-bold">
                  {r.userName} · {r.rating}★
                </p>
                <p className="text-neutral-600">{r.comment}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => updateDoc(doc(db, 'reviews', r.id), { approved: !r.approved })}
                  className="px-3 py-1 rounded border font-semibold"
                >
                  {r.approved ? 'Hide' : 'Approve'}
                </button>
                <button
                  onClick={() => deleteDoc(doc(db, 'reviews', r.id))}
                  className="px-3 py-1 rounded border border-red-200 text-red-600 font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="font-display font-bold text-base mb-4">Product Questions (Q&A)</h3>
        {questions.length === 0 ? (
          <p className="text-xs text-neutral-500">No customer questions submitted yet.</p>
        ) : (
          <div className="space-y-3 text-xs">
            {questions.map((q) => (
              <div key={q.id} className="border-b border-neutral-100 pb-3 space-y-2">
                <p className="font-bold">
                  {q.userName}: {q.question}
                </p>
                <div className="flex gap-2">
                  <input
                    value={answerMap[q.id] ?? q.answer ?? ''}
                    onChange={(e) => setAnswerMap({ ...answerMap, [q.id]: e.target.value })}
                    placeholder="Write official agronomy/store reply..."
                    className="flex-1 border border-neutral-200 rounded px-3 py-1.5"
                  />
                  <button
                    onClick={async () => {
                      await updateDoc(doc(db, 'questions', q.id), { answer: answerMap[q.id] || '' });
                      showToast('Answer published.', 'success');
                    }}
                    className="px-3 py-1.5 rounded bg-[#176B3A] text-white font-semibold"
                  >
                    Save Reply
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
