import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  User, Phone, GraduationCap, Award, Briefcase, Users,
  Building2, Landmark, Heart, FileText, PenLine, ChevronRight,
  ChevronLeft, Plus, Trash2, Loader2, Check, PlusCircle, History, X,
} from 'lucide-react';
import { cn } from '@utils/cn';
import { apiClient } from '@services/apiClient';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Alert, AlertDescription } from '@components/ui/alert';
import { departmentService, designationService } from '@services/departmentService';
import { useApiQuery } from '@hooks/useApiQuery';
import { useAuthStore } from '@store/authStore';
import CloudinaryUpload from '@components/ui/CloudinaryUpload';
import type { CloudinaryUploadResult } from '@services/cloudinaryService';

const BUSINESS_UNITS = ['Kurios SAT Training School', 'Kurios SAT Tech', 'VisaMax Travels Ltd', 'Beadmax Design', 'Beadmax Vocational School'];
const COMMON_POSITIONS = [
  'Creative Director', 'Travel Consultant', 'Project Coordinator', 'HR Officer',
  'Operations Manager', 'Instructor', 'Admin Officer', 'Software Engineer',
  'Accountant', 'Marketing Officer', 'Sales Executive', 'Customer Service Officer',
  'SAT Tutor', 'Visa Processing Officer', 'Bead Artisan', 'Vocational Trainer',
  'Receptionist', 'Finance Manager', 'Content Creator',
];

const SECTION_META = [
  { id: 'A', label: 'Personal Info', icon: User },
  { id: 'B', label: 'Contact', icon: Phone },
  { id: 'C', label: 'Emergency Contact', icon: Heart },
  { id: 'D', label: 'Education', icon: GraduationCap },
  { id: 'E', label: 'Certifications', icon: Award },
  { id: 'F', label: 'Work Experience', icon: Briefcase },
  { id: 'G', label: 'Guarantors', icon: Users },
  { id: 'H', label: 'Employment', icon: Building2 },
  { id: 'I', label: 'Bank Details', icon: Landmark },
  { id: 'J', label: 'Health', icon: Heart },
  { id: 'K', label: 'Acknowledgement', icon: FileText },
  { id: 'L', label: 'Signature', icon: PenLine },
];

type Section = 'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'I'|'J'|'K'|'L';

const INIT_DATA = {
  // A: Personal Info
  firstName: '', lastName: '', middleName: '', dateOfBirth: '', gender: '',
  maritalStatus: '', nationality: 'Nigerian', validIdType: '', validIdNumber: '',
  // B: Contact
  homeAddress: '', city: '', state: '', phone: '', whatsapp: '', email: '',
  facebook: '', instagram: '', linkedin: '',
  // C: Emergency Contact
  emergencyName: '', emergencyRelationship: '', emergencyPhone: '', emergencyEmail: '', emergencyAddress: '',
  // D: Education
  educationLevel: '', degree: '', institution: '', major: '', graduationYear: '', nyscStatus: '', nyscStateCode: '',
  // E: Certifications
  certifications: [] as { name: string; issuer: string; year: string; expiryYear: string }[],
  // F: Work Experience & Skills
  workExperience: [] as { company: string; position: string; startYear: string; endYear: string; description: string }[],
  skills: '',
  // G: Guarantors
  guarantor1Name: '', guarantor1Phone: '', guarantor1Email: '', guarantor1Address: '', guarantor1Relationship: '', guarantor1Occupation: '',
  guarantor2Name: '', guarantor2Phone: '', guarantor2Email: '', guarantor2Address: '', guarantor2Relationship: '', guarantor2Occupation: '',
  // H: Employment
  employeeId: '', businessUnit: '', departmentId: '', designationId: '', jobTitle: '', joiningDate: '', employmentStatus: 'Full-Time', supervisorName: '', workLocation: '',
  // I: Bank Details
  bankName: '', accountName: '', accountNumber: '', accountType: 'Savings', sortCode: '', pensionId: '', taxId: '',
  // J: Health
  bloodGroup: '', genotype: '', medicalConditions: '', medications: '', allergies: '', disabilityStatus: 'None', emergencyMedicalInfo: '',
  // K: Acknowledgement
  acknowledgedHandbook: false, acknowledgedPolicies: false, acknowledgedDataConsent: false,
  // L: Signature
  signatureDate: new Date().toISOString().slice(0, 10),
};

// ── Draft autosave (new-staff only) — survives idle logout / accidental navigation,
// the same way Google Forms resumes an in-progress response on the same device. ──
const DRAFT_KEY = 'maxhub:newStaffDraft';
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // stale after a week, not worth resuming

interface StaffFormDraft {
  data: typeof INIT_DATA;
  section: Section;
  useCustomPosition: boolean;
  customPosition: string;
  additionalUnits: string[];
  additionalDepartmentIds: string[];
  passportFile: CloudinaryUploadResult | null;
  validIdFile: CloudinaryUploadResult | null;
  utilityBillFile: CloudinaryUploadResult | null;
  certificateFile: CloudinaryUploadResult | null;
  signatureFile: CloudinaryUploadResult | null;
  savedAt: number;
}

function loadDraft(): StaffFormDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StaffFormDraft;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* localStorage unavailable — nothing to clear */ }
}

