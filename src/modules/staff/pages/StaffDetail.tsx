import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApiQuery } from '@hooks/useApiQuery';
import { useApiMutation } from '@hooks/useApiMutation';
import { staffService } from '@services/staffService';
import {
  ArrowLeft, Pencil, Trash2, Mail, Phone, Building2, Calendar,
  User, Heart, AlertTriangle, Briefcase, MapPin,
} from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-green-50 text-green-700 border border-green-200',
  Inactive: 'bg-gray-50 text-gray-600 border border-gray-200',
  Suspended: 'bg-red-50 text-red-700 border border-red-200',
  OnLeave: 'bg-amber-50 text-amber-700 border border-amber-200',
};

const AVATAR_COLORS = ['bg-indigo-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

export default function StaffDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: staff, isLoading, isError } = useApiQuery(
    ['staff', id],
    () => staffService.getById(id!),
    { enabled: !!id }
  );

  const { mutate: remove, isPending: removing } = useApiMutation(
    () => staffService.remove(id!),
    { invalidateKeys: [['staff']], onSuccess: () => navigate('/staff') }
  );

  const initials = staff ? `${staff.firstName?.[0] ?? ''}${staff.lastName?.[0] ?? ''}`.toUpperCase() : '';
  const colorIdx = id ? id.charCodeAt(0) % AVATAR_COLORS.length : 0;

  if (isLoading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (isError || !staff) return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-10 text-center">
      <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
      <p className="text-red-700 dark:text-red-400 font-medium">Staff member not found.</p>
      <button onClick={() => navigate('/staff')} className="mt-4 text-sm text-indigo-600 hover:underline">
        Back to Staff Directory
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/staff')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Staff Directory
        </button>
        <div className="flex items-center gap-2">
          <Link
            to={`/staff/${id}/edit`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
          <button
            onClick={() => { if (confirm('Delete this staff member?')) remove(undefined as never); }}
            disabled={removing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {removing ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Profile card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-start gap-5">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${AVATAR_COLORS[colorIdx]}`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {staff.firstName} {staff.lastName}
              </h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[staff.status] ?? STATUS_STYLES.Inactive}`}>
                {staff.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{staff.employeeId}</p>
            <div className="flex flex-wrap gap-4 mt-3">
              {staff.email && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="h-3.5 w-3.5" /> {staff.email}
                </div>
              )}
              {staff.phone && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <Phone className="h-3.5 w-3.5" /> {staff.phone}
                </div>
              )}
              {(staff.position || staff.designation?.name) && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <Briefcase className="h-3.5 w-3.5" /> {staff.position || staff.designation?.name}
                </div>
              )}
              {staff.businessUnit && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="h-3.5 w-3.5" /> {staff.businessUnit}
                </div>
              )}
              {staff.department?.name && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <Building2 className="h-3.5 w-3.5" /> {staff.department.name}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Personal Info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
              <User className="h-3.5 w-3.5" />
            </div>
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Personal Information</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Date of Birth" value={staff.dateOfBirth ? new Date(staff.dateOfBirth).toLocaleDateString() : undefined} />
            <InfoRow label="Gender" value={staff.gender} />
            <InfoRow label="Marital Status" value={staff.maritalStatus} />
            <InfoRow label="Nationality" value={staff.nationality} />
            <InfoRow label="Blood Group" value={staff.bloodGroup} />
            <InfoRow label="Alternate Phone" value={staff.alternatePhone} />
          </div>
        </div>

        {/* Work Info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-lg flex items-center justify-center">
              <Calendar className="h-3.5 w-3.5" />
            </div>
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Work Information</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Department" value={staff.department?.name} />
            <InfoRow label="Designation" value={staff.designation?.name} />
            <InfoRow label="Position" value={staff.position} />
            <InfoRow label="Primary Business Unit" value={staff.businessUnit} />
            <InfoRow label="Joining Date" value={staff.joiningDate ? new Date(staff.joiningDate).toLocaleDateString() : undefined} />
          </div>
          {staff.businessUnits && staff.businessUnits.length > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">All Business Units</p>
              <div className="flex flex-wrap gap-2">
                {staff.businessUnits.map((unit) => (
                  <span key={unit} className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                    {unit}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Emergency Contact */}
        {(staff.emergencyContactName || staff.emergencyContactPhone) && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-lg flex items-center justify-center">
                <Heart className="h-3.5 w-3.5" />
              </div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Emergency Contact</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Name" value={staff.emergencyContactName} />
              <InfoRow label="Phone" value={staff.emergencyContactPhone} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
