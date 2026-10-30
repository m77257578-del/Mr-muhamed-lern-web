import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Key,
  ShieldCheck,
  CheckCircle,
  X,
  User,
  Sparkles,
  Eye,
  EyeOff,
  Users,
  Plus,
  Trash2,
  Check,
  FlaskConical,
  Calculator,
  Compass,
  Code,
  Globe2,
  Atom,
  Lock,
  Phone,
  Layers,
  ArrowRight
} from 'lucide-react';
import { TeacherProfile } from '../types';

interface SubjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubjectAuth?: {
    username?: string;
    subjectName?: string;
    subjectCategory?: string;
    teacherName?: string;
  };
  onSave: () => void;
}

const PRESET_SUBJECTS = [
  'اللغة العربية',
  'جغرافيا وتاريخ',
  'رياضيات',
  'برمجة وتكنولوجيا',
  'فلسفة ومنطق',
  'لغة إنجليزية',
  'لغة ألمانية',
  'لغة فرنسية',
  'علوم متكاملة',
  'فيزياء',
  'كيمياء',
  'أحياء وجيولوجيا'
];

export const SubjectSettingsModal: React.FC<SubjectSettingsModalProps> = ({
  isOpen,
  onClose,
  initialSubjectAuth,
  onSave,
}) => {
  // Authentication gate
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Tabs: 'teachers' | 'tools' | 'auth'
  const [activeTab, setActiveTab] = useState<'teachers' | 'tools' | 'auth'>('teachers');

  // Multi-Teacher State
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  // Add Teacher Form
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('اللغة العربية');
  const [newSubjectCategory, setNewSubjectCategory] = useState('المرحلة الثانوية');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newBio, setNewBio] = useState('');
  const [addingTeacher, setAddingTeacher] = useState(false);
  const [teacherMsg, setTeacherMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Tool Matrix for Selected Teacher
  const [teacherTools, setTeacherTools] = useState<Record<string, boolean>>({
    arabicLexicon: true,
    translator: true,
    geoHistoryMap: true,
    socratesPhilosophy: true,
    codeSandbox: true,
    scienceLab: true,
    mathCalculator: true,
    virtualLabChemistry: true,
    physicsCircuitsLab: true,
    biologyMicroscopeLab: true,
  });
  const [savingTools, setSavingTools] = useState(false);
  const [toolsMsg, setToolsMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Master Auth Form
  const [masterUser, setMasterUser] = useState(initialSubjectAuth?.username || 'ليرن ويب');
  const [masterPass, setMasterPass] = useState('102938');
  const [showPassword, setShowPassword] = useState(false);
  const [savingAuth, setSavingAuth] = useState(false);
  const [authMsg, setAuthMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Load LernWeb Data
  const loadLernWebData = async () => {
    setLoadingData(true);
    try {
      const res = await fetch('/api/lernweb/data');
      if (res.ok) {
        const data = await res.json();
        if (data.teachers && Array.isArray(data.teachers)) {
          setTeachers(data.teachers);
          const active = data.teachers.find((t: any) => t.active) || data.teachers[0];
          if (active) {
            setSelectedTeacherId(active.id);
            if (active.toolsConfig) {
              setTeacherTools(active.toolsConfig);
            }
          }
        }
        if (data.subjectAuth?.username) {
          setMasterUser(data.subjectAuth.username);
        }
      }
    } catch (e) {
      console.error('Failed to load lernweb data', e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLernWebData();
    }
  }, [isOpen]);

  // When teacher selection changes for tools tab
  useEffect(() => {
    if (selectedTeacherId) {
      const t = teachers.find(x => x.id === selectedTeacherId);
      if (t?.toolsConfig) {
        setTeacherTools(t.toolsConfig);
      }
    }
  }, [selectedTeacherId, teachers]);

  if (!isOpen) return null;

  // 1. Verify Master LernWeb Login
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/lernweb/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUser.trim(),
          password: loginPass.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'بيانات الدخول غير صحيحة');
      setIsAuthenticated(true);
      await loadLernWebData();
    } catch (err: any) {
      setLoginError(err.message || 'بيانات الدخول غير صحيحة');
    } finally {
      setLoginLoading(false);
    }
  };

  // 2. Add New Teacher
  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingTeacher(true);
    setTeacherMsg(null);
    try {
      const res = await fetch('/api/lernweb/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeacherName.trim(),
          subjectName: newSubjectName.trim(),
          subjectCategory: newSubjectCategory.trim(),
          phone: newPhone.trim(),
          password: newPassword.trim(),
          bio: newBio.trim(),
          active: teachers.length === 0, // first teacher active by default
          toolsConfig: {
            arabicLexicon: newSubjectName.includes('عربي'),
            translator: newSubjectName.includes('لغة') || newSubjectName.includes('إنجليز') || newSubjectName.includes('ألمان') || newSubjectName.includes('فرنس'),
            geoHistoryMap: newSubjectName.includes('جغرافيا') || newSubjectName.includes('تاريخ'),
            socratesPhilosophy: newSubjectName.includes('فلسف') || newSubjectName.includes('منطق'),
            codeSandbox: newSubjectName.includes('برمج') || newSubjectName.includes('تكنولوجيا'),
            scienceLab: newSubjectName.includes('علوم') || newSubjectName.includes('كيمياء') || newSubjectName.includes('فيزياء') || newSubjectName.includes('أحياء'),
            mathCalculator: newSubjectName.includes('رياضيات') || newSubjectName.includes('هندسة'),
            virtualLabChemistry: newSubjectName.includes('كيمياء') || newSubjectName.includes('علوم'),
            physicsCircuitsLab: newSubjectName.includes('فيزياء') || newSubjectName.includes('علوم'),
            biologyMicroscopeLab: newSubjectName.includes('أحياء') || newSubjectName.includes('جيولوجيا') || newSubjectName.includes('علوم'),
          }
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إضافة المدرس');

      setTeacherMsg({ text: 'تمت إضافة المدرس الجديد وتخصيص معمله وأدواته ومادته بنجاح!', ok: true });
      setNewTeacherName('');
      setNewPhone('');
      setNewPassword('');
      setNewBio('');
      await loadLernWebData();
      onSave();
    } catch (err: any) {
      setTeacherMsg({ text: err.message || 'حدث خطأ أثناء إضافة المدرس', ok: false });
    } finally {
      setAddingTeacher(false);
    }
  };

  // 3. Set Active Platform Teacher
  const handleSetActiveTeacher = async (id: string) => {
    try {
      const res = await fetch('/api/lernweb/teacher/set-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('فشل تعيين المدرس');
      await loadLernWebData();
      onSave();
    } catch (e: any) {
      alert(e.message || 'تعذر التفعيل');
    }
  };

  // 4. Delete Teacher
  const handleDeleteTeacher = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف المدرس "${name}" من المنصة؟`)) return;
    try {
      const res = await fetch('/api/lernweb/teacher/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('فشل الحذف');
      await loadLernWebData();
      onSave();
    } catch (e: any) {
      alert(e.message || 'تعذر الحذف');
    }
  };

  // 5. Save Tools Config for Selected Teacher
  const handleSaveTeacherTools = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId) return;
    setSavingTools(true);
    setToolsMsg(null);
    try {
      const res = await fetch('/api/lernweb/teacher/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedTeacherId,
          toolsConfig: teacherTools,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ الأدوات');
      setToolsMsg({ text: 'تم حفظ وتفعيل المعامل التجريبية وأدوات المادة بنجاح!', ok: true });
      await loadLernWebData();
      onSave();
    } catch (err: any) {
      setToolsMsg({ text: err.message || 'تعذر حفظ المعامل', ok: false });
    } finally {
      setSavingTools(false);
    }
  };

  // 6. Save LernWeb Master Credentials
  const handleSaveMasterAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAuth(true);
    setAuthMsg(null);
    try {
      const res = await fetch('/api/teacher/subject-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: masterUser,
          password: masterPass.trim() ? masterPass : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الحفظ');
      setAuthMsg({ text: 'تم تحديث بيانات دخول إدارة ليرن ويب بنجاح!', ok: true });
      onSave();
    } catch (err: any) {
      setAuthMsg({ text: err.message || 'حدث خطأ', ok: false });
    } finally {
      setSavingAuth(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl my-6 rounded-3xl bg-gradient-to-b from-[#0f1c32] via-[#091426] to-[#060c18] border border-cyan-500/40 p-5 sm:p-7 shadow-2xl text-right max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق النافذة"
          className="absolute left-5 top-5 p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-cyan-500/25">
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 shadow-inner">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-400/30 text-[11px] font-bold text-cyan-300 mb-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>الإدارة المركزية الحصرية لشبكة ليرن ويب</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              بوابة إدارة ليرن ويب المركزية (LernWeb Control)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              إدارة وإضافة المدرسين، تعيين المادة الدراسية، والتحكم في المعامل التجريبية والأدوات التفاعلية لكل مدرس.
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* GATE: UNVERIFIED SCREEN */}
        {/* ============================================================ */}
        {!isAuthenticated ? (
          <div className="p-6 rounded-2xl bg-[#091528] border border-cyan-500/25 space-y-5 max-w-md mx-auto">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">تسجيل الدخول لإدارة ليرن ويب</h3>
              <p className="text-xs text-slate-300">
                أدخل اسم المستخدم وكلمة السر المعتمدة للوصول للوحة التحكم (الافتراضي: ليرن ويب / 102938)
              </p>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-bold text-center">
                {loginError}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم المستخدم</label>
                <input
                  type="text"
                  required
                  placeholder="ليرن ويب"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  className="input-field text-xs font-bold w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">كلمة السر</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="input-field text-xs font-mono w-full"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="btn-cyan w-full py-2.5 text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{loginLoading ? 'جاري التحقق...' : 'دخول لوحة التحكم'}</span>
              </button>
            </form>
          </div>
        ) : (
          /* ============================================================ */
          /* UNLOCKED MANAGEMENT TABS */
          /* ============================================================ */
          <div className="space-y-6">
            {/* Tabs Header */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#08111e] border border-cyan-500/25 text-xs font-extrabold">
              <button
                type="button"
                onClick={() => setActiveTab('teachers')}
                className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  activeTab === 'teachers'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>المدرسين والمواد ({teachers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tools')}
                className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  activeTab === 'tools'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                <span>المعامل التجريبية والأدوات</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('auth')}
                className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  activeTab === 'auth'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Key className="w-4 h-4" />
                <span>أمان وبوابة الدخول</span>
              </button>
            </div>

            {/* TAB 1: MULTI-TEACHER & SUBJECT MANAGEMENT */}
            {activeTab === 'teachers' && (
              <div className="space-y-6">
                {/* Form to Add a New Teacher */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#081324] border border-cyan-500/25 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
                    <h3 className="text-sm font-black text-cyan-300 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-emerald-400" />
                      <span>إضافة مدرس جديد وتخصيص مادته ومعمله وصفحته</span>
                    </h3>
                    <span className="badge-pill bg-cyan-950 text-cyan-300 border-cyan-500/30 text-[10px]">
                      منظومة المدرسين المتعددين
                    </span>
                  </div>

                  {teacherMsg && (
                    <div
                      className={`p-3 rounded-xl text-xs font-bold text-center ${
                        teacherMsg.ok
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {teacherMsg.text}
                    </div>
                  )}

                  <form onSubmit={handleAddTeacher} className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">اسم المدرس *</label>
                        <input
                          type="text"
                          required
                          placeholder="مثال: أستاذ أحمد محمود"
                          value={newTeacherName}
                          onChange={(e) => setNewTeacherName(e.target.value)}
                          className="input-field text-xs w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">المرحلة الدراسية *</label>
                        <input
                          type="text"
                          required
                          placeholder="مثال: المرحلة الثانوية"
                          value={newSubjectCategory}
                          onChange={(e) => setNewSubjectCategory(e.target.value)}
                          className="input-field text-xs w-full"
                        />
                      </div>
                    </div>

                    {/* Subject Specialization with quick presets */}
                    <div>
                      <label className="block text-xs font-bold text-cyan-300 mb-1.5 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>مادة وتخصص المدرس (يتم تعيينها حصرياً من هنا) *:</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {PRESET_SUBJECTS.map((sub) => (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => setNewSubjectName(sub)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all border ${
                              newSubjectName === sub
                                ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow'
                                : 'bg-[#060c18] text-slate-300 border-cyan-500/20 hover:border-cyan-400'
                            }`}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        required
                        value={newSubjectName}
                        onChange={(e) => setNewSubjectName(e.target.value)}
                        placeholder="أو اكتب اسم المادة والتخصص..."
                        className="input-field text-xs w-full font-bold text-cyan-200"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف للدخول *</label>
                        <input
                          type="text"
                          required
                          dir="ltr"
                          placeholder="01xxxxxxxxx"
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          className="input-field text-xs w-full font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">كلمة المرور / كود الدخول *</label>
                        <input
                          type="text"
                          required
                          dir="ltr"
                          placeholder="كلمة السر للمدرس"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="input-field text-xs w-full font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">نبذة تعريفية وسنوات الخبرة</label>
                      <textarea
                        rows={2}
                        placeholder="نبذة مختصرة عن المعلم تظهر في الصفحة الرسمية..."
                        value={newBio}
                        onChange={(e) => setNewBio(e.target.value)}
                        className="input-field text-xs w-full"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={addingTeacher}
                      className="btn-gold w-full py-2.5 text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{addingTeacher ? 'جاري الإضافة وتجهيز المعمل...' : 'إضافة المدرس واعتماده بالمنصة'}</span>
                    </button>
                  </form>
                </div>

                {/* List of Registered Teachers */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>قائمة المدرسين المعتمدين بالمنصة:</span>
                    <span className="text-[11px] text-cyan-400 font-mono">{teachers.length} مدرس</span>
                  </h4>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {teachers.map((t) => (
                      <div
                        key={t.id}
                        className={`card p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                          t.active
                            ? 'bg-gradient-to-br from-[#0c1b33] to-[#071324] border-cyan-400/60 shadow-lg shadow-cyan-500/10'
                            : 'bg-[#070e1c] border-blue-500/20'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="badge-pill bg-cyan-950/60 text-cyan-300 border-cyan-500/30 text-[10px] font-bold">
                              {t.subjectName || 'مادة عامة'}
                            </span>
                            {t.active ? (
                              <span className="badge-pill bg-emerald-950 text-emerald-300 border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span>المدرس النشط حالياً</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetActiveTeacher(t.id)}
                                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
                              >
                                تفعيل كالمدرس الرئيسي
                              </button>
                            )}
                          </div>

                          <h5 className="font-black text-white text-sm mb-1">{t.name}</h5>
                          <p className="text-[11px] text-slate-400 mb-1">{t.subjectCategory || 'المرحلة الثانوية'}</p>
                          {t.phone && (
                            <p className="text-[11px] text-slate-400 font-mono mb-2 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-cyan-400" />
                              <span dir="ltr">{t.phone}</span>
                            </p>
                          )}
                          {t.bio && (
                            <p className="text-[11px] text-slate-300 bg-[#050b14] p-2 rounded-xl border border-blue-500/10 line-clamp-2">
                              {t.bio}
                            </p>
                          )}
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-blue-500/15 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTeacherId(t.id);
                              if (t.toolsConfig) setTeacherTools(t.toolsConfig);
                              setActiveTab('tools');
                            }}
                            className="btn-cyan btn-sm text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <FlaskConical className="w-3 h-3" />
                            <span>تخصيص معمله وأدواته</span>
                          </button>

                          {teachers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTeacher(t.id, t.name)}
                              className="btn-red btn-sm text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>حذف</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: EXPERIMENTAL LABS & SUBJECT TOOLS */}
            {activeTab === 'tools' && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-[#081324] border border-cyan-500/25 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-cyan-300 flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-amber-400" />
                        <span>تخصيص وتفعيل المعامل التجريبية والأدوات التفاعلية للمدرس</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        اختر المدرس المحدد وفعّل أو عطّل المعامل والأدوات المناسبة لمادته وتخصصه:
                      </p>
                    </div>

                    {/* Teacher Selector */}
                    <div className="min-w-[180px]">
                      <select
                        value={selectedTeacherId}
                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                        className="input-field text-xs font-bold w-full bg-[#050b14]"
                      >
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.subjectName})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {toolsMsg && (
                    <div
                      className={`p-3 rounded-xl text-xs font-bold text-center ${
                        toolsMsg.ok
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {toolsMsg.text}
                    </div>
                  )}

                  <form onSubmit={handleSaveTeacherTools} className="space-y-4 pt-2">
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {[
                        {
                          key: 'scienceLab',
                          title: 'معمل العلوم والكيمياء والفيزياء الافتراضي',
                          desc: 'تجارب تفاعلية للكيمياء، محاكي الدوائر الكهربائية، والمجهر البيولوجي 3D.',
                          icon: FlaskConical,
                          badge: 'كيمياء وفيزياء وأحياء',
                        },
                        {
                          key: 'mathCalculator',
                          title: 'الحاسبة البيانية والمعادلات الرياضية والهندسة',
                          desc: 'رسم الدوال الجبرية، حساب التكامل والتفاضل، والجذور المثلثية.',
                          icon: Calculator,
                          badge: 'رياضيات وهندسة',
                        },
                        {
                          key: 'arabicLexicon',
                          title: 'معجم وبنك مصطلحات اللغة العربية والمعاني',
                          desc: 'البحث الفوري في لسان العرب وجذور الكلمات والبلاغة.',
                          icon: BookOpen,
                          badge: 'لغة عربية',
                        },
                        {
                          key: 'translator',
                          title: 'المترجم الذكي متعدد اللغات ونطق الكلمات',
                          desc: 'ترجمة ونطق صوتي مباشر للإنجليزية والألمانية والفرنسية.',
                          icon: Globe2,
                          badge: 'لغات أجنبية',
                        },
                        {
                          key: 'geoHistoryMap',
                          title: 'خريطة التاريخ والجغرافيا التفاعلية 3D',
                          desc: 'استكشاف تضاريس العالم، الحضارات التاريخية، وأطلس ثلاثي الأبعاد.',
                          icon: Compass,
                          badge: 'جغرافيا وتاريخ',
                        },
                        {
                          key: 'codeSandbox',
                          title: 'بيئة ومحرر البرمجة وتجربة الأكواد المباشرة',
                          desc: 'محرر تفاعلي لتشغيل لغات الويب، البايثون، والمنطق البرمجي.',
                          icon: Code,
                          badge: 'حاسب آلي وتكنولوجيا',
                        },
                        {
                          key: 'socratesPhilosophy',
                          title: 'حوار سقراط الفلسفي وتنمية التفكير النقدي',
                          desc: 'محاور فلسفي ذكي لمناقشة قضايا المنطق والأخلاق والفلسفة.',
                          icon: Atom,
                          badge: 'فلسفة ومنطق',
                        },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isEnabled = teacherTools[item.key] !== false;
                        return (
                          <div
                            key={item.key}
                            className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                              isEnabled
                                ? 'bg-[#0a1628] border-cyan-500/40 shadow-sm'
                                : 'bg-[#050b14] border-slate-800 opacity-60'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Icon className={`w-4 h-4 ${isEnabled ? 'text-cyan-400' : 'text-slate-500'}`} />
                                <h5 className="font-extrabold text-xs text-white">{item.title}</h5>
                              </div>
                              <p className="text-[11px] text-slate-300 leading-relaxed">{item.desc}</p>
                              <span className="inline-block text-[10px] font-bold text-amber-300/90 font-mono">
                                [{item.badge}]
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setTeacherTools({
                                  ...teacherTools,
                                  [item.key]: !isEnabled,
                                });
                              }}
                              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all border ${
                                isEnabled
                                  ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {isEnabled ? 'مفعّل ✓' : 'معطّل ✕'}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="submit"
                      disabled={savingTools}
                      className="btn-cyan w-full py-3 text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{savingTools ? 'جاري الحفظ...' : 'حفظ إعدادات وتخصيصات المعمل للمدرس المحدد'}</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* TAB 3: MASTER CREDENTIALS */}
            {activeTab === 'auth' && (
              <div className="p-5 rounded-2xl bg-[#081324] border border-cyan-500/25 space-y-4 max-w-lg mx-auto">
                <div className="flex items-center gap-2 pb-2 border-b border-cyan-500/20">
                  <Key className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-black text-white">تعديل بيانات دخول إدارة ليرن ويب المركزية</h3>
                    <p className="text-[11px] text-slate-400">
                      يمكنك تغيير اسم المستخدم وكلمة السر المستخدمة لفتح هذه اللوحة المركزية في أي وقت:
                    </p>
                  </div>
                </div>

                {authMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold text-center ${
                      authMsg.ok
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {authMsg.text}
                  </div>
                )}

                <form onSubmit={handleSaveMasterAuth} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">اسم المستخدم</label>
                    <input
                      type="text"
                      required
                      value={masterUser}
                      onChange={(e) => setMasterUser(e.target.value)}
                      placeholder="ليرن ويب"
                      className="input-field text-xs font-bold w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">كلمة السر الجديدة</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={masterPass}
                        onChange={(e) => setMasterPass(e.target.value)}
                        placeholder="اتركها فارغة لعدم التغيير"
                        className="input-field text-xs font-mono w-full pl-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300 p-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingAuth}
                    className="btn-gold w-full py-2.5 text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{savingAuth ? 'جاري الحفظ...' : 'حفظ بيانات الدخول الجديدة'}</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
