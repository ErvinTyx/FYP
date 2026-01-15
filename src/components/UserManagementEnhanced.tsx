import { useState } from "react";
import { 
  Users, 
  UserPlus, 
  Download, 
  MoreHorizontal, 
  Search, 
  Edit, 
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  Mail,
  Shield,
  Key,
  AlertTriangle,
  History,
  Phone,
  User as UserIcon
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

// FR1: User Interface
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Admin' | 'Sales Team' | 'Finance Team' | 'Production Team' | 'Operations Team' | 'Vendor' | 'Customer';
  status: 'Active' | 'Inactive';
  lastLogin: string;
  createdAt: string;
  createdBy: string;
  passwordSet: boolean;
  isInternal: boolean;
}

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  performedBy: string;
  timestamp: string;
  details: string;
}

// Mock Data
const mockUsers: User[] = [
  { id: '1', name: 'John Doe', email: 'john.doe@company.com', phone: '+1234567890', role: 'Admin', status: 'Active', lastLogin: '2024-11-25 10:30', createdAt: '2024-01-15', createdBy: 'System', passwordSet: true, isInternal: true },
  { id: '2', name: 'Jane Smith', email: 'jane.smith@company.com', phone: '+1234567891', role: 'Finance Team', status: 'Active', lastLogin: '2024-11-24 15:20', createdAt: '2024-02-10', createdBy: 'John Doe', passwordSet: true, isInternal: true },
  { id: '3', name: 'Mike Johnson', email: 'mike.j@vendor.com', phone: '+1234567892', role: 'Vendor', status: 'Active', lastLogin: '2024-11-23 09:15', createdAt: '2024-03-05', createdBy: 'Jane Smith', passwordSet: true, isInternal: false },
  { id: '4', name: 'Sarah Williams', email: 'sarah.w@company.com', phone: '+1234567893', role: 'Sales Team', status: 'Inactive', lastLogin: '2024-10-28 14:45', createdAt: '2024-04-20', createdBy: 'John Doe', passwordSet: true, isInternal: true },
  { id: '5', name: 'Tom Brown', email: 'tom@customer.com', phone: '+1234567894', role: 'Customer', status: 'Active', lastLogin: '2024-11-25 08:00', createdAt: '2024-05-12', createdBy: 'Self-Registration', passwordSet: true, isInternal: false },
];

const mockAuditLogs: AuditLog[] = [
  { id: '1', userId: '1', action: 'User Created', performedBy: 'System', timestamp: '2024-01-15 09:00', details: 'Admin account created' },
  { id: '2', userId: '2', action: 'User Created', performedBy: 'John Doe', timestamp: '2024-02-10 10:15', details: 'Internal user added to Finance Team' },
  { id: '3', userId: '2', action: 'Role Changed', performedBy: 'John Doe', timestamp: '2024-03-01 14:30', details: 'Role changed from Sales to Finance' },
  { id: '4', userId: '4', action: 'Status Changed', performedBy: 'John Doe', timestamp: '2024-10-28 16:00', details: 'User deactivated' },
  { id: '5', userId: '3', action: 'Password Reset', performedBy: 'Jane Smith', timestamp: '2024-06-15 11:20', details: 'Password reset email sent' },
];

