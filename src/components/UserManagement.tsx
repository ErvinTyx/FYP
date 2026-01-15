import { useState } from "react";
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
  ArrowLeft
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Label } from "./ui/label";
import { toast } from "sonner@2.0.3";
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
type UserStatus = 'Active' | 'Inactive' | 'Pending Approval';
type StaffRole = 'Admin' | 'Sales' | 'Finance' | 'Support' | 'Operations' | 'Production';

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
  
  // Individual Customer specific fields
  tin?: string;  // Tax Identification Number
  idCardNumber?: string;
  idCardFrontImage?: string;
  idCardBackImage?: string;
  
  // Business Customer specific fields
  brn?: string;  // Business Registration Number
  companyTin?: string;
}

const mockUsers: User[] = [
  { 
    id: '1', 
    firstName: 'John', 
    lastName: 'Doe', 
    email: 'john.doe@company.com', 
    phone: '+60 12-345-6789',
    userType: 'Internal Staff',
    role: 'Admin', 
    status: 'Active', 
    lastLogin: '2024-11-03' 
  },
  { 
    id: '2', 
    firstName: 'Sarah', 
    lastName: 'Williams', 
    email: 'sarah.w@company.com', 
    phone: '+60 12-456-7890',
    userType: 'Internal Staff',
    role: 'Sales', 
    status: 'Active', 
    lastLogin: '2024-11-04' 
  },
  { 
    id: '3', 
    firstName: 'Mike', 
    lastName: 'Johnson', 
    email: 'mike.j@gmail.com', 
    phone: '+60 13-234-5678',
    userType: 'Individual Customer',
    status: 'Pending Approval',
    tin: 'IG123456789012',
    idCardNumber: '920415-10-5234',
    idCardFrontImage: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400',
    idCardBackImage: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=400',
    lastLogin: 'Never' 
  },
  { 
    id: '4', 
    firstName: 'Ahmad', 
    lastName: 'Hassan', 
    email: 'ahmad@steelworks.com', 
    phone: '+60 19-876-5432',
    userType: 'Business Customer',
    status: 'Pending Approval',
    brn: '202201123456',
    companyTin: 'C987654321012',
    lastLogin: 'Never' 
  },
  { 
    id: '5', 
    firstName: 'Lisa', 
    lastName: 'Tan', 
    email: 'lisa.tan@outlook.com', 
    phone: '+60 16-555-4321',
    userType: 'Individual Customer',
    status: 'Active',
    tin: 'IG998877665544',
    idCardNumber: '880320-08-1234',
    lastLogin: '2024-11-01' 
  },
  { 
    id: '6', 
    firstName: 'David', 
    lastName: 'Lee', 
    email: 'david@construction.my', 
    phone: '+60 17-222-3333',
    userType: 'Business Customer',
    status: 'Active',
    brn: '201905234567',
    companyTin: 'PT123456789012',
    lastLogin: '2024-11-02' 
  },
  { 
    id: '7', 
    firstName: 'Emily', 
    lastName: 'Wong', 
    email: 'emily.wong@company.com', 
    phone: '+60 12-888-9999',
    userType: 'Internal Staff',
    status: 'Pending Approval',
    lastLogin: 'Never' 
  },
];

