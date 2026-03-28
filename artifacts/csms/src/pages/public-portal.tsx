import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, ChevronDown, Upload, Calendar, AlertCircle, Star } from 'lucide-react';
import { Link } from 'wouter';

interface PublicSettings {
  company_name: string;
  company_logo: string;
  primary_color: string;
  public_form_fields: string[];
}

interface ComplaintTypeField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

interface ComplaintType {
  id: number;
  name: string;
  description?: string;
  fields: ComplaintTypeField[];
  success_message?: string;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

async function fetchPublicSettings(): Promise<PublicSettings> {
  const res = await fetch(`${BASE}/api/public/settings`);
  if (!res.ok) throw new Error('Failed to load settings');
  return res.json() as Promise<PublicSettings>;
}

async function fetchComplaintTypes(): Promise<ComplaintType[]> {
  const res = await fetch(`${BASE}/api/public/complaint-types`);
  if (!res.ok) throw new Error('Failed to load complaint types');
  const json = await res.json() as { data: ComplaintType[] };
  return json.data;
}

async function submitComplaint(
  payload: Record<string, unknown>,
  file?: File | null,
): Promise<{ reference_number: string; success_message?: string }> {
  const formData = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'object') {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  }
  if (file) {
    formData.append('file', file);
  }
  const res = await fetch(`${BASE}/api/public/complaints`, {
    method: 'POST',
    body: formData,
  });
  const json = await res.json() as { reference_number: string; success_message?: string; error?: string };
  if (!res.ok) throw new Error(json.error ?? 'فشل الإرسال');
  return json;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'الاسم الكامل',
  phone: 'رقم الهاتف',
  email: 'البريد الإلكتروني',
  national_id: 'الرقم القومي',
  address: 'العنوان',
  governorate: 'المحافظة',
};

const GOVERNORATES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'البحيرة', 'المنوفية', 'القليوبية', 'الشرقية',
  'الغربية', 'كفر الشيخ', 'دمياط', 'بورسعيد', 'الإسماعيلية', 'السويس', 'شمال سيناء',
  'جنوب سيناء', 'الدقهلية', 'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج',
  'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد', 'مطروح',
];