export function UserManagement() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [auditLogs] = useState<AuditLog[]>(mockAuditLogs);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  // FR1: Create User Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Customer' as User['role'],
    isInternal: false,
  });

  // FR2: Profile Edit State
  const [profileEdit, setProfileEdit] = useState({
    name: '',
    phone: '',
  });

  // FR2: Password Change State
  const [passwordChange, setPasswordChange] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // FR1.3: Email Validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // FR1.4: Password Policy Validation
  const validatePassword = (password: string): { valid: boolean; message: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character' };
    }
    return { valid: true, message: 'Password is strong' };
  };

  // FR4.2: Check if user is last admin
  const isLastActiveAdmin = (userId: string): boolean => {
    const activeAdmins = users.filter(u => u.role === 'Admin' && u.status === 'Active');
    return activeAdmins.length === 1 && activeAdmins[0].id === userId;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // FR3.1 & FR3.2: Create Internal User with set-password email
  const handleCreateUser = () => {
    // FR1.3: Validate email format and uniqueness
    if (!validateEmail(newUser.email)) {
      toast.error('Invalid email format');
      return;
    }

    if (users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase())) {
      toast.error('Email already exists');
      return;
    }

    if (!newUser.name.trim()) {
      toast.error('Name is required');
      return;
    }

    const user: User = {
      id: (users.length + 1).toString(),
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      status: 'Active',
      lastLogin: 'Never',
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: 'Current Admin',
      passwordSet: false,
      isInternal: newUser.isInternal,
    };

    setUsers([...users, user]);
    
    // FR3.2: Send set-password email (simulated)
    if (newUser.isInternal) {
      toast.success(`Internal user created! Set-password email sent to ${newUser.email}`);
    } else {
      toast.success(`User created successfully!`);
    }

    // FR3.5: Audit log (simulated)
    console.log('AUDIT LOG: User created', { userId: user.id, createdBy: 'Current Admin', timestamp: new Date() });

    setNewUser({ name: '', email: '', phone: '', role: 'Customer', isInternal: false });
    setShowCreateDialog(false);
  };

  // FR3.4: Edit User
  const handleEditUser = () => {
    if (!selectedUser) return;

    // FR4.2: Prevent removing last active admin
    if (selectedUser.role === 'Admin' && isLastActiveAdmin(selectedUser.id)) {
      toast.error('Cannot modify the last active admin');
      return;
    }

    setUsers(users.map(u => u.id === selectedUser.id ? selectedUser : u));
    
    toast.success('User updated successfully');
    
    // FR3.5: Audit log
    console.log('AUDIT LOG: User updated', { userId: selectedUser.id, updatedBy: 'Current Admin', timestamp: new Date() });
    
    setShowEditDialog(false);
    setSelectedUser(null);
  };

  // FR3.4: Delete User
  const handleDeleteUser = () => {
    if (!selectedUser) return;

    // FR4.2: Prevent deleting last active admin
    if (selectedUser.role === 'Admin' && isLastActiveAdmin(selectedUser.id)) {
      toast.error('Cannot delete the last active admin');
      return;
    }

    setUsers(users.filter(u => u.id !== selectedUser.id));
    
    toast.success('User deleted successfully');
    
    // FR3.5: Audit log
    console.log('AUDIT LOG: User deleted', { userId: selectedUser.id, deletedBy: 'Current Admin', timestamp: new Date() });
    
    setShowDeleteDialog(false);
    setSelectedUser(null);
  };

  // FR2.2: Edit Profile (name & phone)
  const handleSaveProfile = () => {
    if (!profileEdit.name.trim()) {
      toast.error('Name is required');
      return;
    }

    // Update current user's profile (simulated)
    toast.success('Profile updated successfully');
    console.log('Profile updated:', profileEdit);
    setShowProfileDialog(false);
  };

  // FR2.3: Change Password
  const handleChangePassword = () => {
    const validation = validatePassword(passwordChange.newPassword);
    
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Change password (simulated)
    toast.success('Password changed successfully');
    console.log('Password changed');
    
    setPasswordChange({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswordDialog(false);
  };

  // FR1.5: Login with Google (simulated)
  const handleGoogleLogin = () => {
    toast.info('Google OAuth integration would be implemented here');
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <h1>User Management</h1>
        <p className="text-[#374151]">Manage system users, roles, and permissions (FR1-FR4 Implementation)</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        <Button 
          className="bg-[#F15929] hover:bg-[#D94E23] h-10 px-6 rounded-lg"
          onClick={() => setShowCreateDialog(true)}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add New User
        </Button>
        <Button 
          variant="outline" 
          className="h-10 px-6 rounded-lg"
          onClick={() => setShowProfileDialog(true)}
        >
          <UserIcon className="mr-2 h-4 w-4" />
          My Profile
        </Button>
        <Button 
          variant="outline" 
          className="h-10 px-6 rounded-lg"
          onClick={() => setShowPasswordDialog(true)}
        >
          <Key className="mr-2 h-4 w-4" />
          Change Password
        </Button>
        <Button variant="outline" className="h-10 px-6 rounded-lg">
          <Download className="mr-2 h-4 w-4" />
          Export Users
        </Button>
      </div>

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
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px] h-10 bg-white border-[#D1D5DB] rounded-md">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Sales Team">Sales Team</SelectItem>
            <SelectItem value="Finance Team">Finance Team</SelectItem>
            <SelectItem value="Production Team">Production Team</SelectItem>
            <SelectItem value="Operations Team">Operations Team</SelectItem>
            <SelectItem value="Vendor">Vendor</SelectItem>
            <SelectItem value="Customer">Customer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-10 bg-white border-[#D1D5DB] rounded-md">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
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
              <TableHead className="w-[220px]">Email</TableHead>
              <TableHead className="w-[140px]">Phone</TableHead>
              <TableHead className="w-[140px]">Role</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[120px]">Type</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id} className="h-14 hover:bg-[#F3F4F6]">
                <TableCell>
                  <Checkbox />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-[#E5E7EB] text-[#374151]">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[#231F20]">{user.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-[#374151]">{user.email}</TableCell>
                <TableCell className="text-[#374151]">{user.phone}</TableCell>
                <TableCell>
                  <Badge 
                    variant="secondary"
                    className="bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                  >
                    {user.role === 'Admin' && <Shield className="mr-1 h-3 w-3" />}
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.status === 'Active' ? (
                    <Badge className="bg-[#059669] hover:bg-[#047857]">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  ) : (
                    <Badge className="bg-[#6B7280] hover:bg-[#4B5563]">
                      <XCircle className="mr-1 h-3 w-3" />
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline"
                    className={user.isInternal ? "border-[#F15929] text-[#F15929]" : "border-[#6B7280] text-[#6B7280]"}
                  >
                    {user.isInternal ? 'Internal' : 'External'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-[#F3F4F6]">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setSelectedUser(user);
                        setShowViewDialog(true);
                      }}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedUser(user);
                        setShowEditDialog(true);
                      }}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        toast.info('Password reset email sent to ' + user.email);
                      }}>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Password Reset
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-[#DC2626]"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
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
          Showing {filteredUsers.length} of {users.length} users
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="h-10 px-4">Previous</Button>
          <Button className="bg-[#F15929] hover:bg-[#D94E23] h-10 px-4">1</Button>
          <Button variant="outline" className="h-10 px-4">2</Button>
          <Button variant="outline" className="h-10 px-4">3</Button>
          <Button variant="outline" className="h-10 px-4">Next</Button>
        </div>
      </div>

      {/* FR3.1: Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account. Internal users will receive a set-password email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
              <p className="text-xs text-[#6B7280]">Must be unique and valid format</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+1234567890"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value as User['role'] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Sales Team">Sales Team</SelectItem>
                  <SelectItem value="Finance Team">Finance Team</SelectItem>
                  <SelectItem value="Production Team">Production Team</SelectItem>
                  <SelectItem value="Operations Team">Operations Team</SelectItem>
                  <SelectItem value="Vendor">Vendor</SelectItem>
                  <SelectItem value="Customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="internal"
                checked={newUser.isInternal}
                onCheckedChange={(checked) => setNewUser({ ...newUser, isInternal: checked as boolean })}
              />
              <label htmlFor="internal" className="text-sm cursor-pointer">
                Internal User (sends set-password email)
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-[#F15929] hover:bg-[#D94E23]" onClick={handleCreateUser}>
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FR3.3: View User Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View complete user information and audit history
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="audit">Audit Log</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-[#F9FAFB] rounded-lg">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-[#F15929] text-white text-xl">
                      {getInitials(selectedUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3>{selectedUser.name}</h3>
                    <p className="text-sm text-[#6B7280]">{selectedUser.email}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[#6B7280]">Phone</p>
                    <p>{selectedUser.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Role</p>
                    <p>{selectedUser.role}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Status</p>
                    <p>{selectedUser.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">User Type</p>
                    <p>{selectedUser.isInternal ? 'Internal' : 'External'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Last Login</p>
                    <p>{selectedUser.lastLogin}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#6B7280]">Created Date</p>
                    <p>{selectedUser.createdAt}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-[#6B7280]">Created By</p>
                    <p>{selectedUser.createdBy}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-[#6B7280]">Password Status</p>
                    <p>{selectedUser.passwordSet ? '✓ Password Set' : '⚠ Pending Setup'}</p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="audit">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {auditLogs
                      .filter(log => log.userId === selectedUser.id)
                      .map((log) => (
                        <div key={log.id} className="p-3 bg-[#F9FAFB] rounded-lg">
                          <div className="flex items-start gap-2">
                            <History className="h-4 w-4 text-[#6B7280] mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm">{log.action}</p>
                              <p className="text-xs text-[#6B7280]">{log.details}</p>
                              <p className="text-xs text-[#6B7280] mt-1">
                                By {log.performedBy} on {log.timestamp}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FR3.4: Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and settings
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={selectedUser.name}
                  onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  value={selectedUser.phone}
                  onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select 
                  value={selectedUser.role} 
                  onValueChange={(value) => setSelectedUser({ ...selectedUser, role: value as User['role'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Sales Team">Sales Team</SelectItem>
                    <SelectItem value="Finance Team">Finance Team</SelectItem>
                    <SelectItem value="Production Team">Production Team</SelectItem>
                    <SelectItem value="Operations Team">Operations Team</SelectItem>
                    <SelectItem value="Vendor">Vendor</SelectItem>
                    <SelectItem value="Customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
                {selectedUser.role === 'Admin' && isLastActiveAdmin(selectedUser.id) && (
                  <div className="flex items-center gap-2 text-xs text-[#F59E0B] bg-[#FEF3C7] p-2 rounded">
                    <AlertTriangle className="h-3 w-3" />
                    <span>This is the last active admin</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  value={selectedUser.status} 
                  onValueChange={(value) => setSelectedUser({ ...selectedUser, status: value as 'Active' | 'Inactive' })}
                  disabled={selectedUser.role === 'Admin' && isLastActiveAdmin(selectedUser.id)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-[#F15929] hover:bg-[#D94E23]" onClick={handleEditUser}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.name}? This action cannot be undone.
              {selectedUser?.role === 'Admin' && isLastActiveAdmin(selectedUser.id) && (
                <div className="flex items-center gap-2 mt-3 text-[#DC2626] bg-[#FEE2E2] p-2 rounded">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Cannot delete the last active admin!</span>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-[#DC2626] hover:bg-[#B91C1C]"
              disabled={selectedUser?.role === 'Admin' && selectedUser ? isLastActiveAdmin(selectedUser.id) : false}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* FR2: Profile Management Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>My Profile</DialogTitle>
            <DialogDescription>
              View and edit your profile information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-[#F9FAFB] rounded-lg">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-[#F15929] text-white text-xl">
                  AD
                </AvatarFallback>
              </Avatar>
              <div>
                <h3>Admin User</h3>
                <p className="text-sm text-[#6B7280]">admin@company.com</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full Name</Label>
              <Input
                id="profile-name"
                placeholder="Your Name"
                value={profileEdit.name}
                onChange={(e) => setProfileEdit({ ...profileEdit, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Phone Number</Label>
              <Input
                id="profile-phone"
                placeholder="+1234567890"
                value={profileEdit.phone}
                onChange={(e) => setProfileEdit({ ...profileEdit, phone: e.target.value })}
              />
            </div>
            <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
              <p className="text-sm text-[#1E40AF]">
                <strong>Note:</strong> Email cannot be changed. Contact system administrator for email updates.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-[#F15929] hover:bg-[#D94E23]" onClick={handleSaveProfile}>
              Save Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FR2.3: Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Update your password. Must meet security requirements.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordChange.currentPassword}
                onChange={(e) => setPasswordChange({ ...passwordChange, currentPassword: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordChange.newPassword}
                onChange={(e) => setPasswordChange({ ...passwordChange, newPassword: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordChange.confirmPassword}
                onChange={(e) => setPasswordChange({ ...passwordChange, confirmPassword: e.target.value })}
              />
            </div>
            <div className="p-3 bg-[#F9FAFB] rounded-lg space-y-1 text-xs text-[#6B7280]">
              <p><strong>Password Requirements:</strong></p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>At least 8 characters</li>
                <li>One uppercase letter</li>
                <li>One number</li>
                <li>One special character (!@#$%^&*)</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-[#F15929] hover:bg-[#D94E23]" onClick={handleChangePassword}>
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