export function UserManagement() {
  const [users, setUsers] = useState<User[]>(mockUsers);
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
    status: "Active" as UserStatus
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUserType = userTypeFilter === "all" || user.userType === userTypeFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesUserType && matchesStatus;
  });

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

  const handleSaveUser = () => {
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

    setUsers(users.map(user => 
      user.id === selectedUser.id 
        ? { ...user, ...editForm }
        : user
    ));

    toast.success("User updated successfully");
    setIsEditDialogOpen(false);
    setSelectedUser(null);
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
      status: "Active"
    });
    setIsAddDialogOpen(true);
  };

  const handleAddNewUser = () => {
    if (!addForm.firstName.trim() || !addForm.lastName.trim() || !addForm.email.trim() || !addForm.role) {
      toast.error("Please fill in all required fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(addForm.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (users.some(user => user.email.toLowerCase() === addForm.email.toLowerCase())) {
      toast.error("A user with this email already exists");
      return;
    }

    const newId = (Math.max(...users.map(u => parseInt(u.id))) + 1).toString();
    
    const newUser: User = {
      id: newId,
      firstName: addForm.firstName,
      lastName: addForm.lastName,
      email: addForm.email,
      phone: addForm.phone,
      userType: 'Internal Staff',
      role: addForm.role as StaffRole,
      status: addForm.status,
      lastLogin: new Date().toISOString().split('T')[0]
    };

    setUsers([...users, newUser]);
    toast.success("User added successfully");
    setIsAddDialogOpen(false);
  };

  const handleApproveUser = () => {
    if (!selectedUser) return;

    // For internal staff, role must be selected
    if (selectedUser.userType === 'Internal Staff' && !pendingRole) {
      toast.error("Please select a role for the staff member");
      return;
    }

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
  };

  const handleRejectUser = () => {
    if (!selectedUser) return;

    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setUsers(users.filter(user => user.id !== selectedUser.id));
    
    toast.success(`Registration for ${selectedUser.firstName} ${selectedUser.lastName} has been rejected`);
    setIsRejectDialogOpen(false);
    setRejectionReason("");
    setViewMode('list');
    setSelectedUser(null);
  };

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
                        {selectedUser.status === 'Pending Approval' ? (
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
                              Role must be assigned before approval
                            </p>
                          </div>
                        ) : (
                          <div>
                            <Label className="text-[#6B7280]">Current Role</Label>
                            <p className="text-[#111827] mt-1">{selectedUser.role}</p>
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
                          <p className="text-[#111827] mt-1 font-mono">{selectedUser.tin}</p>
                        </div>
                        
                        <div>
                          <Label className="text-[#6B7280]">Identification Card Number</Label>
                          <p className="text-[#111827] mt-1">{selectedUser.idCardNumber}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {selectedUser.idCardFrontImage && selectedUser.idCardBackImage && (
                      <Card className="border-[#E5E7EB]">
                        <CardContent className="pt-6 space-y-4">
                          <div>
                            <Label className="text-[#6B7280] mb-2 block">ID Card Front</Label>
                            <img 
                              src={selectedUser.idCardFrontImage} 
                              alt="ID Card Front" 
                              className="w-full h-48 object-cover rounded-lg border border-[#E5E7EB]"
                            />
                          </div>
                          
                          <div>
                            <Label className="text-[#6B7280] mb-2 block">ID Card Back</Label>
                            <img 
                              src={selectedUser.idCardBackImage} 
                              alt="ID Card Back" 
                              className="w-full h-48 object-cover rounded-lg border border-[#E5E7EB]"
                            />
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
                          <p className="text-[#111827] mt-1 font-mono">{selectedUser.brn}</p>
                          <p className="text-[12px] text-[#6B7280] mt-1">
                            Year: {selectedUser.brn?.substring(0, 4)} | Type: {selectedUser.brn?.substring(4, 6)} | ID: {selectedUser.brn?.substring(6)}
                          </p>
                        </div>
                        
                        <div>
                          <Label className="text-[#6B7280]">Company Tax Identification Number (TIN)</Label>
                          <p className="text-[#111827] mt-1 font-mono">{selectedUser.companyTin}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              {/* Approval Actions */}
              {selectedUser.status === 'Pending Approval' && (
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

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button 
          className="bg-[#1E40AF] hover:bg-[#1E3A8A] h-10 px-6 rounded-lg"
          onClick={handleOpenAddDialog}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add New User
        </Button>
        <Button variant="outline" className="h-10 px-6 rounded-lg">
          <Upload className="mr-2 h-4 w-4" />
          Import Users
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
            {filteredUsers.map((user) => (
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
                      {user.status !== 'Pending Approval' && (
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
          Showing {filteredUsers.length} of {users.length} users
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="h-10 px-4">Previous</Button>
          <Button className="bg-[#1E40AF] hover:bg-[#1E3A8A] h-10 px-4">1</Button>
          <Button variant="outline" className="h-10 px-4">2</Button>
          <Button variant="outline" className="h-10 px-4">3</Button>
          <Button variant="outline" className="h-10 px-4">Next</Button>
        </div>
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveUser}
              className="bg-[#059669] hover:bg-[#047857]"
            >
              Approve User
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectUser}
              className="bg-[#DC2626] hover:bg-[#B91C1C]"
            >
              Reject User
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
              <Label htmlFor="add-status">Status *</Label>
              <Select value={addForm.status} onValueChange={(value: UserStatus) => setAddForm({ ...addForm, status: value })}>
                <SelectTrigger id="add-status" className="h-10">
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
              onClick={() => setIsAddDialogOpen(false)}
              className="h-10 px-6"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddNewUser}
              className="bg-[#F15929] hover:bg-[#D14820] h-10 px-6"
            >
              Add User
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
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveUser}
              className="bg-[#F15929] hover:bg-[#D14820] h-10 px-6"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}