export default function PublicPortal() {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [types, setTypes] = useState<ComplaintType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ reference_number: string; success_message?: string } | null>(null);
  const [submitError, setSubmitError] = useState('');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    national_id: '',
    address: '',
    governorate: '',
    type_id: '',
    date: new Date().toISOString().slice(0, 10),
    description: '',
  });
  const [dynamicFields, setDynamicFields] = useState<Record<string, string | number>>({});
  const [starRatings, setStarRatings] = useState<Record<string, number>>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    customer_name: string;
    complaints: { id: number; reference_number: string; status: string; created_at: string }[];
  } | null>(null);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);
  const lastCheckedPhone = useRef<string>('');

  useEffect(() => {
    Promise.all([fetchPublicSettings(), fetchComplaintTypes()])
      .then(([s, t]) => {
        setSettings(s);
        setTypes(t);
      })
      .catch(() => setError('فشل في تحميل البيانات'))
      .finally(() => setLoading(false));
  }, []);

  const selectedType = types.find(t => String(t.id) === form.type_id);
  const formFields: string[] = Array.isArray(settings?.public_form_fields) ? settings!.public_form_fields : ['name', 'phone', 'complaint_type', 'date'];

  const primaryColor = settings?.primary_color ?? '#6366f1';

  const checkDuplicate = async (phone: string) => {
    const trimmed = phone.trim();
    if (!trimmed || trimmed === lastCheckedPhone.current) return;
    lastCheckedPhone.current = trimmed;
    try {
      const res = await fetch(`${BASE}/api/public/check-customer?phone=${encodeURIComponent(trimmed)}`);
      if (!res.ok) return;
      const json = await res.json() as {
        exists: boolean;
        customer_name?: string;
        complaints?: { id: number; reference_number: string; status: string; created_at: string }[];
      };
      if (json.exists && json.complaints && json.complaints.length > 0) {
        setDuplicateInfo({ customer_name: json.customer_name ?? '', complaints: json.complaints });
        setDuplicateDismissed(false);
      } else {
        setDuplicateInfo(null);
      }
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!form.type_id) { setSubmitError('يرجى اختيار نوع الشكوى'); return; }
    if (!form.name.trim()) { setSubmitError('الاسم الكامل مطلوب'); return; }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        customer_name: form.name.trim(),
        customer_phone: form.phone.trim() || undefined,
        customer_email: form.email.trim() || undefined,
        customer_national_id: form.national_id.trim() || undefined,
        customer_address: form.address.trim() || undefined,
        customer_governorate: form.governorate || undefined,
        type_id: Number(form.type_id),
        description: form.description.trim() || undefined,
        date: form.date,
        fields_values: { ...dynamicFields, ...starRatings },
      };
      const result = await submitComplaint(payload, uploadedFile);
      setSubmitted(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل الإرسال، يرجى المحاولة مجدداً';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117] text-white">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-lg text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{ background: '#0f1117', direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif' }}
      dir="rtl"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-20"
          style={{ background: primaryColor }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[400px] h-[300px] rounded-full blur-[100px] opacity-10"
          style={{ background: primaryColor }}
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          {settings?.company_logo ? (
            <img
              src={settings.company_logo}
              alt="شعار الشركة"
              className="h-20 w-auto mx-auto mb-4 object-contain"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white shadow-2xl"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}99)` }}
            >
              {(settings?.company_name ?? 'ش').charAt(0)}
            </div>
          )}
          <h1 className="text-3xl font-bold text-white">{settings?.company_name ?? 'نظام إدارة خدمة العملاء'}</h1>
          <p className="text-gray-400 mt-2 text-lg">بوابة تقديم الشكاوى والاستفسارات</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-3xl p-10 text-center"
              style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: `${primaryColor}22` }}
              >
                <CheckCircle2 className="w-12 h-12" style={{ color: primaryColor }} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">تم إرسال شكواك بنجاح</h2>
              <p className="text-gray-400 mb-6">
                {submitted.success_message ?? 'شكراً لتواصلك معنا. سنقوم بمراجعة شكواك والرد عليك في أقرب وقت ممكن.'}
              </p>
              <div
                className="rounded-2xl py-4 px-6 mb-8 inline-block"
                style={{ background: `${primaryColor}22`, border: `1px solid ${primaryColor}44` }}
              >
                <p className="text-sm text-gray-400 mb-1">رقم المرجع</p>
                <p className="text-2xl font-bold font-mono" style={{ color: primaryColor }}>{submitted.reference_number}</p>
              </div>
              <p className="text-gray-500 text-sm mb-6">احتفظ برقم المرجع لمتابعة شكواك</p>
              <Button
                onClick={() => {
                  setSubmitted(null);
                  setForm(f => ({ ...f, type_id: '', description: '', date: new Date().toISOString().slice(0, 10) }));
                  setDynamicFields({});
                  setStarRatings({});
                }}
                className="h-12 px-8 rounded-xl text-white font-bold"
                style={{ background: primaryColor }}
              >
                تقديم شكوى جديدة
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-3xl p-8"
              style={{ background: '#1a1d27', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <h2 className="text-xl font-bold text-white mb-6">تقديم شكوى / استفسار</h2>

              {submitError && (
                <div className="mb-4 p-3 rounded-xl flex items-center gap-2 text-red-300 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {submitError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {formFields.includes('name') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">{FIELD_LABELS.name} <span className="text-red-400">*</span></label>
                    <Input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      required
                      placeholder="أدخل اسمك الكامل"
                      className="h-12 rounded-xl text-white placeholder-gray-500"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                )}

                {formFields.includes('phone') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">{FIELD_LABELS.phone}</label>
                    <Input
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      onBlur={e => checkDuplicate(e.target.value)}
                      placeholder="01xxxxxxxxx"
                      dir="ltr"
                      className="h-12 rounded-xl text-white placeholder-gray-500"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                    {duplicateInfo && !duplicateDismissed && (
                      <div
                        className="rounded-xl p-4 mt-2"
                        style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)' }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-yellow-300 text-sm font-semibold mb-1">
                                رقم الهاتف مسجل بالفعل باسم: {duplicateInfo.customer_name}
                              </p>
                              <p className="text-yellow-400/80 text-xs mb-2">
                                الشكاوى المسجلة لهذا الرقم:
                              </p>
                              <div className="space-y-1">
                                {duplicateInfo.complaints.map(c => (
                                  <div key={c.id} className="flex items-center gap-2 text-xs">
                                    <span className="font-mono text-yellow-300 font-bold">{c.reference_number}</span>
                                    <span className="text-yellow-400/60">—</span>
                                    <span className="text-yellow-400/80">{c.status}</span>
                                    <span className="text-yellow-400/50">
                                      ({new Date(c.created_at).toLocaleDateString('ar-EG')})
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <p className="text-yellow-400/60 text-xs mt-2">
                                يمكنك المتابعة وتقديم شكوى جديدة إذا كانت مختلفة عن الشكاوى السابقة.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDuplicateDismissed(true)}
                            className="text-yellow-400/60 hover:text-yellow-400 flex-shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {formFields.includes('email') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">{FIELD_LABELS.email}</label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="example@email.com"
                      dir="ltr"
                      className="h-12 rounded-xl text-white placeholder-gray-500"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                )}

                {formFields.includes('national_id') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">{FIELD_LABELS.national_id}</label>
                    <Input
                      value={form.national_id}
                      onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))}
                      placeholder="14 رقم"
                      dir="ltr"
                      className="h-12 rounded-xl text-white placeholder-gray-500"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                )}

                {formFields.includes('governorate') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">{FIELD_LABELS.governorate}</label>
                    <div className="relative">
                      <select
                        value={form.governorate}
                        onChange={e => setForm(f => ({ ...f, governorate: e.target.value }))}
                        className="w-full h-12 rounded-xl px-3 text-sm appearance-none text-white"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <option value="" className="bg-gray-900">اختر المحافظة</option>
                        {GOVERNORATES.map(g => <option key={g} value={g} className="bg-gray-900">{g}</option>)}
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {formFields.includes('address') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">{FIELD_LABELS.address}</label>
                    <Input
                      value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      placeholder="أدخل عنوانك"
                      className="h-12 rounded-xl text-white placeholder-gray-500"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                )}

                {formFields.includes('complaint_type') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">نوع الشكوى / الاستفسار <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <select
                        value={form.type_id}
                        onChange={e => {
                          setForm(f => ({ ...f, type_id: e.target.value }));
                          setDynamicFields({});
                          setStarRatings({});
                        }}
                        required
                        className="w-full h-12 rounded-xl px-3 text-sm appearance-none text-white"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <option value="" className="bg-gray-900">اختر نوع الشكوى</option>
                        {types.map(t => <option key={t.id} value={t.id} className="bg-gray-900">{t.name}</option>)}
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {formFields.includes('date') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      تاريخ الحادثة
                    </label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      max={new Date().toISOString().slice(0, 10)}
                      dir="ltr"
                      className="h-12 rounded-xl text-white"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                )}

                {selectedType && selectedType.fields.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-sm font-semibold text-gray-400 mb-4">تفاصيل إضافية لـ "{selectedType.name}"</p>
                      {selectedType.fields.map(field => (
                        <div key={field.name} className="space-y-2 mb-4">
                          <label className="text-sm font-medium text-gray-300">
                            {field.label}
                            {field.required && <span className="text-red-400 mr-1">*</span>}
                          </label>

                          {field.type === 'text' && (
                            <Input
                              value={String(dynamicFields[field.name] ?? '')}
                              onChange={e => setDynamicFields(f => ({ ...f, [field.name]: e.target.value }))}
                              required={field.required}
                              className="h-12 rounded-xl text-white placeholder-gray-500"
                              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                            />
                          )}

                          {field.type === 'textarea' && (
                            <textarea
                              value={String(dynamicFields[field.name] ?? '')}
                              onChange={e => setDynamicFields(f => ({ ...f, [field.name]: e.target.value }))}
                              required={field.required}
                              rows={3}
                              className="w-full rounded-xl px-3 py-3 text-sm text-white placeholder-gray-500 resize-none"
                              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                            />
                          )}

                          {field.type === 'number' && (
                            <Input
                              type="number"
                              value={String(dynamicFields[field.name] ?? '')}
                              onChange={e => setDynamicFields(f => ({ ...f, [field.name]: e.target.value }))}
                              required={field.required}
                              className="h-12 rounded-xl text-white"
                              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                            />
                          )}

                          {field.type === 'date' && (
                            <Input
                              type="date"
                              value={String(dynamicFields[field.name] ?? '')}
                              onChange={e => setDynamicFields(f => ({ ...f, [field.name]: e.target.value }))}
                              required={field.required}
                              dir="ltr"
                              className="h-12 rounded-xl text-white"
                              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                            />
                          )}

                          {field.type === 'select' && field.options && (
                            <div className="relative">
                              <select
                                value={String(dynamicFields[field.name] ?? '')}
                                onChange={e => setDynamicFields(f => ({ ...f, [field.name]: e.target.value }))}
                                required={field.required}
                                className="w-full h-12 rounded-xl px-3 text-sm appearance-none text-white"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                              >
                                <option value="" className="bg-gray-900">اختر...</option>
                                {field.options.map(opt => <option key={opt} value={opt} className="bg-gray-900">{opt}</option>)}
                              </select>
                              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                          )}

                          {field.type === 'stars' && (
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map(star => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setStarRatings(f => ({ ...f, [field.name]: star }))}
                                  className="transition-transform hover:scale-110"
                                >
                                  <Star
                                    className="w-8 h-8"
                                    fill={(starRatings[field.name] ?? 0) >= star ? primaryColor : 'transparent'}
                                    style={{ color: (starRatings[field.name] ?? 0) >= star ? primaryColor : '#6b7280' }}
                                  />
                                </button>
                              ))}
                            </div>
                          )}

                          {field.type === 'file' && (
                            <label
                              className="flex items-center gap-3 h-12 rounded-xl px-4 cursor-pointer transition-colors"
                              style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)' }}
                            >
                              <Upload className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-400">
                                {uploadedFile ? uploadedFile.name : 'اختر ملف أو صورة'}
                              </span>
                              <input
                                type="file"
                                className="hidden"
                                onChange={e => setUploadedFile(e.target.files?.[0] ?? null)}
                              />
                            </label>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">وصف الشكوى (اختياري)</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={4}
                    placeholder="أدخل تفاصيل إضافية حول شكواك..."
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 resize-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 rounded-xl font-bold text-white text-base transition-all hover:opacity-90 hover:-translate-y-0.5 shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`, boxShadow: `0 8px 24px ${primaryColor}40` }}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري الإرسال...
                    </span>
                  ) : 'إرسال الشكوى'}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
      <Link
        href="/login"
        className="fixed bottom-4 right-4 text-xs text-gray-700 hover:text-gray-500 transition-colors z-50"
      >
        الإدارة
      </Link>
    </div>
  );
}
