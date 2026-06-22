// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────
export interface LoginPayload {
  email: string;
  password: string;
  deviceId?: string;
  deviceName?: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  departmentId?: number;
}

export interface AuthUser {
  id: number;
  uuid: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  departmentId: number | null;
  roles: string[];
  permissions: string[];
  // Business unit assignment (required for data isolation)
  businessUnit?: string;        // Primary business unit name
  additionalUnits?: string[];   // Extra units granted by CEO only
  // Job position (e.g. "Accountant", "Receptionist") — not an RBAC role, just a Staff field
  position?: string | null;
  phone?: string | null;
  avatar?: string | null;
  // True for accounts created with a temp password — frontend must force a
  // change before letting them reach anything else.
  mustChangePassword?: boolean;
  // Department codes (e.g. ['KS','VM','BM']) this user is linked to —
  // primary plus any secondary coverage. Drives department-specific nav.
  departmentCodes?: string[];
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  requiresMFA?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─────────────────────────────────────────────
// API Response shapes
// ─────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
  pagination?: Pagination;
  timestamp: string;
  path?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage?: boolean;
}

export interface SortOptions {
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

// ─────────────────────────────────────────────
// Shared base
// ─────────────────────────────────────────────
export interface BaseEntity {
  id: number;
  uuid: string;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// Staff / HR
// ─────────────────────────────────────────────
export type StaffStatus = 'Active' | 'Inactive' | 'OnLeave' | 'Suspended' | 'Resigned' | 'Retired';

export interface StaffMember extends BaseEntity {
  employeeId: string;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  dateOfBirth: string;
  gender?: 'Male' | 'Female' | 'Other';
  departmentId: number;
  designationId: number;
  locationId: number;
  reportingManagerId?: number;
  joiningDate: string;
  bloodGroup?: string;
  maritalStatus?: 'Single' | 'Married' | 'Divorced' | 'Widowed';
  nationality?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  status: StaffStatus;
  position?: string;
  businessUnit?: string;
  businessUnits?: string[];
  department?: Department;
  designation?: Designation;
}

export interface Department extends BaseEntity {
  code: string;
  name: string;
  description?: string;
  status: 'Active' | 'Inactive' | 'Archived';
}

export interface Designation extends BaseEntity {
  name: string;
  code?: string;
  departmentId?: number;
  level?: number;
}

// ─────────────────────────────────────────────
// Projects
// ─────────────────────────────────────────────
export type ProjectStatus = 'Planning' | 'Active' | 'OnHold' | 'Completed' | 'Cancelled' | 'Archived';
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface ProjectItem extends BaseEntity {
  projectCode: string;
  name: string;
  description?: string;
  departmentId: number;
  projectManagerId: number;
  startDate: string;
  endDate?: string;
  expectedEndDate?: string;
  actualEndDate?: string;
  budget?: number;
  actualCost?: number;
  status: ProjectStatus;
  priority: Priority;
  progress: number;
  department?: Department;
  projectManager?: { firstName: string; lastName: string };
}

// ─────────────────────────────────────────────
// Tasks
// ─────────────────────────────────────────────
export type TaskStatus = 'Todo' | 'InProgress' | 'InReview' | 'Blocked' | 'Done' | 'Cancelled';

export interface TaskItem extends BaseEntity {
  taskCode: string;
  title: string;
  description?: string;
  /** Absent for a personal task (self-created, not tied to a project). */
  projectId?: number;
  assigneeId?: number;
  reporterId: number;
  milestoneId?: number;
  priority: Priority;
  status: TaskStatus;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  progress: number;
  label?: string;
  project?: { name: string };
  assignee?: { firstName: string; lastName: string };
}

// ─────────────────────────────────────────────
// Leave
// ─────────────────────────────────────────────
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Withdrawn';

export interface LeaveRequestItem extends BaseEntity {
  staffId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  numberofDays: number;
  reason: string;
  documentUrl?: string;
  status: LeaveStatus;
  approvalComments?: string;
  approvalDate?: string;
  staff?: { firstName: string; lastName: string };
  leaveType?: { name: string; color?: string };
  // True when the requester is themselves HR or Admin — those can only be
  // approved/rejected by Super Admin, never by a peer HR/Admin.
  requiresSuperAdminApproval?: boolean;
}

export interface LeaveType extends BaseEntity {
  name: string;
  code: string;
  color?: string;
  maxDays: number;
  isPaid: boolean;
}

export interface LeaveBalance extends BaseEntity {
  staffId: number;
  leaveTypeId: number;
  year: number;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  leaveType?: LeaveType;
}

// ─────────────────────────────────────────────
// Attendance
// ─────────────────────────────────────────────
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'HalfDay' | 'WFH' | 'Holiday' | 'OnLeave';

export interface AttendanceRecord extends BaseEntity {
  staffId: number;
  shiftId?: number;
  attendanceDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  hoursWorked?: number;
  overtimeHours?: number;
  lateMinutes?: number;
  notes?: string;
  staff?: { firstName: string; lastName: string };
}

// ─────────────────────────────────────────────
// Staff Query / Ticket System
// ─────────────────────────────────────────────
export type QueryPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type QueryType = 'Query' | 'Complaint' | 'Task' | 'Issue' | 'Request';
export type QueryStatus = 'Pending' | 'InProgress' | 'Resolved' | 'Closed';

export interface StaffQuery extends BaseEntity {
  title: string;
  description: string;
  priority: QueryPriority;
  type: QueryType;
  departmentId?: number;
  assignedStaffId?: number;
  createdByUserId: number;
  status: QueryStatus;
  dueDate?: string;
  resolvedAt?: string;
  closedAt?: string;
  attachments?: string;
  replies?: StaffQueryReply[];
}

export interface StaffQueryReply extends BaseEntity {
  queryId: number;
  message: string;
  senderUserId: number;
  isInternal: boolean;
  attachments?: string;
}

export interface QueryStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  overdue: number;
}

// ─────────────────────────────────────────────
// Client Management
// ─────────────────────────────────────────────
export type ClientStatus = 'Active' | 'Inactive' | 'Pending' | 'Suspended';

export interface ClientItem extends BaseEntity {
  clientId: string;
  fullName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  nationality?: string;
  dateOfBirth?: string;
  passportUrl?: string;
  avatar?: string;
  departmentId?: number;
  assignedStaffId?: number;
  registrationDate: string;
  status: ClientStatus;
  notes?: string;
  createdByUserId: number;
}

export type DocumentCategory =
  | 'Passport'
  | 'Certificate'
  | 'Visa'
  | 'AdmissionLetter'
  | 'EmploymentDocument'
  | 'Contract'
  | 'IdentityDocument'
  | 'Other';

export interface ClientDocument extends BaseEntity {
  clientId: number;
  documentName: string;
  category: DocumentCategory;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  version: number;
  description?: string;
  uploadedByUserId: number;
}

export interface ClientNote extends BaseEntity {
  clientId: number;
  note: string;
  createdByUserId: number;
}

// ─────────────────────────────────────────────
// Communication
// ─────────────────────────────────────────────
export type CommChannel = 'Email' | 'SMS' | 'WhatsApp';
export type CommType = 'Weekly' | 'Birthday' | 'Manual' | 'Scheduled';
export type CommStatus = 'Pending' | 'Sending' | 'Completed' | 'Failed' | 'Partial';

export interface MessageTemplate extends BaseEntity {
  name: string;
  type: 'Weekly' | 'Birthday' | 'Custom' | 'Welcome' | 'Reminder';
  subject?: string;
  emailContent?: string;
  smsContent?: string;
  whatsappContent?: string;
  isActive: boolean;
  createdByUserId: number;
}

export interface CommunicationLog extends BaseEntity {
  type: CommType;
  channel: CommChannel;
  recipientType: 'All' | 'Department' | 'Selected' | 'Country' | 'Status';
  subject?: string;
  message: string;
  totalRecipients: number;
  successCount: number;
  failureCount: number;
  status: CommStatus;
  scheduledAt?: string;
  sentAt?: string;
}

export interface CommStats {
  total: number;
  totalSent: number;
  emailSent: number;
  smsSent: number;
  whatsappSent: number;
  completed: number;
  failed: number;
  successRate: number;
}
