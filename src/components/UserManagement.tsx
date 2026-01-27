import { useState, useEffect, useRef } from "react";
import { 
  Users, 
  UserPlus, 
  Upload,
  Download, 
  MoreHorizontal, 
  Search, 
  Edit, 
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  X,
  Check,
  FileText,
  Building2,
  UserCircle,
  Shield,
  ArrowLeft,
  Loader2,
  ExternalLink
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Label } from "./ui/label";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Checkbox } from "./ui/checkbox";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Card, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";

type UserType = 'Internal Staff' | 'Individual Customer' | 'Business Customer';
type UserStatus = 'Active' | 'Inactive' | 'Pending Approval' | 'Pending Verification';
type StaffRole = 'Admin' | 'Sales' | 'Finance' | 'Support' | 'Operations' | 'Production';
type DbStatus = 'pending' | 'active' | 'inactive';

// Admin roles that can perform administrative actions
const ADMIN_ROLES = ['super_user', 'admin'];

// Pagination settings
const ITEMS_PER_PAGE = 10;

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  userType: UserType;
  status: UserStatus;
  role?: StaffRole;  // Only for Internal Staff
  lastLogin: string;
  
  // Customer specific fields
  tin?: string;  // Tax Identification Number (individual: IG..., business: C/CS/D/etc...)
  idType?: string;  // 'NRIC', 'PASSPORT', 'ARMY' for individual, 'BRN' for business
  idNumber?: string;  // ID number: NRIC/Passport/Army for individual, BRN for business
  identityDocumentUrl?: string;
  idCardFrontImage?: string;
  idCardBackImage?: string;
}

interface UserManagementProps {
  userRole?: string;
}

/**
 * Map database status to UI status
 */
function mapDbStatusToUi(dbStatus: string): UserStatus {
  switch (dbStatus) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'pending':
    default:
      return 'Pending Approval';
  }
}

/**
 * Map UI status to database status
 */
function mapUiStatusToDb(uiStatus: UserStatus): DbStatus {
  switch (uiStatus) {
    case 'Active':
      return 'active';
    case 'Inactive':
      return 'inactive';
    case 'Pending Approval':
    case 'Pending Verification':
    default:
      return 'pending';
  }
}

/**
 * Get the primary staff role from roles array
 */
function getStaffRole(roles: string[]): StaffRole | undefined {
  const roleMap: Record<string, StaffRole> = {
    'admin': 'Admin',
    'super_user': 'Admin',
    'sales': 'Sales',
    'finance': 'Finance',
    'support': 'Support',
    'operations': 'Operations',
    'production': 'Production',
  };
  
  for (const role of roles) {
    if (roleMap[role]) {
      return roleMap[role];
    }
  }
  return undefined;
}

