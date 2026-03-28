import { useState, useRef, Fragment } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Save, Building2, Users, Tags, GitBranch, Upload,
  CheckCircle2, AlertCircle, Mail, Star, Palette, Shield,
  Plus, Trash2, MapPin, Pencil, X, Eye, EyeOff, Globe,
} from 'lucide-react';
import {
  useGetSettings, useUpsertSettings,
  useListUsers, useListComplaintTypes, useListBranches,
  useCreateComplaintType, useUpdateComplaintType, useDeleteComplaintType,
  useCreateBranch, useDeleteBranch,
  useCreateUser, useUpdateUser, useDeleteUser,
  useListRoles,
  ComplaintTypeFieldType,
} from '@workspace/api-client-react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

type RatingQuestion = { id: number; text: string; sort_order: number; is_active: boolean };

function useRatingQuestions() {
  return useQuery<RatingQuestion[]>({
    queryKey: ['ratingQuestions'],
    queryFn: async () => {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/rating-questions', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      return (json.data ?? []) as RatingQuestion[];
    },
  });
}

function useCreateRatingQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { text: string; sort_order?: number }) => {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/rating-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('فشل الإضافة');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ratingQuestions'] }),
  });
}

function useDeleteRatingQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/rating-questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('فشل الحذف');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ratingQuestions'] }),
  });
}

type Section = 'company' | 'users' | 'types' | 'branches' | 'import' | 'email' | 'points' | 'appearance' | 'security' | 'rating' | 'portal';

interface ImportResult {
  added_customers?: number;
  updated_customers?: number;
  added_invoices?: number;
  duplicate_invoices?: number;
  warnings?: { row?: number; field?: string; reason?: string }[];
  errors?: string[];
}

type SettingsRecord = Record<string, string | number | boolean | undefined>;

type TypeFieldDraft = { _id: string; label: string; name: string; type: ComplaintTypeFieldType; required: boolean; options: string };
type TypeFormData = { name: string; description: string; category: string; is_active: boolean };
type UserForm = { name: string; email: string; password: string; role_id: string };

const emptyTypeForm: TypeFormData = { name: '', description: '', category: '', is_active: true };
const emptyUserForm: UserForm = { name: '', email: '', password: '', role_id: '' };