const fCls = 'w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';
const lCls = 'text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block';

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className={lCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Grid3({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{children}</div>;
}

export default function StaffForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();
  const isEdit = !!id;
  const isCEO = currentUser?.roles?.includes('superadmin') ?? false;
  const [initialDraft] = useState<StaffFormDraft | null>(() => (isEdit ? null : loadDraft()));
  const [section, setSection] = useState<Section>(initialDraft?.section ?? 'A');
  const [data, setData] = useState(initialDraft?.data ?? INIT_DATA);
  const [useCustomPosition, setUseCustomPosition] = useState(initialDraft?.useCustomPosition ?? false);
  const [customPosition, setCustomPosition] = useState(initialDraft?.customPosition ?? '');
  const [additionalUnits, setAdditionalUnits] = useState<string[]>(initialDraft?.additionalUnits ?? []);
  const [additionalDepartmentIds, setAdditionalDepartmentIds] = useState<string[]>(initialDraft?.additionalDepartmentIds ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdStaff, setCreatedStaff] = useState<any>(null);
  const [passportFile, setPassportFile] = useState<CloudinaryUploadResult | null>(initialDraft?.passportFile ?? null);
  const [validIdFile, setValidIdFile] = useState<CloudinaryUploadResult | null>(initialDraft?.validIdFile ?? null);
  const [utilityBillFile, setUtilityBillFile] = useState<CloudinaryUploadResult | null>(initialDraft?.utilityBillFile ?? null);
  const [certificateFile, setCertificateFile] = useState<CloudinaryUploadResult | null>(initialDraft?.certificateFile ?? null);
  const [signatureFile, setSignatureFile] = useState<CloudinaryUploadResult | null>(initialDraft?.signatureFile ?? null);
  const [showDraftBanner, setShowDraftBanner] = useState(!!initialDraft);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const { data: deptData } = useApiQuery(['departments'], () => departmentService.getAll());
  const { data: desgData } = useApiQuery(['designations'], () => designationService.getAll());
  const departments = (deptData as any[]) ?? [];
  const designations = (desgData as any[]) ?? [];

  const set = (field: string, value: any) => setData(d => ({ ...d, [field]: value }));

  const discardDraft = () => {
    clearDraft();
    setData(INIT_DATA);
    setSection('A');
    setUseCustomPosition(false);
    setCustomPosition('');
    setAdditionalUnits([]);
    setAdditionalDepartmentIds([]);
    setPassportFile(null);
    setValidIdFile(null);
    setUtilityBillFile(null);
    setCertificateFile(null);
    setSignatureFile(null);
    setShowDraftBanner(false);
    setLastSavedAt(null);
  };

  // Debounced autosave to localStorage — never on edit, never after a successful create.
  useEffect(() => {
    if (isEdit || createdStaff) return;
    const timer = setTimeout(() => {
      try {
        const savedAt = Date.now();
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          data, section, useCustomPosition, customPosition, additionalUnits, additionalDepartmentIds,
          passportFile, validIdFile, utilityBillFile, certificateFile, signatureFile, savedAt,
        } satisfies StaffFormDraft));
        setLastSavedAt(savedAt);
      } catch {
        // localStorage unavailable (quota / private browsing) — nothing actionable to show the user
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [data, section, useCustomPosition, customPosition, additionalUnits, additionalDepartmentIds, passportFile, validIdFile, utilityBillFile, certificateFile, signatureFile, isEdit, createdStaff]);

  const createStaff = useMutation({
    mutationFn: (payload: any) => isEdit
      ? apiClient.put(`/staff/${id}`, payload)
      : apiClient.post('/staff', payload),
    onSuccess: (res: any) => {
      if (isEdit) {
        navigate('/staff');
      } else {
        clearDraft();
        setCreatedStaff(res);
      }
    },
  });

  const validateSection = (s: Section): boolean => {
    const errs: Record<string, string> = {};
    if (s === 'A') {
      if (!data.firstName.trim()) errs.firstName = 'Required';
      if (!data.lastName.trim()) errs.lastName = 'Required';
      if (!data.dateOfBirth) errs.dateOfBirth = 'Required';
      if (!data.gender) errs.gender = 'Required';
    }
    if (s === 'B') {
      if (!data.email.trim()) errs.email = 'Required';
      if (!data.phone.trim()) errs.phone = 'Required';
    }
    if (s === 'H') {
      if (!data.businessUnit) errs.businessUnit = 'Required';
      if (!data.departmentId) errs.departmentId = 'Required';
      if (!data.joiningDate) errs.joiningDate = 'Required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const sectionOrder: Section[] = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  const currentIdx = sectionOrder.indexOf(section);

  const goNext = () => {
    if (!validateSection(section)) return;
    if (currentIdx < sectionOrder.length - 1) setSection(sectionOrder[currentIdx + 1]);
  };

  const goPrev = () => {
    if (currentIdx > 0) setSection(sectionOrder[currentIdx - 1]);
  };

  const onSubmit = () => {
    if (!validateSection('H')) { setSection('H'); return; }
    if (!validateSection('A')) { setSection('A'); return; }
    if (!validateSection('B')) { setSection('B'); return; }

    const payload: any = {
      firstName: data.firstName, lastName: data.lastName,
      email: data.email, phone: data.phone,
      dateOfBirth: data.dateOfBirth, gender: data.gender,
      employeeId: data.employeeId || undefined,
      businessUnit: data.businessUnit,
      departmentId: data.departmentId ? Number(data.departmentId) : undefined,
      additionalDepartmentIds: additionalDepartmentIds.map(Number),
      designationId: useCustomPosition ? undefined : (data.designationId ? Number(data.designationId) : undefined),
      joiningDate: data.joiningDate,
      employmentStatus: data.employmentStatus,
      customPosition: useCustomPosition ? customPosition : undefined,
      additionalUnits,
      avatar: passportFile?.url,
      idDocument: validIdFile?.url,
      utilityBillDocument: utilityBillFile?.url,
      certificateDocument: certificateFile?.url,
      signatureImage: signatureFile?.url,
      metadata: {
        middleName: data.middleName, maritalStatus: data.maritalStatus,
        nationality: data.nationality, validIdType: data.validIdType, validIdNumber: data.validIdNumber,
        homeAddress: data.homeAddress, city: data.city, state: data.state,
        whatsapp: data.whatsapp, facebook: data.facebook, instagram: data.instagram, linkedin: data.linkedin,
        emergencyName: data.emergencyName, emergencyRelationship: data.emergencyRelationship,
        emergencyPhone: data.emergencyPhone, emergencyEmail: data.emergencyEmail,
        educationLevel: data.educationLevel, degree: data.degree, institution: data.institution,
        major: data.major, graduationYear: data.graduationYear,
        nyscStatus: data.nyscStatus, nyscStateCode: data.nyscStateCode,
        certifications: data.certifications,
        workExperience: data.workExperience, skills: data.skills,
        guarantor1: { name: data.guarantor1Name, phone: data.guarantor1Phone, email: data.guarantor1Email, address: data.guarantor1Address, relationship: data.guarantor1Relationship, occupation: data.guarantor1Occupation },
        guarantor2: { name: data.guarantor2Name, phone: data.guarantor2Phone, email: data.guarantor2Email, address: data.guarantor2Address, relationship: data.guarantor2Relationship, occupation: data.guarantor2Occupation },
        jobTitle: data.jobTitle, workLocation: data.workLocation, supervisorName: data.supervisorName,
        bankName: data.bankName, accountName: data.accountName, accountNumber: data.accountNumber,
        accountType: data.accountType, sortCode: data.sortCode, pensionId: data.pensionId, taxId: data.taxId,
        bloodGroup: data.bloodGroup, genotype: data.genotype, medicalConditions: data.medicalConditions,
        medications: data.medications, allergies: data.allergies, disabilityStatus: data.disabilityStatus,
        acknowledgedHandbook: data.acknowledgedHandbook, acknowledgedPolicies: data.acknowledgedPolicies,
        acknowledgedDataConsent: data.acknowledgedDataConsent,
        signatureDate: data.signatureDate,
      },
    };
    createStaff.mutate(payload);
  };

  if (createdStaff) {
    const raw = createdStaff?.data ?? createdStaff;
    const staffId = raw?.employeeId || 'EMP-AUTO';
    const fullName = `${raw?.firstName || ''} ${raw?.lastName || ''}`.trim();
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Staff Added Successfully</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{fullName} has been added to the system.</p>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-5 mb-6 text-left space-y-3">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Staff Credentials</p>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Staff ID</span><span className="font-mono font-bold text-indigo-700 bg-indigo-100 px-3 py-0.5 rounded-lg">{staffId}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Full Name</span><span className="text-sm font-medium">{fullName}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Email</span><span className="text-sm">{raw?.email}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Temp Password</span><span className="font-mono font-bold bg-gray-100 dark:bg-gray-700 px-3 py-0.5 rounded-lg">MaxHub@2025</span></div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left text-xs text-amber-700">
            A welcome email has been sent to <strong>{raw?.email}</strong> with login credentials.
          </div>
          <Button onClick={() => navigate('/staff')} className="w-full">Go to Staff List</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-0 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <nav className="w-52 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 py-6 hidden lg:block">
        <div className="px-4 mb-6">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Staff' : 'New Staff'}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Complete all sections</p>
        </div>
        <div className="space-y-0.5 px-2">
          {SECTION_META.map((s, _i) => {
            const active = section === s.id;
            const done = sectionOrder.indexOf(s.id as Section) < currentIdx;
            return (
              <button key={s.id} onClick={() => setSection(s.id as Section)}
                className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all', active ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700')}>
                <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0', active ? 'bg-indigo-600 text-white' : done ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400')}>
                  {done ? <Check className="h-2.5 w-2.5" /> : s.id}
                </div>
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main */}
      <div className="flex-1 p-6 max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{SECTION_META[currentIdx].label}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              Section {section} of 12
              {!isEdit && lastSavedAt && (
                <span className="text-gray-400 dark:text-gray-500">
                  · Draft saved {new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>
          <div className="lg:hidden flex gap-1">
            {SECTION_META.map((s, i) => (
              <div key={s.id} className={cn('w-2 h-2 rounded-full transition-all', i === currentIdx ? 'bg-indigo-600 w-4' : i < currentIdx ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600')} />
            ))}
          </div>
        </div>

        {showDraftBanner && initialDraft && (
          <div className="mb-4 flex items-center justify-between gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl px-4 py-3">
            <div className="flex items-start gap-2.5">
              <History className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                Resumed your unsaved draft from {new Date(initialDraft.savedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button type="button" onClick={discardDraft} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 underline">
                Discard &amp; start over
              </button>
              <button type="button" onClick={() => setShowDraftBanner(false)} className="p-1 text-indigo-400 hover:text-indigo-600 rounded">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {createStaff.isError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {(createStaff.error as any)?.message}
              {(createStaff.error as any)?.response?.status === 409 && (
                <span className="block mt-1 text-xs opacity-90">
                  This usually means it was already submitted successfully (e.g. before a logout). Check the staff list before trying again with a different email.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">

          {/* ── A: Personal Info ── */}
          {section === 'A' && (
            <div className="space-y-4">
              <Field label="Passport Photo">
                <div className="flex items-center gap-4">
                  {passportFile?.url && (
                    <img src={passportFile.url} alt="Passport preview" className="w-16 h-16 rounded-xl object-cover border border-gray-200 dark:border-gray-600 flex-shrink-0" />
                  )}
                  <CloudinaryUpload
                    compact
                    folder="maxhub-erp/staff-avatars"
                    label={passportFile ? 'Change Photo' : 'Upload Photo'}
                    accept="image/*"
                    multiple={false}
                    maxSizeMB={3}
                    onUpload={results => setPassportFile(results[0])}
                  />
                </div>
              </Field>
              <Grid3>
                <Field label="First Name" required>
                  <Input value={data.firstName} onChange={e => set('firstName', e.target.value)} placeholder="John" className={errors.firstName ? 'border-red-400' : ''} />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                </Field>
                <Field label="Middle Name">
                  <Input value={data.middleName} onChange={e => set('middleName', e.target.value)} placeholder="Optional" />
                </Field>
                <Field label="Last Name" required>
                  <Input value={data.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Doe" className={errors.lastName ? 'border-red-400' : ''} />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                </Field>
              </Grid3>
              <Grid3>
                <Field label="Date of Birth" required>
                  <input type="date" value={data.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} className={cn(fCls, errors.dateOfBirth ? 'border-red-400' : '')} />
                  {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth}</p>}
                </Field>
                <Field label="Gender" required>
                  <select value={data.gender} onChange={e => set('gender', e.target.value)} className={cn(fCls, errors.gender ? 'border-red-400' : '')}>
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                  {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
                </Field>
                <Field label="Marital Status">
                  <select value={data.maritalStatus} onChange={e => set('maritalStatus', e.target.value)} className={fCls}>
                    <option value="">Select</option>
                    <option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
                  </select>
                </Field>
              </Grid3>
              <Grid3>
                <Field label="Nationality">
                  <Input value={data.nationality} onChange={e => set('nationality', e.target.value)} placeholder="Nigerian" />
                </Field>
                <Field label="Valid ID Type">
                  <select value={data.validIdType} onChange={e => set('validIdType', e.target.value)} className={fCls}>
                    <option value="">Select</option>
                    <option>National ID (NIN)</option><option>International Passport</option>
                    <option>Driver's Licence</option><option>Voter's Card</option>
                  </select>
                </Field>
                <Field label="ID Number">
                  <Input value={data.validIdNumber} onChange={e => set('validIdNumber', e.target.value)} placeholder="ID number" />
                </Field>
              </Grid3>
              <Field label="Upload Valid ID">
                <CloudinaryUpload
                  compact
                  folder="maxhub-erp/staff-documents"
                  label="Choose File"
                  accept="image/*,.pdf"
                  multiple={false}
                  maxSizeMB={5}
                  onUpload={results => setValidIdFile(results[0])}
                />
              </Field>
            </div>
          )}

          {/* ── B: Contact ── */}
          {section === 'B' && (
            <div className="space-y-4">
              <Grid2>
                <Field label="Email Address" required>
                  <Input type="email" value={data.email} onChange={e => set('email', e.target.value)} placeholder="john@example.com" className={errors.email ? 'border-red-400' : ''} />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </Field>
                <Field label="Phone Number" required>
                  <Input value={data.phone} onChange={e => set('phone', e.target.value)} placeholder="+234..." className={errors.phone ? 'border-red-400' : ''} />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </Field>
              </Grid2>
              <Field label="WhatsApp Number">
                <Input value={data.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="Same as phone or different" />
              </Field>
              <Field label="Home Address">
                <textarea value={data.homeAddress} onChange={e => set('homeAddress', e.target.value)} rows={2} placeholder="Full residential address"
                  className={cn(fCls, 'resize-none')} />
              </Field>
              <Grid2>
                <Field label="City">
                  <Input value={data.city} onChange={e => set('city', e.target.value)} placeholder="Lagos" />
                </Field>
                <Field label="State">
                  <Input value={data.state} onChange={e => set('state', e.target.value)} placeholder="Lagos State" />
                </Field>
              </Grid2>
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Social Media (Optional)</p>
                <Grid3>
                  <Field label="Facebook"><Input value={data.facebook} onChange={e => set('facebook', e.target.value)} placeholder="Facebook URL or username" /></Field>
                  <Field label="Instagram"><Input value={data.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@handle" /></Field>
                  <Field label="LinkedIn"><Input value={data.linkedin} onChange={e => set('linkedin', e.target.value)} placeholder="LinkedIn URL" /></Field>
                </Grid3>
              </div>
              <Field label="Utility Bill (Proof of Address)">
                <CloudinaryUpload
                  compact
                  folder="maxhub-erp/staff-documents"
                  label="Upload Bill"
                  accept="image/*,.pdf"
                  multiple={false}
                  maxSizeMB={5}
                  onUpload={results => setUtilityBillFile(results[0])}
                />
              </Field>
            </div>
          )}

          {/* ── C: Emergency Contact ── */}
          {section === 'C' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Person to contact in case of emergency.</p>
              <Grid2>
                <Field label="Full Name"><Input value={data.emergencyName} onChange={e => set('emergencyName', e.target.value)} placeholder="e.g. Amaka Eze" /></Field>
                <Field label="Relationship"><Input value={data.emergencyRelationship} onChange={e => set('emergencyRelationship', e.target.value)} placeholder="e.g. Spouse, Parent" /></Field>
              </Grid2>
              <Grid2>
                <Field label="Phone Number"><Input value={data.emergencyPhone} onChange={e => set('emergencyPhone', e.target.value)} placeholder="+234..." /></Field>
                <Field label="Email Address"><Input type="email" value={data.emergencyEmail} onChange={e => set('emergencyEmail', e.target.value)} placeholder="Optional" /></Field>
              </Grid2>
              <Field label="Address">
                <textarea value={data.emergencyAddress} onChange={e => set('emergencyAddress', e.target.value)} rows={2} placeholder="Residential address of emergency contact" className={cn(fCls, 'resize-none')} />
              </Field>
            </div>
          )}

          {/* ── D: Education ── */}
          {section === 'D' && (
            <div className="space-y-4">
              <Grid3>
                <Field label="Education Level">
                  <select value={data.educationLevel} onChange={e => set('educationLevel', e.target.value)} className={fCls}>
                    <option value="">Select</option>
                    <option>WAEC/NECO</option><option>OND</option><option>HND</option>
                    <option>B.Sc / B.A</option><option>M.Sc / MBA</option><option>PhD</option><option>Vocational</option>
                  </select>
                </Field>
                <Field label="Degree / Certificate">
                  <Input value={data.degree} onChange={e => set('degree', e.target.value)} placeholder="e.g. B.Sc Computer Science" />
                </Field>
                <Field label="Institution">
                  <Input value={data.institution} onChange={e => set('institution', e.target.value)} placeholder="e.g. University of Lagos" />
                </Field>
              </Grid3>
              <Grid3>
                <Field label="Major / Field of Study">
                  <Input value={data.major} onChange={e => set('major', e.target.value)} placeholder="e.g. Business Administration" />
                </Field>
                <Field label="Graduation Year">
                  <Input type="number" value={data.graduationYear} onChange={e => set('graduationYear', e.target.value)} placeholder="e.g. 2019" />
                </Field>
                <Field label="NYSC Status">
                  <select value={data.nyscStatus} onChange={e => set('nyscStatus', e.target.value)} className={fCls}>
                    <option value="">Select</option>
                    <option>Completed</option><option>Exempted</option><option>In Progress</option><option>Not Applicable</option>
                  </select>
                </Field>
              </Grid3>
              {data.nyscStatus === 'Completed' && (
                <Field label="NYSC State Code">
                  <Input value={data.nyscStateCode} onChange={e => set('nyscStateCode', e.target.value)} placeholder="e.g. LA/2019A/1234" />
                </Field>
              )}
              <Field label="Upload Degree Certificate">
                <CloudinaryUpload
                  compact
                  folder="maxhub-erp/staff-documents"
                  label="Upload Certificate"
                  accept="image/*,.pdf"
                  multiple={false}
                  maxSizeMB={5}
                  onUpload={results => setCertificateFile(results[0])}
                />
              </Field>
            </div>
          )}

          {/* ── E: Certifications ── */}
          {section === 'E' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Professional certifications, licenses, and credentials.</p>
              {data.certifications.map((cert, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3 relative">
                  <button type="button" onClick={() => set('certifications', data.certifications.filter((_, j) => j !== i))}
                    className="absolute top-3 right-3 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <Grid2>
                    <Field label="Certification Name"><Input value={cert.name} onChange={e => { const c = [...data.certifications]; c[i] = { ...c[i], name: e.target.value }; set('certifications', c); }} placeholder="e.g. PMP, CISA" /></Field>
                    <Field label="Issuing Organisation"><Input value={cert.issuer} onChange={e => { const c = [...data.certifications]; c[i] = { ...c[i], issuer: e.target.value }; set('certifications', c); }} placeholder="e.g. PMI, ISACA" /></Field>
                  </Grid2>
                  <Grid2>
                    <Field label="Year Obtained"><Input type="number" value={cert.year} onChange={e => { const c = [...data.certifications]; c[i] = { ...c[i], year: e.target.value }; set('certifications', c); }} placeholder="2022" /></Field>
                    <Field label="Expiry Year (if any)"><Input type="number" value={cert.expiryYear} onChange={e => { const c = [...data.certifications]; c[i] = { ...c[i], expiryYear: e.target.value }; set('certifications', c); }} placeholder="Leave blank if no expiry" /></Field>
                  </Grid2>
                </div>
              ))}
              <button type="button" onClick={() => set('certifications', [...data.certifications, { name: '', issuer: '', year: '', expiryYear: '' }])}
                className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium">
                <Plus className="h-4 w-4" /> Add Certification
              </button>
            </div>
          )}

          {/* ── F: Work Experience & Skills ── */}
          {section === 'F' && (
            <div className="space-y-4">
              {data.workExperience.map((exp, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3 relative">
                  <button type="button" onClick={() => set('workExperience', data.workExperience.filter((_, j) => j !== i))}
                    className="absolute top-3 right-3 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <Grid2>
                    <Field label="Company / Organisation"><Input value={exp.company} onChange={e => { const x = [...data.workExperience]; x[i] = { ...x[i], company: e.target.value }; set('workExperience', x); }} /></Field>
                    <Field label="Position / Title"><Input value={exp.position} onChange={e => { const x = [...data.workExperience]; x[i] = { ...x[i], position: e.target.value }; set('workExperience', x); }} /></Field>
                  </Grid2>
                  <Grid2>
                    <Field label="Start Year"><Input type="number" value={exp.startYear} onChange={e => { const x = [...data.workExperience]; x[i] = { ...x[i], startYear: e.target.value }; set('workExperience', x); }} placeholder="2018" /></Field>
                    <Field label="End Year"><Input type="number" value={exp.endYear} onChange={e => { const x = [...data.workExperience]; x[i] = { ...x[i], endYear: e.target.value }; set('workExperience', x); }} placeholder="2022 or leave blank if current" /></Field>
                  </Grid2>
                  <Field label="Brief Description">
                    <textarea value={exp.description} onChange={e => { const x = [...data.workExperience]; x[i] = { ...x[i], description: e.target.value }; set('workExperience', x); }} rows={2} className={cn(fCls, 'resize-none')} placeholder="Key responsibilities..." />
                  </Field>
                </div>
              ))}
              <button type="button" onClick={() => set('workExperience', [...data.workExperience, { company: '', position: '', startYear: '', endYear: '', description: '' }])}
                className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium">
                <Plus className="h-4 w-4" /> Add Work Experience
              </button>
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <Field label="Skills (comma-separated)">
                  <textarea value={data.skills} onChange={e => set('skills', e.target.value)} rows={3} className={cn(fCls, 'resize-none')}
                    placeholder="e.g. Microsoft Office, Adobe Photoshop, Customer Service, Project Management" />
                </Field>
              </div>
            </div>
          )}

          {/* ── G: Guarantors ── */}
          {section === 'G' && (
            <div className="space-y-6">
              {[1, 2].map(n => (
                <div key={n} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-4">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Guarantor {n}</p>
                  <Grid2>
                    <Field label="Full Name"><Input value={(data as any)[`guarantor${n}Name`]} onChange={e => set(`guarantor${n}Name`, e.target.value)} /></Field>
                    <Field label="Relationship"><Input value={(data as any)[`guarantor${n}Relationship`]} onChange={e => set(`guarantor${n}Relationship`, e.target.value)} placeholder="e.g. Uncle, Colleague" /></Field>
                  </Grid2>
                  <Grid2>
                    <Field label="Phone"><Input value={(data as any)[`guarantor${n}Phone`]} onChange={e => set(`guarantor${n}Phone`, e.target.value)} placeholder="+234..." /></Field>
                    <Field label="Email"><Input type="email" value={(data as any)[`guarantor${n}Email`]} onChange={e => set(`guarantor${n}Email`, e.target.value)} /></Field>
                  </Grid2>
                  <Grid2>
                    <Field label="Occupation"><Input value={(data as any)[`guarantor${n}Occupation`]} onChange={e => set(`guarantor${n}Occupation`, e.target.value)} /></Field>
                    <div />
                  </Grid2>
                  <Field label="Address">
                    <textarea value={(data as any)[`guarantor${n}Address`]} onChange={e => set(`guarantor${n}Address`, e.target.value)} rows={2} className={cn(fCls, 'resize-none')} />
                  </Field>
                </div>
              ))}
            </div>
          )}

          {/* ── H: Employment ── */}
          {section === 'H' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-4 space-y-4">
                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">Business Unit Assignment</p>
                <Field label="Primary Business Unit" required>
                  <select value={data.businessUnit} onChange={e => set('businessUnit', e.target.value)} className={cn(fCls, errors.businessUnit ? 'border-red-400' : '')}>
                    <option value="">Select business unit</option>
                    {BUSINESS_UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                  {errors.businessUnit && <p className="text-red-500 text-xs mt-1">{errors.businessUnit}</p>}
                </Field>
                {isCEO && (
                  <div>
                    <p className="text-xs font-medium text-indigo-600 mb-2">Additional Unit Access (CEO only)</p>
                    <div className="grid grid-cols-2 gap-2">
                      {BUSINESS_UNITS.map(u => (
                        <label key={u} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={additionalUnits.includes(u)} onChange={() => setAdditionalUnits(p => p.includes(u) ? p.filter(x => x !== u) : [...p, u])} className="w-4 h-4 accent-indigo-600" />
                          <span className="text-xs text-gray-700 dark:text-gray-300">{u}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Grid3>
                <Field label="Employee ID">
                  <Input value={data.employeeId} onChange={e => set('employeeId', e.target.value)} placeholder="VM001 (auto if blank)" />
                </Field>
                <Field label="Department" required>
                  <select value={data.departmentId} onChange={e => set('departmentId', e.target.value)} className={cn(fCls, errors.departmentId ? 'border-red-400' : '')}>
                    <option value="">Select</option>
                    {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  {errors.departmentId && <p className="text-red-500 text-xs mt-1">{errors.departmentId}</p>}
                </Field>
                <Field label="Employment Status">
                  <select value={data.employmentStatus} onChange={e => set('employmentStatus', e.target.value)} className={fCls}>
                    <option value="Full-Time">Full-time</option><option value="Part-Time">Part-time</option><option value="Contract">Contract</option><option value="Intern">Intern</option><option value="Probation">Probation</option>
                  </select>
                </Field>
              </Grid3>
              {data.departmentId && (
                <div>
                  <p className={lCls}>Additional Departments (optional, up to 2 more)</p>
                  <p className="text-[11px] text-gray-400 mb-2">
                    For staff covering more than one department while short-staffed. {data.departmentId && departments.find((d: any) => String(d.id) === data.departmentId)?.name} stays the primary department.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {departments.filter((d: any) => String(d.id) !== data.departmentId).map((d: any) => {
                      const idStr = String(d.id);
                      const checked = additionalDepartmentIds.includes(idStr);
                      const atLimit = additionalDepartmentIds.length >= 2 && !checked;
                      return (
                        <label key={d.id} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition',
                          checked ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300',
                          atLimit && 'opacity-40 cursor-not-allowed')}>
                          <input type="checkbox" checked={checked} disabled={atLimit}
                            onChange={() => setAdditionalDepartmentIds(p => p.includes(idStr) ? p.filter(x => x !== idStr) : [...p, idStr])}
                            className="w-3.5 h-3.5 accent-indigo-600" />
                          {d.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              <Grid2>
                <Field label="Position / Role">
                  {useCustomPosition ? (
                    <div className="space-y-2">
                      <input type="text" value={customPosition} onChange={e => setCustomPosition(e.target.value)} placeholder="e.g. Creative Director" className={fCls} />
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                        {COMMON_POSITIONS.map(p => (
                          <button key={p} type="button" onClick={() => setCustomPosition(p)}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 hover:bg-indigo-100 transition">{p}</button>
                        ))}
                      </div>
                      <button type="button" onClick={() => { setUseCustomPosition(false); setCustomPosition(''); }} className="text-xs text-gray-500 underline">← Use designation list</button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <select value={data.designationId} onChange={e => set('designationId', e.target.value)} className={fCls}>
                        <option value="">Select position</option>
                        {designations.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <button type="button" onClick={() => setUseCustomPosition(true)} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
                        <PlusCircle className="h-3 w-3" /> Create custom position
                      </button>
                    </div>
                  )}
                </Field>
                <Field label="Job Title">
                  <Input value={data.jobTitle} onChange={e => set('jobTitle', e.target.value)} placeholder="e.g. Senior Travel Consultant" />
                </Field>
              </Grid2>
              <Grid3>
                <Field label="Date of Hire" required>
                  <input type="date" value={data.joiningDate} onChange={e => set('joiningDate', e.target.value)} className={cn(fCls, errors.joiningDate ? 'border-red-400' : '')} />
                  {errors.joiningDate && <p className="text-red-500 text-xs mt-1">{errors.joiningDate}</p>}
                </Field>
                <Field label="Work Location">
                  <Input value={data.workLocation} onChange={e => set('workLocation', e.target.value)} placeholder="e.g. Head Office - VI" />
                </Field>
                <Field label="Supervisor / Line Manager">
                  <Input value={data.supervisorName} onChange={e => set('supervisorName', e.target.value)} placeholder="e.g. Mrs. Chinwe Obi" />
                </Field>
              </Grid3>
            </div>
          )}

          {/* ── I: Bank Details ── */}
          {section === 'I' && (
            <div className="space-y-4">
              <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
                Bank details are used for payroll. They are stored securely and never shared.
              </p>
              <Grid3>
                <Field label="Bank Name"><Input value={data.bankName} onChange={e => set('bankName', e.target.value)} placeholder="e.g. GTBank" /></Field>
                <Field label="Account Name"><Input value={data.accountName} onChange={e => set('accountName', e.target.value)} placeholder="Full name on account" /></Field>
                <Field label="Account Number"><Input value={data.accountNumber} onChange={e => set('accountNumber', e.target.value)} placeholder="10-digit account number" maxLength={10} /></Field>
              </Grid3>
              <Grid3>
                <Field label="Account Type">
                  <select value={data.accountType} onChange={e => set('accountType', e.target.value)} className={fCls}>
                    <option>Savings</option><option>Current</option>
                  </select>
                </Field>
                <Field label="Sort Code"><Input value={data.sortCode} onChange={e => set('sortCode', e.target.value)} placeholder="Optional" /></Field>
                <div />
              </Grid3>
              <Grid2>
                <Field label="Pension ID (RSA PIN)"><Input value={data.pensionId} onChange={e => set('pensionId', e.target.value)} placeholder="Optional" /></Field>
                <Field label="Tax Identification Number (TIN)"><Input value={data.taxId} onChange={e => set('taxId', e.target.value)} placeholder="Optional" /></Field>
              </Grid2>
            </div>
          )}

          {/* ── J: Health ── */}
          {section === 'J' && (
            <div className="space-y-4">
              <Grid3>
                <Field label="Blood Group">
                  <select value={data.bloodGroup} onChange={e => set('bloodGroup', e.target.value)} className={fCls}>
                    <option value="">Select</option>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label="Genotype">
                  <select value={data.genotype} onChange={e => set('genotype', e.target.value)} className={fCls}>
                    <option value="">Select</option>
                    {['AA','AS','AC','SS','SC','CC'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="Disability Status">
                  <select value={data.disabilityStatus} onChange={e => set('disabilityStatus', e.target.value)} className={fCls}>
                    <option>None</option><option>Visual</option><option>Hearing</option><option>Physical/Motor</option><option>Cognitive</option><option>Other</option>
                  </select>
                </Field>
              </Grid3>
              <Field label="Existing Medical Conditions">
                <textarea value={data.medicalConditions} onChange={e => set('medicalConditions', e.target.value)} rows={3} className={cn(fCls, 'resize-none')}
                  placeholder="e.g. Hypertension, Diabetes (leave blank if none)" />
              </Field>
              <Field label="Current Medications">
                <textarea value={data.medications} onChange={e => set('medications', e.target.value)} rows={2} className={cn(fCls, 'resize-none')} placeholder="Any regular medications (leave blank if none)" />
              </Field>
              <Field label="Allergies">
                <textarea value={data.allergies} onChange={e => set('allergies', e.target.value)} rows={2} className={cn(fCls, 'resize-none')} placeholder="Food, drug, or environmental allergies" />
              </Field>
              <Field label="Emergency Medical Information">
                <textarea value={data.emergencyMedicalInfo} onChange={e => set('emergencyMedicalInfo', e.target.value)} rows={2} className={cn(fCls, 'resize-none')} placeholder="Any info doctors should know in an emergency" />
              </Field>
            </div>
          )}

          {/* ── K: Acknowledgement ── */}
          {section === 'K' && (
            <div className="space-y-5">
              <p className="text-sm text-gray-600 dark:text-gray-400">Please read and acknowledge the following company policies before proceeding.</p>
              {[
                { key: 'acknowledgedHandbook', label: 'Employee Handbook', desc: 'I have read and understood the MaxHub Employee Handbook including code of conduct, dress code, and workplace behavior policies.' },
                { key: 'acknowledgedPolicies', label: 'HR Policies & Procedures', desc: 'I acknowledge MaxHub\'s policies on leave, attendance, performance management, and disciplinary procedures.' },
                { key: 'acknowledgedDataConsent', label: 'Data Protection Consent', desc: 'I consent to MaxHub processing my personal data for employment purposes in accordance with applicable data protection laws (NDPR).' },
              ].map(item => (
                <div key={item.key} className={cn('flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer', (data as any)[item.key] ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700' : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600')}
                  onClick={() => set(item.key, !(data as any)[item.key])}>
                  <div className={cn('mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all', (data as any)[item.key] ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-gray-500')}>
                    {(data as any)[item.key] && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── L: Signature ── */}
          {section === 'L' && (
            <div className="space-y-5">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                By providing your signature, you confirm that all information given on this form is true and accurate to the best of your knowledge.
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-xs text-amber-800 dark:text-amber-300">
                Providing false information may result in termination of employment.
              </div>
              <Field label="Upload Signature Image">
                <CloudinaryUpload
                  compact
                  folder="maxhub-erp/staff-documents"
                  label="Upload Signature"
                  accept="image/*"
                  multiple={false}
                  maxSizeMB={5}
                  onUpload={results => setSignatureFile(results[0])}
                />
              </Field>
              <Field label="Date Signed" required>
                <input type="date" value={data.signatureDate} onChange={e => set('signatureDate', e.target.value)} className={fCls} />
              </Field>

              {!data.acknowledgedHandbook || !data.acknowledgedPolicies || !data.acknowledgedDataConsent ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 text-xs text-red-700 dark:text-red-400">
                  You must complete all acknowledgements in Section K before submitting.
                </div>
              ) : (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <Check className="h-4 w-4 flex-shrink-0" /> All acknowledgements completed. Ready to submit.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button type="button" onClick={goPrev} disabled={currentIdx === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition">
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>

          <div className="flex gap-2">
            <button type="button" onClick={() => navigate('/staff')}
              className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">
              Cancel
            </button>
            {section !== 'L' ? (
              <button type="button" onClick={goNext}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={onSubmit}
                disabled={createStaff.isPending || !data.acknowledgedHandbook || !data.acknowledgedPolicies || !data.acknowledgedDataConsent}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50">
                {createStaff.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {isEdit ? 'Save Changes' : 'Submit & Create Staff'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