export function UserManagement({ userRole = '' }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pendingRole, setPendingRole] = useState<StaffRole>('Sales');
  const [rejectionReason, setRejectionReason] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check if current user is admin/super_user
  const isAdmin = ADMIN_ROLES.includes(userRole);
  
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "",
    status: "Active" as UserStatus
  });
  const [addForm, setAddForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "",
    status: "pending" as DbStatus
  });
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user-management');
      const data = await response.json();

      if (!data.success) {
        toast.error(data.message || 'Failed to fetch users');
        return;
      }

      // Transform API response to User format
      const transformedUsers: User[] = data.users.map((user: any) => ({
        id: user.id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email,
        phone: user.phone || '',
        userType: user.userType as UserType,
        status: mapDbStatusToUi(user.status),
        // Role may be undefined for pending internal staff (they need role assignment on approval)
        role: getStaffRole(user.roles || []),
        lastLogin: user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'Never',
        tin: user.tin,
        idType: user.idType,
        idNumber: user.idNumber,
        identityDocumentUrl: user.identityDocumentUrl,
      }));

      setUsers(transformedUsers);
    } catch (error) {
      console.error('Fetch users error:', error);
      toast.error('An error occurred while fetching users');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUserType = userTypeFilter === "all" || user.userType === userTypeFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesUserType && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, userTypeFilter, statusFilter]);

  // Pagination handlers
  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= 5) {
      // Show all pages if 5 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Export users to CSV
  const handleExportUsers = () => {
    // Define CSV headers
    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'User Type',
      'Role',
      'Status',
    ];

    // Convert users to CSV rows
    const rows = filteredUsers.map(user => [
      user.firstName,
      user.lastName,
      user.email,
      user.phone || '',
      user.userType,
      user.role || '',
      user.status,
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${filteredUsers.length} users to CSV`);
  };

  // Handle file selection for import
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setImportFile(file);
    setImportErrors([]);

    // Parse CSV for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setImportErrors(['CSV file must have a header row and at least one data row']);
        return;
      }

      // Parse header
      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
      
      // Required columns
      const requiredColumns = ['first name', 'last name', 'email', 'role'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        setImportErrors([`Missing required columns: ${missingColumns.join(', ')}`]);
        return;
      }

      // Parse data rows
      const preview: any[] = [];
      const errors: string[] = [];

      for (let i = 1; i < Math.min(lines.length, 6); i++) { // Preview first 5 rows
        const values = parseCSVLine(lines[i]);
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim() || '';
        });

        // Basic validation
        if (!row['email'] || !row['first name'] || !row['last name']) {
          errors.push(`Row ${i}: Missing required fields`);
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row['email'])) {
          errors.push(`Row ${i}: Invalid email format`);
        }

        preview.push({
          firstName: row['first name'] || '',
          lastName: row['last name'] || '',
          email: row['email'] || '',
          phone: row['phone'] || '',
          role: row['role'] || '',
        });
      }

      setImportPreview(preview);
      if (errors.length > 0) {
        setImportErrors(errors);
      }
    };
    reader.readAsText(file);
  };

  // Parse a CSV line handling quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    
    return result;
  };

  // Handle import submit
  const handleImportUsers = async () => {
    if (!importFile) return;

    setIsImporting(true);
    
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
        
        const usersToImport: any[] = [];
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const row: any = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index]?.trim() || '';
          });

          // Validate
          if (!row['email'] || !row['first name'] || !row['last name'] || !row['role']) {
            errors.push(`Row ${i}: Missing required fields (first name, last name, email, role)`);
            continue;
          }

          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row['email'])) {
            errors.push(`Row ${i}: Invalid email format`);
            continue;
          }

          usersToImport.push({
            firstName: row['first name'],
            lastName: row['last name'],
            email: row['email'],
            phone: row['phone'] || '',
            role: row['role'].toLowerCase(),
          });
        }

        if (usersToImport.length === 0) {
          setImportErrors(['No valid users to import']);
          setIsImporting(false);
          return;
        }

        // Call API to import users
        const response = await fetch('/api/user-management/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: usersToImport }),
        });

        const data = await response.json();

        if (!data.success) {
          toast.error(data.message || 'Failed to import users');
          if (data.errors) {
            setImportErrors(data.errors);
          }
          setIsImporting(false);
          return;
        }

        toast.success(`Successfully imported ${data.imported} users`);
        if (data.skipped > 0) {
          toast.info(`${data.skipped} users were skipped (already exist)`);
        }

        // Refresh the user list
        fetchUsers();
        
        // Close dialog and reset state
        setIsImportDialogOpen(false);
        setImportFile(null);
        setImportPreview([]);
        setImportErrors([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };

      reader.readAsText(importFile);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('An error occurred while importing users');
    } finally {
      setIsImporting(false);
    }
  };

  // Download sample CSV template
  const handleDownloadTemplate = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Role'];
    const sampleData = [
      ['John', 'Doe', 'john.doe@example.com', '+60 12-345-6789', 'Sales'],
      ['Jane', 'Smith', 'jane.smith@example.com', '+60 13-456-7890', 'Finance'],
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', 'user_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Template downloaded');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getUserTypeIcon = (userType: UserType) => {
    switch (userType) {
      case 'Internal Staff':
        return <Shield className="h-3.5 w-3.5" />;
      case 'Individual Customer':
        return <UserCircle className="h-3.5 w-3.5" />;
      case 'Business Customer':
        return <Building2 className="h-3.5 w-3.5" />;
    }
  };

  const getUserTypeBadgeColor = (userType: UserType) => {
    switch (userType) {
      case 'Internal Staff':
        return 'bg-[#1E40AF] hover:bg-[#1E3A8A] text-white';
      case 'Individual Customer':
        return 'bg-[#8B5CF6] hover:bg-[#7C3AED] text-white';
      case 'Business Customer':
        return 'bg-[#059669] hover:bg-[#047857] text-white';
    }
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    // For pending internal staff without role, default to 'Sales'
    // Otherwise use their existing role
    setPendingRole(user.role || 'Sales');
    setRejectionReason("");
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedUser(null);
    setRejectionReason("");
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role || "",
      status: user.status
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    if (!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.email.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editForm.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/user-management/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email,
          phone: editForm.phone || undefined,
          role: editForm.role || undefined,
          status: mapUiStatusToDb(editForm.status),
        }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.message || 'Failed to update user');
        return;
      }

      // Update local state
      setUsers(users.map(user => 
        user.id === selectedUser.id 
          ? { 
              ...user, 
              firstName: editForm.firstName,
              lastName: editForm.lastName,
              email: editForm.email,
              phone: editForm.phone,
              role: editForm.role as StaffRole,
              status: editForm.status,
            }
          : user
      ));

      toast.success("User updated successfully");
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Update user error:', error);
      toast.error('An error occurred while updating the user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter(user => user.id !== userId));
    toast.success("User deleted successfully");
  };

  const handleOpenAddDialog = () => {
    setAddForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "",
      status: "pending"
    });
    setIsAddDialogOpen(true);
  };

  const handleAddNewUser = async () => {
    if (!addForm.firstName.trim() || !addForm.lastName.trim() || !addForm.email.trim() || !addForm.role) {
      toast.error("Please fill in all required fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(addForm.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsAddingUser(true);
    
    try {
      const response = await fetch('/api/user-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: addForm.firstName,
          lastName: addForm.lastName,
          email: addForm.email,
          phone: addForm.phone || undefined,
          role: addForm.role.toLowerCase(),
          status: addForm.status,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.message || "Failed to create user");
        return;
      }

      // Map API status to UI status
      const statusMap: Record<string, UserStatus> = {
        'pending': 'Pending Verification',
        'active': 'Active',
        'inactive': 'Inactive',
      };

      // Add the new user to local state
      const newUser: User = {
        id: data.user.id,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        email: data.user.email,
        phone: data.user.phone || '',
        userType: 'Internal Staff',
        role: addForm.role as StaffRole,
        status: statusMap[data.user.status] || 'Pending Verification',
        lastLogin: 'Never'
      };

      setUsers([newUser, ...users]);
      
      // Show success message based on email status
      if (data.emailSent) {
        toast.success("User created! Password setup email has been sent.");
      } else {
        toast.warning("User created but email failed to send. Please contact support.");
      }
      
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Add user error:', error);
      toast.error("An error occurred while creating the user");
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleApproveUser = async () => {
    if (!selectedUser) return;

    // For internal staff, role must be selected
    if (selectedUser.userType === 'Internal Staff' && !pendingRole) {
      toast.error("Please select a role for the staff member");
      return;
    }

    setIsApproving(true);
    try {
      const response = await fetch('/api/user-management/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          role: selectedUser.userType === 'Internal Staff' ? pendingRole : undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.message || 'Failed to approve user');
        return;
      }

      // Update local state
      setUsers(users.map(user => 
        user.id === selectedUser.id 
          ? { 
              ...user, 
              status: 'Active' as UserStatus,
              role: selectedUser.userType === 'Internal Staff' ? pendingRole : user.role,
              lastLogin: new Date().toISOString().split('T')[0]
            }
          : user
      ));

      toast.success(`${selectedUser.firstName} ${selectedUser.lastName} has been approved`);
      setIsApproveDialogOpen(false);
      setViewMode('list');
      setSelectedUser(null);
    } catch (error) {
      console.error('Approve user error:', error);
      toast.error('An error occurred while approving the user');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectUser = async () => {
    if (!selectedUser) return;

    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setIsRejecting(true);
    try {
      const response = await fetch('/api/user-management/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          rejectionReason: rejectionReason.trim(),
        }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.message || 'Failed to reject user');
        return;
      }

      // Remove user from local state
      setUsers(users.filter(user => user.id !== selectedUser.id));
      
      toast.success(`Registration for ${selectedUser.firstName} ${selectedUser.lastName} has been rejected`);
      setIsRejectDialogOpen(false);
      setRejectionReason("");
      setViewMode('list');
      setSelectedUser(null);
    } catch (error) {
      console.error('Reject user error:', error);
      toast.error('An error occurred while rejecting the user');
    } finally {
      setIsRejecting(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#1E40AF]" />
          <p className="text-[#6B7280]">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {viewMode === 'detail' && selectedUser ? (
        /* User Detail Full Page View */
        <div className="space-y-6">
          {/* Back Button and Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handleBackToList}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1>User Details</h1>
              <p className="text-[#374151]">
                {selectedUser.status === 'Pending Approval' 
                  ? 'Review user information and approve or reject the registration' 
                  : 'View detailed user information'}
              </p>
            </div>
          </div>

          {/* User Detail Content */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <div>
                  {selectedUser.status === 'Active' ? (
                    <Badge className="bg-[#059669] hover:bg-[#047857]">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  ) : selectedUser.status === 'Pending Approval' ? (
                    <Badge className="bg-[#F59E0B] hover:bg-[#D97706]">
                      <Clock className="mr-1 h-3 w-3" />
                      Pending Approval
                    </Badge>
                  ) : (
                    <Badge className="bg-[#6B7280] hover:bg-[#4B5563]">
                      <XCircle className="mr-1 h-3 w-3" />
                      Inactive
                    </Badge>
                  )}
                </div>
                <Badge className={getUserTypeBadgeColor(selectedUser.userType)}>
                  {getUserTypeIcon(selectedUser.userType)}
                  <span className="ml-1.5">{selectedUser.userType}</span>
                </Badge>
              </div>

              <Separator />

              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-[#111827]">Personal Information</h3>
                
                <Card className="border-[#E5E7EB]">
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[#6B7280]">First Name</Label>
                        <p className="text-[#111827] mt-1">{selectedUser.firstName}</p>
                      </div>
                      <div>
                        <Label className="text-[#6B7280]">Last Name</Label>
                        <p className="text-[#111827] mt-1">{selectedUser.lastName}</p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-[#6B7280]">Email Address</Label>
                      <p className="text-[#111827] mt-1">{selectedUser.email}</p>
                    </div>
                    
                    <div>
                      <Label className="text-[#6B7280]">Phone Number</Label>
                      <p className="text-[#111827] mt-1">{selectedUser.phone}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Internal Staff - Role Assignment */}
              {selectedUser.userType === 'Internal Staff' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-[#111827]">Role Assignment</h3>
                    
                    <Card className="border-[#E5E7EB] bg-[#F9FAFB]">
                      <CardContent className="pt-6">
                        {selectedUser.status === 'Pending Approval' && isAdmin ? (
                          <div className="space-y-2">
                            <Label htmlFor="role-select">
                              Assign Role <span className="text-red-500">*</span>
                            </Label>
                            <Select value={pendingRole} onValueChange={(value: StaffRole) => setPendingRole(value)}>
                              <SelectTrigger id="role-select" className="h-10">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Admin">Admin</SelectItem>
                                <SelectItem value="Sales">Sales</SelectItem>
                                <SelectItem value="Finance">Finance</SelectItem>
                                <SelectItem value="Support">Support</SelectItem>
                                <SelectItem value="Operations">Operations</SelectItem>
                                <SelectItem value="Production">Production</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-[12px] text-[#6B7280]">
                              {selectedUser.role 
                                ? `Current role: ${selectedUser.role}. You can change the role before approval.`
                                : 'This staff member needs a role assignment before approval.'
                              }
                            </p>
                          </div>
                        ) : (
                          <div>
                            <Label className="text-[#6B7280]">Current Role</Label>
                            <p className="text-[#111827] mt-1">{selectedUser.role || 'Not assigned'}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              {/* Individual Customer - Verification Documents */}
              {selectedUser.userType === 'Individual Customer' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-[#111827]">Tax & Identity Verification</h3>
                    
                    <Card className="border-[#E5E7EB]">
                      <CardContent className="pt-6 space-y-4">
                        <div>
                          <Label className="text-[#6B7280]">Tax Identification Number (TIN)</Label>
                          <p className="text-[#111827] mt-1 font-mono">{selectedUser.tin || 'Not provided'}</p>
                        </div>
                        
                        <div>
                          <Label className="text-[#6B7280]">ID Type</Label>
                          <p className="text-[#111827] mt-1">{selectedUser.idType || 'Not provided'}</p>
                        </div>
                        
                        <div>
                          <Label className="text-[#6B7280]">Identification Card Number</Label>
                          <p className="text-[#111827] mt-1">{selectedUser.idNumber || 'Not provided'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Identity Document - Admin only */}
                    {isAdmin && selectedUser.identityDocumentUrl && (
                      <Card className="border-[#E5E7EB]">
                        <CardContent className="pt-6 space-y-4">
                          <div>
                            <Label className="text-[#6B7280] mb-2 block">Identity Document</Label>
                            {selectedUser.identityDocumentUrl.toLowerCase().endsWith('.pdf') ? (
                              <div className="flex items-center gap-3 p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                                <FileText className="h-8 w-8 text-[#1E40AF]" />
                                <div className="flex-1">
                                  <p className="text-[#111827] font-medium">Identity Document (PDF)</p>
                                  <p className="text-[12px] text-[#6B7280]">Click to view document</p>
                                </div>
                                <a 
                                  href={selectedUser.identityDocumentUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[#1E40AF] hover:underline flex items-center gap-1"
                                >
                                  View <ExternalLink className="h-4 w-4" />
                                </a>
                              </div>
                            ) : (
                              <img 
                                src={selectedUser.identityDocumentUrl} 
                                alt="Identity Document" 
                                className="w-full max-h-64 object-contain rounded-lg border border-[#E5E7EB]"
                              />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </>
              )}

              {/* Business Customer - Business Details */}
              {selectedUser.userType === 'Business Customer' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-[#111827]">Business Details</h3>
                    
                    <Card className="border-[#E5E7EB]">
                      <CardContent className="pt-6 space-y-4">
                        <div>
                          <Label className="text-[#6B7280]">Business Registration Number (BRN)</Label>
                          <p className="text-[#111827] mt-1 font-mono">{selectedUser.idNumber || 'Not provided'}</p>
                          {selectedUser.idNumber && (
                            <p className="text-[12px] text-[#6B7280] mt-1">
                              Year: {selectedUser.idNumber?.substring(0, 4)} | Type: {selectedUser.idNumber?.substring(4, 6)} | ID: {selectedUser.idNumber?.substring(6)}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label className="text-[#6B7280]">Company Tax Identification Number (TIN)</Label>
                          <p className="text-[#111827] mt-1 font-mono">{selectedUser.tin || 'Not provided'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Identity Document - Admin only */}
                    {isAdmin && selectedUser.identityDocumentUrl && (
                      <Card className="border-[#E5E7EB]">
                        <CardContent className="pt-6 space-y-4">
                          <div>
                            <Label className="text-[#6B7280] mb-2 block">Business Document</Label>
                            {selectedUser.identityDocumentUrl.toLowerCase().endsWith('.pdf') ? (
                              <div className="flex items-center gap-3 p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                                <FileText className="h-8 w-8 text-[#1E40AF]" />
                                <div className="flex-1">
                                  <p className="text-[#111827] font-medium">Business Document (PDF)</p>
                                  <p className="text-[12px] text-[#6B7280]">Click to view document</p>
                                </div>
                                <a 
                                  href={selectedUser.identityDocumentUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[#1E40AF] hover:underline flex items-center gap-1"
                                >
                                  View <ExternalLink className="h-4 w-4" />
                                </a>
                              </div>
                            ) : (
                              <img 
                                src={selectedUser.identityDocumentUrl} 
                                alt="Business Document" 
                                className="w-full max-h-64 object-contain rounded-lg border border-[#E5E7EB]"
                              />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </>
              )}

              {/* Approval Actions - Admin only */}
              {isAdmin && selectedUser.status === 'Pending Approval' && (
                <>
                  <Separator />
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setIsRejectDialogOpen(true)}
                      variant="outline"
                      className="flex-1 h-11 border-[#DC2626] text-[#DC2626] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => setIsApproveDialogOpen(true)}
                      className="flex-1 h-11 bg-[#059669] hover:bg-[#047857]"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* User List View */
        <>
      {/* Header Section */}
      <div className="space-y-2">
        <h1>User Management</h1>
        <p className="text-[#374151]">Manage system users and permissions</p>
      </div>

      {/* Action Buttons - Admin only */}
      {isAdmin && (
        <div className="flex gap-3">
          <Button 
            className="bg-[#1E40AF] hover:bg-[#1E3A8A] h-10 px-6 rounded-lg"
            onClick={handleOpenAddDialog}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add New User
          </Button>
          <Button 
            variant="outline" 
            className="h-10 px-6 rounded-lg"
            onClick={() => setIsImportDialogOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Users
          </Button>
          <Button 
            variant="outline" 
            className="h-10 px-6 rounded-lg"
            onClick={handleExportUsers}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Users
          </Button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-lg border border-[#E5E7EB]">
        <div className="relative flex-1 max-w-[300px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input
            placeholder="Search users..."
            className="pl-10 h-10 bg-white border-[#D1D5DB] rounded-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
          <SelectTrigger className="w-[200px] h-10 bg-white border-[#D1D5DB] rounded-md">
            <SelectValue placeholder="User Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All User Types</SelectItem>
            <SelectItem value="Internal Staff">Internal Staff</SelectItem>
            <SelectItem value="Individual Customer">Individual Customer</SelectItem>
            <SelectItem value="Business Customer">Business Customer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] h-10 bg-white border-[#D1D5DB] rounded-md">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Pending Approval">Pending Approval</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
              <TableHead className="w-[40px]">
                <Checkbox />
              </TableHead>
              <TableHead className="w-[200px]">Name</TableHead>
              <TableHead className="w-[240px]">Email</TableHead>
              <TableHead className="w-[160px]">User Type</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead className="w-[120px]">Role</TableHead>
              <TableHead className="w-[140px]">Last Login</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.map((user) => (
              <TableRow key={user.id} className="h-14 hover:bg-[#F3F4F6]">
                <TableCell>
                  <Checkbox />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-[#E5E7EB] text-[#374151]">
                        {getInitials(user.firstName + " " + user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[#111827]">{user.firstName} {user.lastName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-[#374151]">{user.email}</TableCell>
                <TableCell>
                  <Badge 
                    className={getUserTypeBadgeColor(user.userType)}
                  >
                    {getUserTypeIcon(user.userType)}
                    <span className="ml-1.5">{user.userType}</span>
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.status === 'Active' ? (
                    <Badge className="bg-[#059669] hover:bg-[#047857]">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  ) : user.status === 'Pending Approval' ? (
                    <Badge className="bg-[#F59E0B] hover:bg-[#D97706]">
                      <Clock className="mr-1 h-3 w-3" />
                      Pending
                    </Badge>
                  ) : (
                    <Badge className="bg-[#6B7280] hover:bg-[#4B5563]">
                      <XCircle className="mr-1 h-3 w-3" />
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {user.role ? (
                    <Badge 
                      variant="secondary"
                      className="bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                    >
                      {user.role}
                    </Badge>
                  ) : (
                    <span className="text-[#9CA3AF] text-sm">—</span>
                  )}
                </TableCell>
                <TableCell className="text-[#374151]">{user.lastLogin}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-[#F3F4F6]">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      {isAdmin && user.status !== 'Pending Approval' && (
                        <DropdownMenuItem onClick={() => handleEditUser(user)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-[#6B7280]">
          Showing {filteredUsers.length === 0 ? 0 : startIndex + 1} - {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
        </p>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="h-10 px-4"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            {getPageNumbers().map((page, index) => (
              typeof page === 'number' ? (
                <Button
                  key={index}
                  variant={currentPage === page ? "default" : "outline"}
                  className={`h-10 px-4 ${currentPage === page ? 'bg-[#1E40AF] hover:bg-[#1E3A8A]' : ''}`}
                  onClick={() => handlePageClick(page)}
                >
                  {page}
                </Button>
              ) : (
                <span key={index} className="h-10 px-2 flex items-center text-[#6B7280]">
                  {page}
                </span>
              )
            ))}
            <Button 
              variant="outline" 
              className="h-10 px-4"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
        </>
      )}

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve User Registration</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser && (
                <>
                  Are you sure you want to approve the registration for <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>?
                  {selectedUser.userType === 'Internal Staff' && (
                    <span className="block mt-2 text-[#059669]">
                      Role will be set to: <strong>{pendingRole}</strong>
                    </span>
                  )}
                  <span className="block mt-2">
                    The user will be granted access to the system immediately.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApproving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveUser}
              className="bg-[#059669] hover:bg-[#047857]"
              disabled={isApproving}
            >
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                'Approve User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={isRejectDialogOpen} onOpenChange={(open) => {
        setIsRejectDialogOpen(open);
        if (!open) setRejectionReason("");
      }}>
        <AlertDialogContent className="max-w-[500px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Reject User Registration</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser && (
                <>
                  Are you sure you want to reject the registration for <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>?
                  <span className="block mt-2 text-[#DC2626]">
                    This action cannot be undone. The user will be removed from the system.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="rejection-reason">
              Reason for Rejection <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="rejection-reason"
              placeholder="Please provide a reason for rejecting this registration..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            <p className="text-[12px] text-[#6B7280]">
              This reason will be recorded for audit purposes.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRejecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectUser}
              className="bg-[#DC2626] hover:bg-[#B91C1C]"
              disabled={isRejecting}
            >
              {isRejecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with access to the system
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="add-first-name">First Name *</Label>
              <Input
                id="add-first-name"
                value={addForm.firstName}
                onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                placeholder="Enter first name"
                className="h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-last-name">Last Name *</Label>
              <Input
                id="add-last-name"
                value={addForm.lastName}
                onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                placeholder="Enter last name"
                className="h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-email">Email Address *</Label>
              <Input
                id="add-email"
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="Enter email address"
                className="h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-phone">Phone Number *</Label>
              <Input
                id="add-phone"
                type="tel"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                placeholder="+60 12-345-6789"
                className="h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-role">Role *</Label>
              <Select value={addForm.role} onValueChange={(value) => setAddForm({ ...addForm, role: value })}>
                <SelectTrigger id="add-role" className="h-10">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Support">Support</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="Production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-status">Account Status *</Label>
              <Select value={addForm.status} onValueChange={(value: DbStatus) => setAddForm({ ...addForm, status: value })}>
                <SelectTrigger id="add-status" className="h-10">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending Verification (default)</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[12px] text-[#6B7280]">
                New users will receive email to setup their password.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAddDialogOpen(false)}
              className="h-10 px-6"
              disabled={isAddingUser}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddNewUser}
              className="bg-[#1E40AF] hover:bg-[#1E3A8A] h-10 px-6"
              disabled={isAddingUser}
            >
              {isAddingUser ? "Creating..." : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and account details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-first-name">First Name *</Label>
              <Input
                id="edit-first-name"
                value={editForm.firstName}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                placeholder="Enter first name"
                className="h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-last-name">Last Name *</Label>
              <Input
                id="edit-last-name"
                value={editForm.lastName}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                placeholder="Enter last name"
                className="h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email Address *</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="Enter email address"
                className="h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Phone Number *</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+60 12-345-6789"
                className="h-10"
              />
            </div>
            {selectedUser?.userType === 'Internal Staff' && (
              <div className="grid gap-2">
                <Label htmlFor="edit-role">Role *</Label>
                <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value })}>
                  <SelectTrigger id="edit-role" className="h-10">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Support">Support</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status *</Label>
              <Select value={editForm.status} onValueChange={(value: UserStatus) => setEditForm({ ...editForm, status: value })}>
                <SelectTrigger id="edit-status" className="h-10">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
              className="h-10 px-6"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveUser}
              className="bg-[#F15929] hover:bg-[#D14820] h-10 px-6"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Users Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
        setIsImportDialogOpen(open);
        if (!open) {
          setImportFile(null);
          setImportPreview([]);
          setImportErrors([]);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Import Users from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import multiple users at once. Users will be created as Internal Staff with pending status.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Download Template */}
            <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
              <div>
                <p className="text-sm font-medium text-[#111827]">Need a template?</p>
                <p className="text-xs text-[#6B7280]">Download our CSV template with the correct format</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadTemplate}
              >
                <Download className="mr-2 h-4 w-4" />
                Template
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV File</Label>
              <div className="flex gap-2">
                <Input
                  ref={fileInputRef}
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="h-10"
                />
              </div>
              <p className="text-xs text-[#6B7280]">
                Required columns: First Name, Last Name, Email, Role
              </p>
            </div>

            {/* Import Errors */}
            {importErrors.length > 0 && (
              <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-lg">
                <p className="text-sm font-medium text-[#991B1B] mb-2">Validation Errors:</p>
                <ul className="text-xs text-[#7F1D1D] space-y-1">
                  {importErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview Table */}
            {importPreview.length > 0 && importErrors.length === 0 && (
              <div className="space-y-2">
                <Label>Preview (first 5 rows)</Label>
                <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F9FAFB]">
                        <TableHead className="text-xs">First Name</TableHead>
                        <TableHead className="text-xs">Last Name</TableHead>
                        <TableHead className="text-xs">Email</TableHead>
                        <TableHead className="text-xs">Phone</TableHead>
                        <TableHead className="text-xs">Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-xs py-2">{row.firstName}</TableCell>
                          <TableCell className="text-xs py-2">{row.lastName}</TableCell>
                          <TableCell className="text-xs py-2">{row.email}</TableCell>
                          <TableCell className="text-xs py-2">{row.phone || '-'}</TableCell>
                          <TableCell className="text-xs py-2">{row.role}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-[#6B7280]">
                  Users will receive an email to set up their password after import.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsImportDialogOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleImportUsers}
              className="bg-[#1E40AF] hover:bg-[#1E3A8A]"
              disabled={!importFile || importErrors.length > 0 || isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Users
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}