export default function Settings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>('company');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'customers_only' | 'customers_and_invoices'>('customers_only');
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const { data: rawSettings } = useGetSettings();
  const settings = (rawSettings as unknown as SettingsRecord) ?? {};
  const { mutateAsync: upsert } = useUpsertSettings();
  const { data: usersData, refetch: refetchUsers } = useListUsers(undefined, { query: { queryKey: ['listUsers'], enabled: section === 'users' } });
  const { data: rolesData } = useListRoles({ query: { queryKey: ['listRoles'] } });
  const { data: typesData } = useListComplaintTypes({ query: { queryKey: ['listComplaintTypes'] } });
  const { data: branchesData } = useListBranches({ query: { queryKey: ['listBranches'] } });
  const { mutateAsync: createType } = useCreateComplaintType();
  const { mutateAsync: updateType } = useUpdateComplaintType();
  const { mutateAsync: deleteType } = useDeleteComplaintType();
  const { mutateAsync: createBranch } = useCreateBranch();
  const { mutateAsync: deleteBranch } = useDeleteBranch();
  const { mutateAsync: createUser } = useCreateUser();
  const { mutateAsync: updateUser } = useUpdateUser();
  const { mutateAsync: deleteUser } = useDeleteUser();

  const { data: ratingQuestions, isLoading: loadingRQ } = useRatingQuestions();
  const { mutateAsync: createRatingQ, isPending: addingRQ } = useCreateRatingQuestion();
  const { mutateAsync: deleteRatingQ } = useDeleteRatingQuestion();
  const [newQuestionText, setNewQuestionText] = useState('');

  const handleAddRatingQuestion = async () => {
    if (!newQuestionText.trim()) return;
    try {
      await createRatingQ({ text: newQuestionText.trim(), sort_order: (ratingQuestions?.length ?? 0) });
      setNewQuestionText('');
      toast({ title: 'تم الإضافة', description: 'تم إضافة السؤال بنجاح' });
    } catch {
      toast({ title: 'خطأ', description: 'فشل في إضافة السؤال', variant: 'destructive' });
    }
  };

  const handleDeleteRatingQuestion = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    try {
      await deleteRatingQ(id);
      toast({ title: 'تم الحذف' });
    } catch {
      toast({ title: 'خطأ', description: 'فشل في الحذف', variant: 'destructive' });
    }
  };

  const [showTypeForm, setShowTypeForm] = useState(false);
  const [typeFormMode, setTypeFormMode] = useState<'add' | 'edit'>('add');
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null);
  const [typeFormData, setTypeFormData] = useState<TypeFormData>(emptyTypeForm);
  const [typeFormFields, setTypeFormFields] = useState<TypeFieldDraft[]>([]);
  const [showTypePreview, setShowTypePreview] = useState(false);
  const [savingType, setSavingType] = useState(false);

  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchGov, setNewBranchGov] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');

  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState<UserForm>(emptyUserForm);
  const [newUserPwdVisible, setNewUserPwdVisible] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUserForm, setEditUserForm] = useState<UserForm>(emptyUserForm);
  const [editUserPwdVisible, setEditUserPwdVisible] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [addingBranch, setAddingBranch] = useState(false);

  const [portalForm, setPortalForm] = useState({
    primary_color: String(settings.primary_color ?? '#6366f1'),
    company_logo: String(settings.company_logo ?? ''),
    public_form_fields: Array.isArray(settings.public_form_fields)
      ? (settings.public_form_fields as string[])
      : ['name', 'phone', 'complaint_type', 'date'],
  });
  const [portalLogoUploading, setPortalLogoUploading] = useState(false);
  const portalLogoRef = useRef<HTMLInputElement>(null);

  const [typeSuccessMessages, setTypeSuccessMessages] = useState<Record<number, string>>({});
  const [savingSuccessMsg, setSavingSuccessMsg] = useState<Record<number, boolean>>({});

  const openAddTypeForm = () => {
    setTypeFormMode('add');
    setEditingTypeId(null);
    setTypeFormData(emptyTypeForm);
    setTypeFormFields([]);
    setShowTypePreview(false);
    setShowTypeForm(true);
  };

  const openEditTypeForm = (tp: { id: number; name: string; description?: string; category?: string; is_active?: boolean; fields: { name: string; label: string; type: string; required: boolean; options?: string[] }[] }) => {
    setTypeFormMode('edit');
    setEditingTypeId(tp.id);
    setTypeFormData({ name: tp.name, description: tp.description ?? '', category: tp.category ?? '', is_active: tp.is_active !== false });
    setTypeFormFields(tp.fields.map(f => ({
      _id: Math.random().toString(36).slice(2),
      label: f.label,
      name: f.name,
      type: f.type as ComplaintTypeFieldType,
      required: f.required,
      options: (f.options ?? []).join(', '),
    })));
    setShowTypePreview(false);
    setShowTypeForm(true);
  };

  const addTypeField = () => {
    setTypeFormFields(prev => [...prev, { _id: Math.random().toString(36).slice(2), label: '', name: '', type: ComplaintTypeFieldType.text, required: false, options: '' }]);
  };

  const removeTypeField = (_id: string) => setTypeFormFields(prev => prev.filter(f => f._id !== _id));

  const updateTypeField = (_id: string, patch: Partial<TypeFieldDraft>) => {
    setTypeFormFields(prev => prev.map(f => {
      if (f._id !== _id) return f;
      const updated = { ...f, ...patch };
      if (patch.label !== undefined && !updated.name) updated.name = patch.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      return updated;
    }));
  };

  const handleSaveType = async () => {
    if (!typeFormData.name.trim()) return;
    setSavingType(true);
    try {
      const fields = typeFormFields.filter(f => f.label.trim()).map(f => ({
        name: f.name || f.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || `field_${f._id}`,
        label: f.label.trim(),
        type: f.type,
        required: f.required,
        options: f.type === ComplaintTypeFieldType.select ? f.options.split(',').map(o => o.trim()).filter(Boolean) : undefined,
      }));
      const payload = { name: typeFormData.name.trim(), description: typeFormData.description || undefined, category: typeFormData.category || undefined, is_active: typeFormData.is_active, fields };
      if (typeFormMode === 'add') {
        await createType({ data: payload });
        toast({ title: 'تم الإضافة', description: `تم إضافة النوع "${typeFormData.name}"` });
      } else if (editingTypeId) {
        await updateType({ id: editingTypeId, data: payload });
        toast({ title: 'تم التعديل', description: `تم تحديث النوع "${typeFormData.name}"` });
      }
      queryClient.invalidateQueries({ queryKey: ['listComplaintTypes'] });
      setShowTypeForm(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل في الحفظ';
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    } finally { setSavingType(false); }
  };

  const handleDeleteType = async (id: number, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف النوع "${name}"؟`)) return;
    try {
      await deleteType({ id });
      queryClient.invalidateQueries({ queryKey: ['listComplaintTypes'] });
      toast({ title: 'تم الحذف' });
    } catch { toast({ title: 'خطأ', description: 'فشل في الحذف', variant: 'destructive' }); }
  };

  const fieldTypeLabels: Record<string, string> = { text: 'نص قصير', textarea: 'نص طويل', number: 'رقم', date: 'تاريخ', select: 'قائمة منسدلة', file: 'ملف/صورة', stars: 'تقييم نجوم' };

  const handleAddBranch = async () => {
    if (!newBranchName.trim() || !newBranchGov.trim()) return;
    setAddingBranch(true);
    try {
      await createBranch({ data: { name: newBranchName.trim(), governorate: newBranchGov.trim(), address: newBranchAddress.trim() || undefined } });
      queryClient.invalidateQueries({ queryKey: ['listBranches'] });
      setNewBranchName(''); setNewBranchGov(''); setNewBranchAddress('');
      toast({ title: 'تم الإضافة', description: `تم إضافة الفرع "${newBranchName}"` });
    } catch { toast({ title: 'خطأ', description: 'فشل في إضافة الفرع', variant: 'destructive' }); }
    finally { setAddingBranch(false); }
  };

  const handleDeleteBranch = async (id: number, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف الفرع "${name}"؟`)) return;
    try {
      await deleteBranch({ id });
      queryClient.invalidateQueries({ queryKey: ['listBranches'] });
      toast({ title: 'تم الحذف' });
    } catch { toast({ title: 'خطأ', description: 'فشل في الحذف', variant: 'destructive' }); }
  };

  const handleAddUser = async () => {
    if (!newUserForm.name.trim() || !newUserForm.email.trim() || !newUserForm.password.trim() || !newUserForm.role_id) return;
    setAddingUser(true);
    try {
      await createUser({ data: { name: newUserForm.name.trim(), email: newUserForm.email.trim(), password: newUserForm.password, role_id: Number(newUserForm.role_id) } });
      queryClient.invalidateQueries({ queryKey: ['listUsers'] });
      refetchUsers();
      setNewUserForm(emptyUserForm);
      setShowAddUser(false);
      toast({ title: 'تم الإضافة', description: `تم إضافة المستخدم "${newUserForm.name}"` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل في إضافة المستخدم';
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    } finally { setAddingUser(false); }
  };

  const startEditUser = (user: { id: number; name: string; email: string; role_id?: number }) => {
    setEditingUserId(user.id);
    setEditUserForm({ name: user.name, email: user.email, password: '', role_id: String(user.role_id ?? '') });
    setEditUserPwdVisible(false);
  };

  const handleSaveUser = async () => {
    if (!editingUserId || !editUserForm.name.trim() || !editUserForm.email.trim()) return;
    setSavingUser(true);
    try {
      const data: Record<string, unknown> = { name: editUserForm.name.trim(), email: editUserForm.email.trim() };
      if (editUserForm.role_id) data.role_id = Number(editUserForm.role_id);
      if (editUserForm.password.trim()) data.password = editUserForm.password.trim();
      await updateUser({ id: editingUserId, data: data as Parameters<typeof updateUser>[0]['data'] });
      queryClient.invalidateQueries({ queryKey: ['listUsers'] });
      refetchUsers();
      setEditingUserId(null);
      toast({ title: 'تم التعديل', description: 'تم تحديث بيانات المستخدم بنجاح' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل في التعديل';
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    } finally { setSavingUser(false); }
  };

  const handleDeleteUser = async (id: number, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف المستخدم "${name}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;
    try {
      await deleteUser({ id });
      queryClient.invalidateQueries({ queryKey: ['listUsers'] });
      refetchUsers();
      toast({ title: 'تم الحذف', description: `تم حذف المستخدم "${name}"` });
    } catch { toast({ title: 'خطأ', description: 'فشل في الحذف', variant: 'destructive' }); }
  };

  const [form, setForm] = useState({
    company_name: String(settings.company_name ?? ''),
    company_email: String(settings.company_email ?? ''),
    company_address: String(settings.company_address ?? ''),
    timezone: String(settings.timezone ?? 'Africa/Cairo'),
    language: String(settings.language ?? 'ar'),
    emailjs_service_id: String(settings.emailjs_service_id ?? ''),
    emailjs_template_id: String(settings.emailjs_template_id ?? ''),
    emailjs_public_key: String(settings.emailjs_public_key ?? ''),
    notify_on_new_complaint: settings.notify_on_new_complaint !== false,
    notify_on_escalation: settings.notify_on_escalation !== false,
    points_follow_up: String(settings.points_follow_up ?? '10'),
    points_resolve_complaint: String(settings.points_resolve_complaint ?? '20'),
    points_close_complaint: String(settings.points_close_complaint ?? '5'),
    points_escalation_penalty: String(settings.points_escalation_penalty ?? '5'),
    theme: String(settings.theme ?? 'dark'),
    accent_color: String(settings.accent_color ?? '#6366f1'),
    session_timeout_minutes: String(settings.session_timeout_minutes ?? '60'),
    max_login_attempts: String(settings.max_login_attempts ?? '5'),
    require_2fa: settings.require_2fa === true,
    google_oauth_client_id: String(settings.google_oauth_client_id ?? ''),
  });

  const handleSave = async (extra?: Partial<typeof form>) => {
    try {
      await upsert({ data: { settings: { ...form, ...extra } } });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({ title: 'تم الحفظ', description: 'تم حفظ الإعدادات بنجاح' });
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حفظ الإعدادات', variant: 'destructive' });
    }
  };

  const PUBLIC_FORM_FIELDS_OPTIONS = [
    { id: 'name', label: 'الاسم الكامل', required: true },
    { id: 'phone', label: 'رقم الهاتف', required: false },
    { id: 'email', label: 'البريد الإلكتروني', required: false },
    { id: 'national_id', label: 'الرقم القومي', required: false },
    { id: 'governorate', label: 'المحافظة', required: false },
    { id: 'address', label: 'العنوان', required: false },
    { id: 'complaint_type', label: 'نوع الشكوى', required: true },
    { id: 'date', label: 'تاريخ الحادثة', required: false },
  ];

  const handleSavePortal = async () => {
    try {
      await upsert({
        data: {
          settings: {
            primary_color: portalForm.primary_color,
            company_logo: portalForm.company_logo,
            public_form_fields: portalForm.public_form_fields as unknown as string,
          },
        },
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({ title: 'تم الحفظ', description: 'تم حفظ إعدادات البوابة بنجاح' });
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حفظ إعدادات البوابة', variant: 'destructive' });
    }
  };

  const handlePortalLogoUpload = async (file: File) => {
    setPortalLogoUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json() as { url?: string; path?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'فشل رفع الصورة');
      const url = json.url ?? json.path ?? '';
      setPortalForm(f => ({ ...f, company_logo: url }));
      toast({ title: 'تم رفع الشعار', description: 'تم رفع الشعار بنجاح، اضغط "حفظ" لتأكيد التغييرات' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل الرفع';
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    } finally {
      setPortalLogoUploading(false);
      if (portalLogoRef.current) portalLogoRef.current.value = '';
    }
  };

  const handleSaveSuccessMessage = async (typeId: number) => {
    setSavingSuccessMsg(p => ({ ...p, [typeId]: true }));
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`/api/complaint-types/${typeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ success_message: typeSuccessMessages[typeId] ?? null }),
      });
      if (!res.ok) throw new Error('فشل الحفظ');
      queryClient.invalidateQueries({ queryKey: ['listComplaintTypes'] });
      toast({ title: 'تم الحفظ', description: 'تم حفظ رسالة النجاح' });
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حفظ الرسالة', variant: 'destructive' });
    } finally {
      setSavingSuccessMsg(p => ({ ...p, [typeId]: false }));
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', importMode);
    const accessToken = localStorage.getItem('access_token');
    try {
      const res = await fetch('/api/import/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      const json = await res.json() as ImportResult & { error?: string };
      if (!res.ok) throw new Error(json.error || 'فشل الاستيراد');
      setImportResult(json);
      toast({ title: 'تم الاستيراد', description: `تم إضافة ${json.added_customers ?? 0} عميل و${json.added_invoices ?? 0} فاتورة` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ';
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const navItems = [
    { id: 'company' as Section, label: 'معلومات الشركة', icon: Building2 },
    { id: 'portal' as Section, label: 'بوابة الشكاوى العامة', icon: Globe },
    { id: 'users' as Section, label: 'إدارة المستخدمين', icon: Users },
    { id: 'types' as Section, label: 'أنواع الشكاوى', icon: Tags },
    { id: 'branches' as Section, label: 'الفروع', icon: GitBranch },
    { id: 'rating' as Section, label: 'أسئلة التقييم', icon: Star },
    { id: 'email' as Section, label: 'البريد الإلكتروني', icon: Mail },
    { id: 'points' as Section, label: 'نظام النقاط', icon: Star },
    { id: 'appearance' as Section, label: 'المظهر', icon: Palette },
    { id: 'security' as Section, label: 'الأمان', icon: Shield },
    { id: 'import' as Section, label: 'استيراد CSV', icon: Upload },
  ];

  const users = usersData?.data ?? [];
  const types = typesData?.data ?? [];
  const branches = branchesData?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('nav.settings')}</h1>
        <p className="text-muted-foreground mt-1">إعدادات النظام والتحكم العام</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="col-span-1 bg-card rounded-2xl border-border/50 shadow-lg p-2 h-fit">
          <div className="space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`w-full text-right px-4 py-3 rounded-xl flex items-center gap-2 text-sm transition-colors ${
                  section === item.id
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground font-medium'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </button>
            ))}
          </div>
        </Card>

        <Card className="col-span-1 md:col-span-3 bg-card rounded-2xl border-border/50 shadow-lg">
          <CardContent className="p-8">

            {section === 'company' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold">معلومات الشركة الأساسية</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">اسم الشركة</label>
                    <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} className="h-12 bg-background/50 rounded-xl" placeholder="Customer Service Enterprise" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">البريد الرسمي</label>
                    <Input value={form.company_email} onChange={e => setForm(f => ({ ...f, company_email: e.target.value }))} dir="ltr" className="h-12 bg-background/50 rounded-xl text-right" placeholder="support@company.com" />
                  </div>
                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <label className="text-sm font-medium">العنوان</label>
                    <Input value={form.company_address} onChange={e => setForm(f => ({ ...f, company_address: e.target.value }))} className="h-12 bg-background/50 rounded-xl" placeholder="القاهرة، مصر" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">المنطقة الزمنية</label>
                    <select
                      value={form.timezone}
                      onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                      className="w-full h-12 bg-background/50 border border-input rounded-xl px-3 text-sm text-foreground"
                    >
                      <option value="Africa/Cairo">Africa/Cairo (EET)</option>
                      <option value="Asia/Riyadh">Asia/Riyadh (AST)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">لغة النظام الافتراضية</label>
                    <select
                      value={form.language}
                      onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                      className="w-full h-12 bg-background/50 border border-input rounded-xl px-3 text-sm text-foreground"
                    >
                      <option value="ar">العربية</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
                <div className="pt-6 border-t border-border/50 flex justify-end">
                  <Button onClick={() => handleSave()} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-12 px-8">
                    <Save className="w-4 h-4 mr-2" /> حفظ التغييرات
                  </Button>
                </div>
              </div>
            )}

            {section === 'portal' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> بوابة الشكاوى العامة</h2>
                  <p className="text-sm text-muted-foreground mt-1">تخصيص مظهر وسلوك بوابة تقديم الشكاوى للعملاء (لا تتطلب تسجيل دخول)</p>
                </div>

                <div className="space-y-5 border border-border/50 rounded-2xl p-5">
                  <h3 className="text-base font-semibold">الهوية البصرية للبوابة</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">اللون الرئيسي للبوابة</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={portalForm.primary_color}
                          onChange={e => setPortalForm(f => ({ ...f, primary_color: e.target.value }))}
                          className="w-12 h-12 rounded-xl border border-input cursor-pointer"
                        />
                        <Input
                          value={portalForm.primary_color}
                          onChange={e => setPortalForm(f => ({ ...f, primary_color: e.target.value }))}
                          dir="ltr"
                          className="h-12 bg-background/50 rounded-xl font-mono"
                          placeholder="#6366f1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">شعار الشركة (Logo)</label>
                      {portalForm.company_logo ? (
                        <div className="flex items-center gap-3">
                          <img src={portalForm.company_logo} alt="شعار" className="h-12 w-auto object-contain rounded-lg border border-border/40" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPortalForm(f => ({ ...f, company_logo: '' }))}
                            className="rounded-xl text-xs text-red-400 border-red-400/30 hover:bg-red-400/10"
                          >
                            <X className="w-3 h-3 mr-1" /> إزالة
                          </Button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 h-12 border border-dashed border-input rounded-xl px-4 cursor-pointer hover:bg-muted/20 transition-colors">
                          <Upload className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {portalLogoUploading ? 'جاري الرفع...' : 'ارفع شعار الشركة (PNG/JPG)'}
                          </span>
                          <input
                            ref={portalLogoRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handlePortalLogoUpload(f); }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">اسم الشركة (يُعرض في رأس البوابة)</label>
                    <p className="text-xs text-muted-foreground">يُحدَّث من قسم "معلومات الشركة" → "اسم الشركة"</p>
                    <div
                      className="h-10 rounded-xl px-3 flex items-center text-sm text-muted-foreground border border-border/30"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      {String(settings.company_name ?? 'نظام إدارة خدمة العملاء')}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border border-border/50 rounded-2xl p-5">
                  <h3 className="text-base font-semibold">حقول نموذج الشكوى العامة</h3>
                  <p className="text-xs text-muted-foreground">اختر الحقول التي ستظهر في نموذج تقديم الشكوى للعملاء</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {PUBLIC_FORM_FIELDS_OPTIONS.map(field => {
                      const checked = portalForm.public_form_fields.includes(field.id);
                      return (
                        <label
                          key={field.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                            checked ? 'border-primary/30 bg-primary/5' : 'border-border/40 hover:bg-muted/20'
                          } ${field.required ? 'opacity-90' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={field.required}
                            onChange={e => {
                              if (e.target.checked) {
                                setPortalForm(f => ({ ...f, public_form_fields: [...f.public_form_fields, field.id] }));
                              } else {
                                setPortalForm(f => ({ ...f, public_form_fields: f.public_form_fields.filter(x => x !== field.id) }));
                              }
                            }}
                            className="accent-primary w-4 h-4"
                          />
                          <span className="text-sm">{field.label}</span>
                          {field.required && <span className="text-xs text-muted-foreground mr-auto">(إلزامي)</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button onClick={handleSavePortal} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-12 px-8">
                    <Save className="w-4 h-4 mr-2" /> حفظ إعدادات البوابة
                  </Button>
                </div>

                <div className="space-y-4 border border-border/50 rounded-2xl p-5">
                  <h3 className="text-base font-semibold">رسائل النجاح لكل نوع شكوى</h3>
                  <p className="text-xs text-muted-foreground">هذه الرسالة ستظهر للعميل بعد إرسال الشكوى بنجاح</p>
                  {types.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">لا توجد أنواع شكاوى — أضف أنواعاً من قسم "أنواع الشكاوى"</p>}
                  <div className="space-y-3">
                    {(types as { id: number; name: string; success_message?: string }[]).map(tp => (
                      <div key={tp.id} className="border border-border/30 rounded-xl p-4 space-y-2">
                        <p className="text-sm font-medium text-primary">{tp.name}</p>
                        <textarea
                          value={typeSuccessMessages[tp.id] !== undefined ? typeSuccessMessages[tp.id] : (tp.success_message ?? '')}
                          onChange={e => setTypeSuccessMessages(p => ({ ...p, [tp.id]: e.target.value }))}
                          rows={2}
                          placeholder="شكراً لتواصلك معنا، سنعود إليك في أقرب وقت..."
                          className="w-full bg-background/50 border border-input rounded-xl px-3 py-2 text-sm resize-none"
                        />
                        <Button
                          onClick={() => handleSaveSuccessMessage(tp.id)}
                          disabled={savingSuccessMsg[tp.id]}
                          size="sm"
                          className="rounded-xl h-8 text-xs bg-primary/10 hover:bg-primary/20 text-primary px-4"
                        >
                          <Save className="w-3 h-3 mr-1" /> {savingSuccessMsg[tp.id] ? 'جاري الحفظ...' : 'حفظ الرسالة'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {section === 'users' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">إدارة المستخدمين</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{users.length} مستخدم مسجّل</p>
                  </div>
                  <Button
                    onClick={() => { setShowAddUser(v => !v); setEditingUserId(null); }}
                    className="rounded-xl h-10 bg-primary hover:bg-primary/90 text-white gap-2"
                  >
                    {showAddUser ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showAddUser ? 'إلغاء' : 'إضافة مستخدم'}
                  </Button>
                </div>

                {showAddUser && (
                  <div className="bg-muted/20 rounded-xl p-5 border border-primary/20 space-y-4">
                    <p className="text-sm font-semibold text-primary flex items-center gap-2">
                      <Plus className="w-4 h-4" /> إضافة مستخدم جديد
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">الاسم الكامل *</label>
                        <Input
                          value={newUserForm.name}
                          onChange={e => setNewUserForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="أحمد محمد"
                          className="h-10 bg-background/60 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">البريد الإلكتروني *</label>
                        <Input
                          value={newUserForm.email}
                          onChange={e => setNewUserForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="ahmed@company.com"
                          dir="ltr"
                          className="h-10 bg-background/60 rounded-xl"
                          type="email"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">كلمة المرور *</label>
                        <div className="relative">
                          <Input
                            value={newUserForm.password}
                            onChange={e => setNewUserForm(f => ({ ...f, password: e.target.value }))}
                            placeholder="كلمة المرور"
                            className="h-10 bg-background/60 rounded-xl pr-3 pl-10"
                            type={newUserPwdVisible ? 'text' : 'password'}
                            onKeyDown={e => { if (e.key === 'Enter') handleAddUser(); }}
                          />
                          <button type="button" onClick={() => setNewUserPwdVisible(v => !v)} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {newUserPwdVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">الدور *</label>
                        <select
                          value={newUserForm.role_id}
                          onChange={e => setNewUserForm(f => ({ ...f, role_id: e.target.value }))}
                          className="w-full h-10 bg-background/60 border border-input rounded-xl px-3 text-sm text-foreground"
                        >
                          <option value="">اختر دوراً...</option>
                          {(rolesData as unknown as { data?: { id: number; name: string }[] })?.data?.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <Button
                      onClick={handleAddUser}
                      disabled={!newUserForm.name.trim() || !newUserForm.email.trim() || !newUserForm.password.trim() || !newUserForm.role_id || addingUser}
                      className="rounded-xl h-10 bg-primary hover:bg-primary/90 text-white w-full"
                    >
                      {addingUser ? 'جاري الإضافة...' : 'إضافة المستخدم'}
                    </Button>
                  </div>
                )}

                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-right p-3 font-medium">الاسم</th>
                        <th className="text-right p-3 font-medium">البريد</th>
                        <th className="text-right p-3 font-medium">الدور</th>
                        <th className="text-left p-3 font-medium w-28">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {users.map((user: { id: number; name: string; email: string; role_name?: string; role_id?: number }) => (
                        <Fragment key={user.id}>
                          <tr className={`hover:bg-muted/20 transition-colors ${editingUserId === user.id ? 'bg-primary/5' : ''}`}>
                            <td className="p-3 font-medium">{user.name}</td>
                            <td className="p-3 text-muted-foreground text-xs" dir="ltr">{user.email}</td>
                            <td className="p-3">
                              <span className="px-2 py-1 rounded-lg text-xs bg-primary/10 text-primary">{user.role_name ?? 'غير محدد'}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1 justify-end">
                                <button
                                  onClick={() => editingUserId === user.id ? setEditingUserId(null) : startEditUser(user)}
                                  className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                                  title="تعديل"
                                >
                                  {editingUserId === user.id ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id, user.name)}
                                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                                  title="حذف"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {editingUserId === user.id && (
                            <tr key={`edit-${user.id}`}>
                              <td colSpan={4} className="p-0">
                                <div className="bg-primary/5 border-t border-primary/10 p-4 space-y-3">
                                  <p className="text-xs font-semibold text-primary flex items-center gap-1"><Pencil className="w-3 h-3" /> تعديل بيانات {user.name}</p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-xs text-muted-foreground">الاسم الكامل</label>
                                      <Input value={editUserForm.name} onChange={e => setEditUserForm(f => ({ ...f, name: e.target.value }))} className="h-9 bg-background/60 rounded-xl text-sm" placeholder="الاسم" />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs text-muted-foreground">البريد الإلكتروني</label>
                                      <Input value={editUserForm.email} onChange={e => setEditUserForm(f => ({ ...f, email: e.target.value }))} className="h-9 bg-background/60 rounded-xl text-sm" dir="ltr" type="email" placeholder="البريد" />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs text-muted-foreground">كلمة المرور الجديدة (اتركها فارغة للإبقاء)</label>
                                      <div className="relative">
                                        <Input
                                          value={editUserForm.password}
                                          onChange={e => setEditUserForm(f => ({ ...f, password: e.target.value }))}
                                          placeholder="كلمة مرور جديدة..."
                                          className="h-9 bg-background/60 rounded-xl text-sm pr-3 pl-10"
                                          type={editUserPwdVisible ? 'text' : 'password'}
                                        />
                                        <button type="button" onClick={() => setEditUserPwdVisible(v => !v)} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                          {editUserPwdVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs text-muted-foreground">الدور</label>
                                      <select
                                        value={editUserForm.role_id}
                                        onChange={e => setEditUserForm(f => ({ ...f, role_id: e.target.value }))}
                                        className="w-full h-9 bg-background/60 border border-input rounded-xl px-3 text-sm text-foreground"
                                      >
                                        <option value="">اختر دوراً...</option>
                                        {(rolesData as unknown as { data?: { id: number; name: string }[] })?.data?.map((r) => (
                                          <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 pt-1">
                                    <Button onClick={handleSaveUser} disabled={savingUser} className="rounded-xl h-9 bg-primary hover:bg-primary/90 text-white text-xs px-5">
                                      <Save className="w-3.5 h-3.5 mr-1" /> {savingUser ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                                    </Button>
                                    <Button variant="outline" onClick={() => setEditingUserId(null)} className="rounded-xl h-9 text-xs px-4">إلغاء</Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                      {users.length === 0 && (
                        <tr><td colSpan={4} className="p-8 text-center text-muted-foreground text-sm">لا يوجد مستخدمون</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {section === 'types' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">أنواع الشكاوى</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{types.length} نوع مُعرَّف</p>
                  </div>
                  <Button onClick={showTypeForm ? () => setShowTypeForm(false) : openAddTypeForm} className="rounded-xl h-10 bg-primary hover:bg-primary/90 text-white gap-2">
                    {showTypeForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showTypeForm ? 'إلغاء' : 'إضافة نوع جديد'}
                  </Button>
                </div>

                {showTypeForm && (
                  <div className="bg-muted/10 border border-primary/20 rounded-2xl p-5 space-y-5">
                    <p className="text-sm font-semibold text-primary flex items-center gap-2">
                      {typeFormMode === 'add' ? <Plus className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                      {typeFormMode === 'add' ? 'إضافة نوع شكوى جديد' : `تعديل النوع: ${typeFormData.name}`}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground font-medium">اسم النوع *</label>
                        <Input value={typeFormData.name} onChange={e => setTypeFormData(f => ({ ...f, name: e.target.value }))} placeholder="مثال: عيب مصنعي، شكوى خدمة..." className="h-10 bg-background/60 rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground font-medium">الفئة</label>
                        <select value={typeFormData.category} onChange={e => setTypeFormData(f => ({ ...f, category: e.target.value }))} className="w-full h-10 bg-background/60 border border-input rounded-xl px-3 text-sm text-foreground">
                          <option value="">بدون فئة</option>
                          <option value="جودة المنتج">جودة المنتج</option>
                          <option value="خدمة ما بعد البيع">خدمة ما بعد البيع</option>
                          <option value="فني صيانة">فني صيانة</option>
                          <option value="توصيل وشحن">توصيل وشحن</option>
                          <option value="فوترة ومدفوعات">فوترة ومدفوعات</option>
                          <option value="أخرى">أخرى</option>
                        </select>
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-xs text-muted-foreground font-medium">وصف مختصر (اختياري)</label>
                        <textarea value={typeFormData.description} onChange={e => setTypeFormData(f => ({ ...f, description: e.target.value }))} placeholder="وصف يساعد الموظفين على فهم متى يستخدمون هذا النوع..." rows={2} className="w-full bg-background/60 border border-input rounded-xl px-3 py-2 text-sm text-foreground resize-none" />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium">حالة التفعيل</label>
                        <button type="button" onClick={() => setTypeFormData(f => ({ ...f, is_active: !f.is_active }))} className={`relative w-12 h-6 rounded-full transition-colors ${typeFormData.is_active ? 'bg-primary' : 'bg-muted'}`}>
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${typeFormData.is_active ? 'right-1' : 'right-7'}`} />
                        </button>
                        <span className={`text-xs ${typeFormData.is_active ? 'text-green-400' : 'text-muted-foreground'}`}>{typeFormData.is_active ? 'فعال' : 'غير فعال'}</span>
                      </div>
                    </div>

                    <div className="border-t border-border/40 pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">الحقول الديناميكية ({typeFormFields.length})</p>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => setShowTypePreview(v => !v)} className="rounded-xl h-8 text-xs px-3 gap-1">
                            <Eye className="w-3.5 h-3.5" /> {showTypePreview ? 'إخفاء المعاينة' : 'معاينة النموذج'}
                          </Button>
                          <Button onClick={addTypeField} className="rounded-xl h-8 bg-primary/10 hover:bg-primary/20 text-primary text-xs px-3 gap-1">
                            <Plus className="w-3.5 h-3.5" /> إضافة حقل
                          </Button>
                        </div>
                      </div>

                      {typeFormFields.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border/50 rounded-xl">لا توجد حقول — اضغط "إضافة حقل" لتعريف حقول النموذج الديناميكي</p>
                      )}

                      {typeFormFields.map((field, idx) => (
                        <div key={field._id} className="bg-background/40 rounded-xl p-3 border border-border/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground font-medium">حقل #{idx + 1}</span>
                            <button onClick={() => removeTypeField(field._id)} className="p-1 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="col-span-2 space-y-1">
                              <label className="text-xs text-muted-foreground">تسمية الحقل *</label>
                              <Input value={field.label} onChange={e => updateTypeField(field._id, { label: e.target.value })} placeholder="مثال: المنتج، اللون، المقاس..." className="h-8 bg-background/60 rounded-lg text-sm" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">نوع الإدخال</label>
                              <select value={field.type} onChange={e => updateTypeField(field._id, { type: e.target.value as ComplaintTypeFieldType })} className="w-full h-8 bg-background/60 border border-input rounded-lg px-2 text-xs text-foreground">
                                {Object.entries(fieldTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                              </select>
                            </div>
                            <div className="flex items-end pb-0.5">
                              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                <input type="checkbox" checked={field.required} onChange={e => updateTypeField(field._id, { required: e.target.checked })} className="accent-primary w-3.5 h-3.5" />
                                إلزامي
                              </label>
                            </div>
                          </div>
                          {field.type === ComplaintTypeFieldType.select && (
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">خيارات القائمة (مفصولة بفواصل)</label>
                              <Input value={field.options} onChange={e => updateTypeField(field._id, { options: e.target.value })} placeholder="خيار 1، خيار 2، خيار 3..." className="h-8 bg-background/60 rounded-lg text-sm" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {showTypePreview && typeFormFields.some(f => f.label.trim()) && (
                      <div className="border border-border/40 rounded-xl p-4 bg-background/30 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> معاينة النموذج — {typeFormData.name || 'بدون اسم'}</p>
                        {typeFormFields.filter(f => f.label.trim()).map(field => (
                          <div key={field._id} className="space-y-1">
                            <label className="text-xs font-medium">{field.label}{field.required && <span className="text-red-400 mr-0.5">*</span>}</label>
                            {field.type === 'text' && <div className="h-8 bg-muted/30 border border-border/30 rounded-lg px-2 flex items-center text-xs text-muted-foreground">نص قصير...</div>}
                            {field.type === 'textarea' && <div className="h-16 bg-muted/30 border border-border/30 rounded-lg p-2 text-xs text-muted-foreground">نص طويل...</div>}
                            {field.type === 'number' && <div className="h-8 bg-muted/30 border border-border/30 rounded-lg px-2 flex items-center text-xs text-muted-foreground">0</div>}
                            {field.type === 'date' && <div className="h-8 bg-muted/30 border border-border/30 rounded-lg px-2 flex items-center text-xs text-muted-foreground">يوم/شهر/سنة</div>}
                            {field.type === 'select' && <div className="h-8 bg-muted/30 border border-border/30 rounded-lg px-2 flex items-center text-xs text-muted-foreground justify-between"><span>{field.options.split(',')[0]?.trim() || 'اختر...'}</span><span>▼</span></div>}
                            {field.type === 'stars' && <div className="flex gap-1">{[1,2,3,4,5].map(s => <span key={s} className="text-muted-foreground text-lg">☆</span>)}</div>}
                            {field.type === 'file' && <div className="h-8 bg-muted/30 border border-dashed border-border/50 rounded-lg px-2 flex items-center text-xs text-muted-foreground gap-1"><Upload className="w-3 h-3" /> اختر ملفاً...</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button onClick={handleSaveType} disabled={!typeFormData.name.trim() || savingType} className="rounded-xl h-10 bg-primary hover:bg-primary/90 text-white px-6 gap-2">
                        <Save className="w-4 h-4" /> {savingType ? 'جاري الحفظ...' : (typeFormMode === 'add' ? 'إضافة النوع' : 'حفظ التعديلات')}
                      </Button>
                      <Button variant="outline" onClick={() => setShowTypeForm(false)} className="rounded-xl h-10 px-4">إلغاء</Button>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-right p-3 font-medium">اسم النوع</th>
                        <th className="text-right p-3 font-medium hidden md:table-cell">الفئة</th>
                        <th className="text-right p-3 font-medium hidden md:table-cell">الحقول</th>
                        <th className="text-right p-3 font-medium">الحالة</th>
                        <th className="text-left p-3 font-medium w-24">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {types.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">لا توجد أنواع — اضغط "إضافة نوع جديد" للبدء</td></tr>
                      ) : types.map((tp: { id: number; name: string; description?: string; category?: string; is_active?: boolean; fields: { name: string; label: string; type: string; required: boolean; options?: string[] }[] }) => (
                        <tr key={tp.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3">
                            <p className="font-medium">{tp.name}</p>
                            {tp.description && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{tp.description}</p>}
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            {tp.category ? <span className="px-2 py-0.5 rounded-lg text-xs bg-muted/40 text-muted-foreground">{tp.category}</span> : <span className="text-muted-foreground text-xs">-</span>}
                          </td>
                          <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">{tp.fields?.length ?? 0} حقل</td>
                          <td className="p-3">
                            <span className={`flex items-center gap-1.5 text-xs ${tp.is_active !== false ? 'text-green-400' : 'text-muted-foreground'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${tp.is_active !== false ? 'bg-green-400' : 'bg-muted-foreground'}`} />
                              {tp.is_active !== false ? 'فعال' : 'معطّل'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => openEditTypeForm(tp)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="تعديل"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteType(tp.id, tp.name)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {section === 'branches' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">إدارة الفروع</h2>
                  <span className="text-sm text-muted-foreground">{branches.length} فرع</span>
                </div>

                <div className="bg-muted/20 rounded-xl p-4 border border-border/40">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> إضافة فرع جديد</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      value={newBranchName}
                      onChange={e => setNewBranchName(e.target.value)}
                      placeholder="اسم الفرع (مثال: فرع المعادي)"
                      className="h-10 bg-background/50 rounded-xl"
                    />
                    <Input
                      value={newBranchGov}
                      onChange={e => setNewBranchGov(e.target.value)}
                      placeholder="المحافظة (مثال: القاهرة) *"
                      className="h-10 bg-background/50 rounded-xl"
                    />
                    <Input
                      value={newBranchAddress}
                      onChange={e => setNewBranchAddress(e.target.value)}
                      placeholder="العنوان التفصيلي (اختياري)"
                      className="h-10 bg-background/50 rounded-xl md:col-span-2"
                    />
                    <Button
                      onClick={handleAddBranch}
                      disabled={!newBranchName.trim() || !newBranchGov.trim() || addingBranch}
                      className="rounded-xl h-10 bg-primary hover:bg-primary/90 text-white md:col-span-2"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {addingBranch ? 'جاري الإضافة...' : 'إضافة فرع'}
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-right p-4 font-medium">الفرع</th>
                        <th className="text-right p-4 font-medium">المحافظة</th>
                        <th className="text-right p-4 font-medium">العنوان</th>
                        <th className="p-4 font-medium text-left">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {branches.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-muted-foreground text-sm">لا توجد فروع — أضف فرعًا جديدًا أعلاه</td></tr>
                      ) : branches.map((b: { id: number; name: string; governorate?: string; address?: string }) => (
                        <tr key={b.id} className="hover:bg-muted/20">
                          <td className="p-4 font-medium">{b.name}</td>
                          <td className="p-4 text-muted-foreground">{b.governorate ?? '-'}</td>
                          <td className="p-4 text-muted-foreground text-xs">{b.address ?? '-'}</td>
                          <td className="p-4 text-left">
                            <button
                              onClick={() => handleDeleteBranch(b.id, b.name)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {section === 'email' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold">إعدادات البريد الإلكتروني</h2>
                  <p className="text-sm text-muted-foreground mt-1">إعداد EmailJS لإرسال الإشعارات والتنبيهات عبر البريد الإلكتروني</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">معرّف الخدمة (Service ID)</label>
                    <Input
                      dir="ltr"
                      value={form.emailjs_service_id}
                      onChange={e => setForm(f => ({ ...f, emailjs_service_id: e.target.value }))}
                      className="h-12 bg-background/50 rounded-xl font-mono"
                      placeholder="service_xxxxxxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">معرّف القالب (Template ID)</label>
                    <Input
                      dir="ltr"
                      value={form.emailjs_template_id}
                      onChange={e => setForm(f => ({ ...f, emailjs_template_id: e.target.value }))}
                      className="h-12 bg-background/50 rounded-xl font-mono"
                      placeholder="template_xxxxxxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">المفتاح العام (Public Key)</label>
                    <Input
                      dir="ltr"
                      value={form.emailjs_public_key}
                      onChange={e => setForm(f => ({ ...f, emailjs_public_key: e.target.value }))}
                      className="h-12 bg-background/50 rounded-xl font-mono"
                      placeholder="xxxxxxxxxxxxxxxx"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-base font-semibold">أحداث الإشعار</h3>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.notify_on_new_complaint}
                      onChange={e => setForm(f => ({ ...f, notify_on_new_complaint: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">إرسال بريد عند تسجيل شكوى جديدة</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.notify_on_escalation}
                      onChange={e => setForm(f => ({ ...f, notify_on_escalation: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">إرسال بريد عند تصعيد الشكوى</span>
                  </label>
                </div>
                <div className="bg-muted/20 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">احصل على بيانات الاعتماد من <span className="text-primary font-medium">emailjs.com</span> — أنشئ حساباً مجانياً، أضف خدمة بريد، ثم انسخ المعرّفات هنا.</p>
                </div>
                <div className="pt-4 border-t border-border/50 flex justify-end">
                  <Button onClick={() => handleSave()} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-12 px-8">
                    <Save className="w-4 h-4 mr-2" /> حفظ الإعدادات
                  </Button>
                </div>
              </div>
            )}

            {section === 'points' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold">نظام نقاط الأداء</h2>
                  <p className="text-sm text-muted-foreground mt-1">تحديد عدد النقاط الممنوحة أو المخصومة لكل إجراء في النظام</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">نقاط المتابعة (follow-up)</label>
                    <Input
                      type="number"
                      min="0"
                      value={form.points_follow_up}
                      onChange={e => setForm(f => ({ ...f, points_follow_up: e.target.value }))}
                      className="h-12 bg-background/50 rounded-xl"
                      placeholder="10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">نقاط حل الشكوى</label>
                    <Input
                      type="number"
                      min="0"
                      value={form.points_resolve_complaint}
                      onChange={e => setForm(f => ({ ...f, points_resolve_complaint: e.target.value }))}
                      className="h-12 bg-background/50 rounded-xl"
                      placeholder="20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">نقاط إغلاق الشكوى</label>
                    <Input
                      type="number"
                      min="0"
                      value={form.points_close_complaint}
                      onChange={e => setForm(f => ({ ...f, points_close_complaint: e.target.value }))}
                      className="h-12 bg-background/50 rounded-xl"
                      placeholder="5"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-red-400">خصم نقاط عند التصعيد</label>
                    <Input
                      type="number"
                      min="0"
                      value={form.points_escalation_penalty}
                      onChange={e => setForm(f => ({ ...f, points_escalation_penalty: e.target.value }))}
                      className="h-12 bg-background/50 rounded-xl border-red-500/30"
                      placeholder="5"
                    />
                  </div>
                </div>
                <div className="bg-muted/20 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">تُستخدم النقاط لقياس أداء الموظفين. يتم تجميعها في لوحة التحليلات ضمن تقرير الأداء.</p>
                </div>
                <div className="pt-4 border-t border-border/50 flex justify-end">
                  <Button onClick={() => handleSave()} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-12 px-8">
                    <Save className="w-4 h-4 mr-2" /> حفظ الإعدادات
                  </Button>
                </div>
              </div>
            )}

            {section === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold">إعدادات المظهر</h2>
                  <p className="text-sm text-muted-foreground mt-1">تخصيص مظهر النظام ولون التمييز</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">السمة الافتراضية</label>
                    <div className="flex gap-3">
                      {[
                        { value: 'dark', label: 'داكن (Dark)', desc: 'خلفية غامقة مريحة للعين' },
                        { value: 'light', label: 'فاتح (Light)', desc: 'خلفية بيضاء كلاسيكية' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setForm(f => ({ ...f, theme: opt.value }))}
                          className={`flex-1 px-4 py-4 rounded-xl border text-sm text-right transition-all ${
                            form.theme === opt.value
                              ? 'bg-primary/10 border-primary/60 text-primary'
                              : 'border-border/50 text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          <div className="font-medium">{opt.label}</div>
                          <div className="text-xs mt-1 opacity-70">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">لون التمييز (Accent Color)</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="color"
                        value={form.accent_color}
                        onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))}
                        className="h-12 w-24 rounded-xl border border-input bg-background cursor-pointer"
                      />
                      <Input
                        dir="ltr"
                        value={form.accent_color}
                        onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))}
                        className="h-12 bg-background/50 rounded-xl font-mono w-40"
                        placeholder="#6366f1"
                      />
                      <div className="flex gap-2">
                        {['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map(c => (
                          <button
                            key={c}
                            onClick={() => setForm(f => ({ ...f, accent_color: c }))}
                            className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                            style={{ backgroundColor: c, borderColor: form.accent_color === c ? 'white' : 'transparent' }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-border/50 flex justify-end">
                  <Button onClick={() => handleSave()} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-12 px-8">
                    <Save className="w-4 h-4 mr-2" /> حفظ التغييرات
                  </Button>
                </div>
              </div>
            )}

            {section === 'security' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold">إعدادات الأمان</h2>
                  <p className="text-sm text-muted-foreground mt-1">التحكم في سياسات الأمان وتسجيل الدخول</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">مهلة الجلسة (بالدقائق)</label>
                    <Input
                      type="number"
                      min="15"
                      max="1440"
                      value={form.session_timeout_minutes}
                      onChange={e => setForm(f => ({ ...f, session_timeout_minutes: e.target.value }))}
                      className="h-12 bg-background/50 rounded-xl"
                      placeholder="60"
                    />
                    <p className="text-xs text-muted-foreground">يُسجَّل المستخدم خارجاً تلقائياً بعد هذه المدة من عدم النشاط</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">أقصى محاولات تسجيل دخول فاشلة</label>
                    <Input
                      type="number"
                      min="3"
                      max="20"
                      value={form.max_login_attempts}
                      onChange={e => setForm(f => ({ ...f, max_login_attempts: e.target.value }))}
                      className="h-12 bg-background/50 rounded-xl"
                      placeholder="5"
                    />
                    <p className="text-xs text-muted-foreground">يُوقَف الحساب مؤقتاً بعد هذا العدد من المحاولات الفاشلة</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-border/50 hover:bg-muted/20">
                    <input
                      type="checkbox"
                      checked={form.require_2fa}
                      onChange={e => setForm(f => ({ ...f, require_2fa: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <div>
                      <span className="text-sm font-medium block">المصادقة الثنائية (2FA)</span>
                      <span className="text-xs text-muted-foreground">إلزام جميع المستخدمين بالمصادقة الثنائية عند تسجيل الدخول</span>
                    </div>
                  </label>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Google OAuth — معرّف العميل (Client ID)</label>
                  <Input
                    dir="ltr"
                    value={form.google_oauth_client_id}
                    onChange={e => setForm(f => ({ ...f, google_oauth_client_id: e.target.value }))}
                    className="h-12 bg-background/50 rounded-xl font-mono"
                    placeholder="xxxxxxxx.apps.googleusercontent.com"
                  />
                  <p className="text-xs text-muted-foreground">للسماح بتسجيل الدخول عبر حسابات Google. احصل عليه من Google Cloud Console.</p>
                </div>
                <div className="pt-4 border-t border-border/50 flex justify-end">
                  <Button onClick={() => handleSave()} className="rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-12 px-8">
                    <Save className="w-4 h-4 mr-2" /> حفظ الإعدادات
                  </Button>
                </div>
              </div>
            )}

            {section === 'rating' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">أسئلة التقييم</h2>
                    <p className="text-muted-foreground text-sm mt-1">الأسئلة التي يطرحها الموظف على العميل أثناء متابعة الفاتورة</p>
                  </div>
                  <span className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                    {ratingQuestions?.length ?? 0} سؤال
                  </span>
                </div>

                <div className="flex gap-3">
                  <Input
                    value={newQuestionText}
                    onChange={e => setNewQuestionText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddRatingQuestion()}
                    placeholder="أدخل نص السؤال الجديد..."
                    className="rounded-xl h-11 bg-background/60 border-border/50 flex-1"
                  />
                  <Button
                    onClick={handleAddRatingQuestion}
                    disabled={!newQuestionText.trim() || addingRQ}
                    className="rounded-xl h-11 px-5 bg-primary hover:bg-primary/90 text-white gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {addingRQ ? 'جاري الإضافة...' : 'إضافة سؤال'}
                  </Button>
                </div>

                <div className="rounded-xl border border-border/50 overflow-hidden">
                  {loadingRQ ? (
                    <div className="p-8 text-center text-muted-foreground animate-pulse">جاري التحميل...</div>
                  ) : !ratingQuestions?.length ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">لا توجد أسئلة تقييم بعد</p>
                      <p className="text-xs mt-1">أضف أسئلة التقييم لاستخدامها في متابعة الفواتير</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="text-right py-3 px-4 font-semibold text-muted-foreground">#</th>
                          <th className="text-right py-3 px-4 font-semibold text-muted-foreground">نص السؤال</th>
                          <th className="py-3 px-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {ratingQuestions.map((q, idx) => (
                          <tr key={q.id} className="hover:bg-muted/10 transition-colors">
                            <td className="py-3 px-4 text-muted-foreground font-medium w-10">{idx + 1}</td>
                            <td className="py-3 px-4 font-medium leading-relaxed">{q.text}</td>
                            <td className="py-3 px-4 text-left">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteRatingQuestion(q.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-400">
                  <p className="font-medium mb-1">كيف تعمل أسئلة التقييم؟</p>
                  <p className="text-xs text-blue-400/80">
                    عند فتح تفاصيل فاتورة في صفحة متابعة الفواتير، تظهر هذه الأسئلة مع نجوم تقييم لكل سؤال.
                    يقرأ الموظف السؤال للعميل ويسجّل إجابته، ثم يحفظ المتابعة مع كامل التقييم.
                  </p>
                </div>
              </div>
            )}

            {section === 'import' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold">استيراد بيانات CSV</h2>
                <p className="text-muted-foreground text-sm">ارفع ملف CSV لاستيراد بيانات العملاء أو العملاء والفواتير معاً. يتم تجاهل السجلات المكررة (نفس الاسم والهاتف).</p>

                <div className="space-y-3">
                  <label className="text-sm font-medium">نوع الاستيراد</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setImportMode('customers_only')}
                      className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${importMode === 'customers_only' ? 'bg-primary/10 border-primary/50 text-primary' : 'border-border/50 text-muted-foreground hover:bg-muted'}`}
                    >
                      عملاء فقط
                    </button>
                    <button
                      onClick={() => setImportMode('customers_and_invoices')}
                      className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${importMode === 'customers_and_invoices' ? 'bg-primary/10 border-primary/50 text-primary' : 'border-border/50 text-muted-foreground hover:bg-muted'}`}
                    >
                      عملاء + فواتير
                    </button>
                  </div>
                </div>

                <div
                  className="border-2 border-dashed border-border/50 rounded-2xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleFileUpload(file); }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={e => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }}
                  />
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  {uploading ? (
                    <p className="text-primary font-medium animate-pulse">جاري رفع الملف...</p>
                  ) : (
                    <>
                      <p className="text-muted-foreground mb-2">اسحب ملف CSV هنا أو اضغط للاختيار</p>
                      <p className="text-xs text-muted-foreground">يدعم النظام ملفات .csv بترميز UTF-8</p>
                    </>
                  )}
                </div>

                {importResult && (
                  <div className={`rounded-xl p-4 border ${importResult.errors?.length ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {importResult.errors?.length ? <AlertCircle className="w-5 h-5 text-red-500" /> : <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      <p className="font-medium text-sm">نتيجة الاستيراد</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">عملاء مضافون:</span>
                      <span className="text-green-500 font-bold">{importResult.added_customers ?? 0}</span>
                      <span className="text-muted-foreground">فواتير مضافة:</span>
                      <span className="text-accent font-bold">{importResult.added_invoices ?? 0}</span>
                      <span className="text-muted-foreground">فواتير مكررة:</span>
                      <span className="text-yellow-500 font-bold">{importResult.duplicate_invoices ?? 0}</span>
                    </div>
                    {(importResult.warnings?.length ?? 0) > 0 && (
                      <p className="text-xs text-yellow-400 mt-2">{importResult.warnings!.length} تحذير — تحقق من سجلات الاستيراد للتفاصيل</p>
                    )}
                    {importResult.errors?.slice(0, 3).map((e, i) => (
                      <p key={i} className="text-xs text-red-400 mt-1">
                        {typeof e === 'string' ? e : typeof e === 'object' && e !== null
                          ? `سطر ${(e as {row?:number}).row ?? '?'}: ${(e as {reason?:string}).reason ?? JSON.stringify(e)}`
                          : String(e)}
                      </p>
                    ))}
                  </div>
                )}

                <div className="bg-muted/20 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">تنسيق ملف CSV المطلوب (عملاء فقط)</p>
                    <code className="text-xs text-muted-foreground block font-mono bg-background/50 px-2 py-1 rounded">code,name,phone,type,governorate,branch,address</code>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">تنسيق ملف CSV (عملاء + فواتير)</p>
                    <code className="text-xs text-muted-foreground block font-mono bg-background/50 px-2 py-1 rounded">code,name,phone,type,governorate,branch,address,invoice_number,invoice_date,invoice_amount,invoice_product,invoice_status</code>
                  </div>
                  <p className="text-xs text-muted-foreground">* الأعمدة بالإنجليزية كما هي موضحة أعلاه</p>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
