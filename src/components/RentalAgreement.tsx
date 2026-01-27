import { useState, useRef, useEffect, useCallback } from "react";
import { FileText, Plus, Eye, Edit, History, Download, FileSignature, Lock, Unlock, Save, X, Calendar as CalendarIcon, Upload, FileCheck } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Checkbox } from "./ui/checkbox";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface AgreementVersion {
  versionNumber: number;
  createdAt: string;
  createdBy: string;
  changes: string;
  allowedRoles: string[];
}

interface RentalAgreement {
  id: string;
  agreementNumber: string;
  poNumber: string;
  projectName: string;
  owner: string;
  ownerPhone: string;
  hirer: string;
  hirerPhone: string;
  location: string;
  termOfHire: string;
  transportation: string;
  monthlyRental: number;
  securityDeposit: number;
  minimumCharges: number;
  defaultInterest: number;
  ownerSignatoryName: string;
  ownerNRIC: string;
  hirerSignatoryName: string;
  hirerNRIC: string;
  ownerSignature?: string;
  hirerSignature?: string;
  ownerSignatureDate?: string;
  hirerSignatureDate?: string;
  signedDocumentUrl?: string;
  signedDocumentUploadedAt?: string;
  signedDocumentUploadedBy?: string;
  status: 'Draft' | 'Active' | 'Expired' | 'Terminated';
  currentVersion: number;
  versions: AgreementVersion[];
  createdAt: string;
  createdBy: string;
}

const userRoles = ['Admin', 'Manager', 'Sales', 'Finance', 'Operations', 'Staff'];

export function RentalAgreement() {
  const [agreements, setAgreements] = useState<RentalAgreement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<RentalAgreement | null>(null);
  const [isSignatureMode, setIsSignatureMode] = useState(false);
  const [signatureType, setSignatureType] = useState<'owner' | 'hirer'>('owner');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  const ownerCanvasRef = useRef<HTMLCanvasElement>(null);
  const hirerCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [currentUserRole] = useState('Admin'); // Mock current user role

  // Fetch agreements from API
  const fetchAgreements = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/54f76e26-7bfc-4310-a122-56b8dd220777',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RentalAgreement.tsx:fetchAgreements:start',message:'Starting fetch',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    try {
      setIsLoading(true);
      const response = await fetch('/api/rental-agreement');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/54f76e26-7bfc-4310-a122-56b8dd220777',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RentalAgreement.tsx:fetchAgreements:response',message:'Fetch response received',data:{status:response.status,ok:response.ok,statusText:response.statusText},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4-H5'})}).catch(()=>{});
      // #endregion
      const data = await response.json();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/54f76e26-7bfc-4310-a122-56b8dd220777',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RentalAgreement.tsx:fetchAgreements:parsed',message:'JSON parsed',data:{success:data.success,message:data.message,agreementCount:data.agreements?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      
      if (data.success) {
        setAgreements(data.agreements);
      } else {
        toast.error(data.message || 'Failed to fetch agreements');
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/54f76e26-7bfc-4310-a122-56b8dd220777',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RentalAgreement.tsx:fetchAgreements:error',message:'Fetch error caught',data:{errorMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4-H5'})}).catch(()=>{});
      // #endregion
      console.error('Error fetching agreements:', error);
      toast.error('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load agreements on mount
  useEffect(() => {
    fetchAgreements();
  }, [fetchAgreements]);

  // Form state
  const [formData, setFormData] = useState<Partial<RentalAgreement>>({
    owner: 'Power Metal & Steel Sdn Bhd',
    ownerPhone: '+60 3-1234 5678',
    status: 'Draft',
    currentVersion: 1,
    versions: []
  });

  const [versionAccess, setVersionAccess] = useState<string[]>(['Admin', 'Manager']);

  const getStatusBadge = (status: RentalAgreement['status']) => {
    switch (status) {
      case 'Draft':
        return <Badge className="bg-[#6B7280] hover:bg-[#4B5563]">Draft</Badge>;
      case 'Active':
        return <Badge className="bg-[#059669] hover:bg-[#047857]">Active</Badge>;
      case 'Expired':
        return <Badge className="bg-[#F59E0B] hover:bg-[#D97706]">Expired</Badge>;
      case 'Terminated':
        return <Badge className="bg-[#DC2626] hover:bg-[#B91C1C]">Terminated</Badge>;
    }
  };

  const handleCreateAgreement = async () => {
    if (!formData.projectName || !formData.hirer || !formData.agreementNumber || !formData.poNumber) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const response = await fetch('/api/rental-agreement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agreementNumber: formData.agreementNumber,
          poNumber: formData.poNumber,
          projectName: formData.projectName,
          owner: formData.owner || 'Power Metal & Steel Sdn Bhd',
          ownerPhone: formData.ownerPhone || '+60 3-1234 5678',
          hirer: formData.hirer,
          hirerPhone: formData.hirerPhone || '',
          location: formData.location || '',
          termOfHire: formData.termOfHire || '',
          transportation: formData.transportation || '',
          monthlyRental: formData.monthlyRental || 0,
          securityDeposit: formData.securityDeposit || 0,
          minimumCharges: formData.minimumCharges || 0,
          defaultInterest: formData.defaultInterest || 0,
          ownerSignatoryName: formData.ownerSignatoryName || '',
          ownerNRIC: formData.ownerNRIC || '',
          hirerSignatoryName: formData.hirerSignatoryName || '',
          hirerNRIC: formData.hirerNRIC || '',
          status: 'Draft',
          allowedRoles: versionAccess,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Rental agreement created successfully!");
        setIsCreateDialogOpen(false);
        resetForm();
        fetchAgreements(); // Refresh the list
      } else {
        toast.error(data.message || 'Failed to create agreement');
      }
    } catch (error) {
      console.error('Error creating agreement:', error);
      toast.error('Failed to connect to server');
    }
  };

  const handleEditAgreement = async () => {
    if (!selectedAgreement || !formData.projectName) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const response = await fetch('/api/rental-agreement', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedAgreement.id,
          ...formData,
          changes: 'Agreement updated',
          allowedRoles: ['Admin', 'Manager', 'Sales', 'Finance', 'Operations', 'Staff'],
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Agreement updated successfully!");
        setIsEditDialogOpen(false);
        setSelectedAgreement(null);
        resetForm();
        fetchAgreements(); // Refresh the list
      } else {
        toast.error(data.message || 'Failed to update agreement');
      }
    } catch (error) {
      console.error('Error updating agreement:', error);
      toast.error('Failed to connect to server');
    }
  };

  const resetForm = () => {
    setFormData({
      owner: 'Power Metal & Steel Sdn Bhd',
      ownerPhone: '+60 3-1234 5678',
      status: 'Draft',
      currentVersion: 1,
      versions: []
    });
    setVersionAccess(['Admin', 'Manager']);
  };

  const handleViewAgreement = (agreement: RentalAgreement) => {
    // Check if user has access to view this version
    const latestVersion = agreement.versions[agreement.versions.length - 1];
    if (!latestVersion.allowedRoles.includes(currentUserRole)) {
      toast.error("You don't have permission to view this agreement version");
      return;
    }
    setSelectedAgreement(agreement);
    setIsViewDialogOpen(true);
  };

  const handleEditClick = (agreement: RentalAgreement) => {
    setSelectedAgreement(agreement);
    setFormData(agreement);
    setVersionAccess(agreement.versions[agreement.versions.length - 1].allowedRoles);
    setIsEditDialogOpen(true);
  };

  const handleVersionControl = (agreement: RentalAgreement) => {
    setSelectedAgreement(agreement);
    setIsVersionDialogOpen(true);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#231F20';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleDownloadPDF = (agreement: RentalAgreement) => {
    toast.success(`Downloading ${agreement.agreementNumber} as PDF...`);
    setTimeout(() => {
      toast.success("PDF downloaded successfully!");
    }, 1500);
  };

  const handleUploadSignedDocument = async () => {
    if (!uploadedFile || !selectedAgreement) {
      toast.error("Please select a file to upload");
      return;
    }

    try {
      // In real application, this would upload to a cloud storage (S3, etc.)
      // For now, we'll create a fake URL and update the database
      const fakeUrl = URL.createObjectURL(uploadedFile);

      const response = await fetch('/api/rental-agreement', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedAgreement.id,
          signedDocumentUrl: fakeUrl,
          signedDocumentUploadedAt: new Date().toISOString(),
          changes: 'Signed document uploaded',
          allowedRoles: ['Admin', 'Manager'],
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Signed agreement uploaded successfully!");
        setIsUploadDialogOpen(false);
        setUploadedFile(null);
        setSelectedAgreement(null);
        fetchAgreements(); // Refresh the list
      } else {
        toast.error(data.message || 'Failed to upload signed document');
      }
    } catch (error) {
      console.error('Error uploading signed document:', error);
      toast.error('Failed to connect to server');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please upload a PDF or image file (JPG, PNG)");
        return;
      }
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size should not exceed 10MB");
        return;
      }
      setUploadedFile(file);
    }
  };

  const handleDownloadSignedDocument = (agreement: RentalAgreement) => {
    if (agreement.signedDocumentUrl) {
      toast.success("Downloading signed agreement...");
      // In real application, this would trigger actual download
      setTimeout(() => {
        toast.success("Download complete!");
      }, 1000);
    }
  };

  // Calculate total rental from monthly rental and term of hire
  const calculateTotalRental = (monthlyRental: number, termOfHire: string): number => {
    // Extract months from term string (e.g., "6 months (Starting: 01 Dec 2024)")
    const monthsMatch = termOfHire.match(/(\d+)\s*months?/i);
    if (monthsMatch) {
      const months = parseInt(monthsMatch[1]);
      return monthlyRental * months;
    }
    return monthlyRental; // Default to monthly if can't parse
  };

  const [selectedVersion, setSelectedVersion] = useState<AgreementVersion | null>(null);
  const [isViewVersionDialogOpen, setIsViewVersionDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1>Rental Agreement</h1>
        <p className="text-[#374151]">Manage rental agreements with version control and role-based access</p>
      </div>

      {/* Agreements Table */}
      <Card className="border-[#E5E7EB]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[18px]">All Agreements</CardTitle>
          <Button 
            className="bg-[#F15929] hover:bg-[#d94d1f] h-10 px-6 rounded-lg"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Agreement
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Project Name</TableHead>
                <TableHead>Total Rental</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-[#6B7280]">
                    Loading agreements...
                  </TableCell>
                </TableRow>
              ) : agreements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-[#6B7280]">
                    No rental agreements found. Create your first agreement.
                  </TableCell>
                </TableRow>
              ) : agreements.map((agreement) => (
                <TableRow key={agreement.id} className="h-14 hover:bg-[#F3F4F6]">
                  <TableCell className="text-[#374151]">{agreement.projectName}</TableCell>
                  <TableCell className="text-[#374151]">RM {calculateTotalRental(agreement.monthlyRental, agreement.termOfHire).toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(agreement.status)}</TableCell>
                  <TableCell className="text-[#374151]">v{agreement.currentVersion}</TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewAgreement(agreement)}
                            >
                              <Eye className="h-4 w-4 text-[#3B82F6]" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View Agreement</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(agreement)}
                            >
                              <Edit className="h-4 w-4 text-[#F59E0B]" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit Agreement</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVersionControl(agreement)}
                            >
                              <History className="h-4 w-4 text-[#6B7280]" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Version History</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedAgreement(agreement);
                                setIsUploadDialogOpen(true);
                              }}
                            >
                              {agreement.signedDocumentUrl ? (
                                <FileCheck className="h-4 w-4 text-[#059669]" />
                              ) : (
                                <Upload className="h-4 w-4 text-[#F15929]" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{agreement.signedDocumentUrl ? "Signed Document Uploaded" : "Upload Signed Agreement"}</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadPDF(agreement)}
                            >
                              <Download className="h-4 w-4 text-[#059669]" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Download PDF</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Agreement Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Rental Agreement</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new rental agreement
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Agreement Information */}
            <div className="space-y-4">
              <h3 className="text-[#231F20]">Agreement Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rental Agreement Number *</Label>
                  <Input
                    placeholder="RA-2024-XXX"
                    value={formData.agreementNumber || ''}
                    onChange={(e) => setFormData({...formData, agreementNumber: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>P/O Number *</Label>
                  <Input
                    placeholder="PO-2024-XXX"
                    value={formData.poNumber || ''}
                    onChange={(e) => setFormData({...formData, poNumber: e.target.value})}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Project Name *</Label>
                  <Input
                    placeholder="Enter project name"
                    value={formData.projectName || ''}
                    onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Owner & Hirer Details */}
            <div className="space-y-4">
              <h3 className="text-[#231F20]">Owner & Hirer Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Owner</Label>
                  <Input
                    value={formData.owner || 'Power Metal & Steel Sdn Bhd'}
                    onChange={(e) => setFormData({...formData, owner: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Owner Telephone</Label>
                  <Input
                    placeholder="+60 X-XXXX XXXX"
                    value={formData.ownerPhone || ''}
                    onChange={(e) => setFormData({...formData, ownerPhone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hirer *</Label>
                  <Input
                    placeholder="Enter hirer company name"
                    value={formData.hirer || ''}
                    onChange={(e) => setFormData({...formData, hirer: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hirer Telephone</Label>
                  <Input
                    placeholder="+60 X-XXXX XXXX"
                    value={formData.hirerPhone || ''}
                    onChange={(e) => setFormData({...formData, hirerPhone: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Location & Terms */}
            <div className="space-y-4">
              <h3 className="text-[#231F20]">Location & Terms</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Location & Address of Goods</Label>
                  <Textarea
                    placeholder="Enter full address"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Term of Hire</Label>
                    <Input
                      placeholder="e.g., 6 months (Starting: 01 Jan 2025)"
                      value={formData.termOfHire || ''}
                      onChange={(e) => setFormData({...formData, termOfHire: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Transportation</Label>
                    <Select
                      value={formData.transportation}
                      onValueChange={(value) => setFormData({...formData, transportation: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select transportation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Included - Delivery & Collection">Included - Delivery & Collection</SelectItem>
                        <SelectItem value="Excluded - Self Collection">Excluded - Self Collection</SelectItem>
                        <SelectItem value="Delivery Only">Delivery Only</SelectItem>
                        <SelectItem value="Collection Only">Collection Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="space-y-4">
              <h3 className="text-[#231F20]">Financial Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Rental (RM)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.monthlyRental || ''}
                    onChange={(e) => setFormData({...formData, monthlyRental: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Security Deposit (Month)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.securityDeposit || ''}
                    onChange={(e) => setFormData({...formData, securityDeposit: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Minimum Charges (Month)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.minimumCharges || ''}
                    onChange={(e) => setFormData({...formData, minimumCharges: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Interest (% per month)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={formData.defaultInterest || ''}
                    onChange={(e) => setFormData({...formData, defaultInterest: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
            </div>

            {/* Signatory Details */}
            <div className="space-y-4">
              <h3 className="text-[#231F20]">Signatory Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Owner Signatory Name</Label>
                  <Input
                    placeholder="Enter owner signatory name"
                    value={formData.ownerSignatoryName || ''}
                    onChange={(e) => setFormData({...formData, ownerSignatoryName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Owner NRIC No.</Label>
                  <Input
                    placeholder="XXXXXX-XX-XXXX"
                    value={formData.ownerNRIC || ''}
                    onChange={(e) => setFormData({...formData, ownerNRIC: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hirer Signatory Name</Label>
                  <Input
                    placeholder="Enter hirer signatory name"
                    value={formData.hirerSignatoryName || ''}
                    onChange={(e) => setFormData({...formData, hirerSignatoryName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hirer NRIC No.</Label>
                  <Input
                    placeholder="XXXXXX-XX-XXXX"
                    value={formData.hirerNRIC || ''}
                    onChange={(e) => setFormData({...formData, hirerNRIC: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  resetForm();
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#F15929] hover:bg-[#d94d1f]"
                onClick={handleCreateAgreement}
              >
                <Save className="mr-2 h-4 w-4" />
                Create Agreement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Agreement Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Rental Agreement</DialogTitle>
            <DialogDescription>
              Editing {selectedAgreement?.agreementNumber} - This will create a new version
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Same form fields as Create */}
            <div className="space-y-4">
              <h3 className="text-[#231F20]">Agreement Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rental Agreement Number</Label>
                  <Input
                    value={formData.agreementNumber || ''}
                    onChange={(e) => setFormData({...formData, agreementNumber: e.target.value})}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>P/O Number</Label>
                  <Input
                    value={formData.poNumber || ''}
                    onChange={(e) => setFormData({...formData, poNumber: e.target.value})}
                    disabled
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Project Name *</Label>
                  <Input
                    value={formData.projectName || ''}
                    onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Owner & Hirer Details */}
            <div className="space-y-4">
              <h3 className="text-[#231F20]">Owner & Hirer Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Owner</Label>
                  <Input
                    value={formData.owner || ''}
                    onChange={(e) => setFormData({...formData, owner: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Owner Telephone</Label>
                  <Input
                    value={formData.ownerPhone || ''}
                    onChange={(e) => setFormData({...formData, ownerPhone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hirer *</Label>
                  <Input
                    value={formData.hirer || ''}
                    onChange={(e) => setFormData({...formData, hirer: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hirer Telephone</Label>
                  <Input
                    value={formData.hirerPhone || ''}
                    onChange={(e) => setFormData({...formData, hirerPhone: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Location & Terms */}
            <div className="space-y-4">
              <h3 className="text-[#231F20]">Location & Terms</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Location & Address of Goods</Label>
                  <Textarea
                    value={formData.location || ''}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Term of Hire</Label>
                    <Input
                      value={formData.termOfHire || ''}
                      onChange={(e) => setFormData({...formData, termOfHire: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Transportation</Label>
                    <Select
                      value={formData.transportation}
                      onValueChange={(value) => setFormData({...formData, transportation: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Included - Delivery & Collection">Included - Delivery & Collection</SelectItem>
                        <SelectItem value="Excluded - Self Collection">Excluded - Self Collection</SelectItem>
                        <SelectItem value="Delivery Only">Delivery Only</SelectItem>
                        <SelectItem value="Collection Only">Collection Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="space-y-4">
              <h3 className="text-[#231F20]">Financial Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Rental (RM)</Label>
                  <Input
                    type="number"
                    value={formData.monthlyRental || ''}
                    onChange={(e) => setFormData({...formData, monthlyRental: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Security Deposit (Month)</Label>
                  <Input
                    type="number"
                    value={formData.securityDeposit || ''}
                    onChange={(e) => setFormData({...formData, securityDeposit: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Minimum Charges (Month)</Label>
                  <Input
                    type="number"
                    value={formData.minimumCharges || ''}
                    onChange={(e) => setFormData({...formData, minimumCharges: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Interest (% per month)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.defaultInterest || ''}
                    onChange={(e) => setFormData({...formData, defaultInterest: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
            </div>

            {/* Signatory Details */}
            <div className="space-y-4">
              <h3 className="text-[#231F20]">Signatory Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Owner Signatory Name</Label>
                  <Input
                    value={formData.ownerSignatoryName || ''}
                    onChange={(e) => setFormData({...formData, ownerSignatoryName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Owner NRIC No.</Label>
                  <Input
                    value={formData.ownerNRIC || ''}
                    onChange={(e) => setFormData({...formData, ownerNRIC: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hirer Signatory Name</Label>
                  <Input
                    value={formData.hirerSignatoryName || ''}
                    onChange={(e) => setFormData({...formData, hirerSignatoryName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hirer NRIC No.</Label>
                  <Input
                    value={formData.hirerNRIC || ''}
                    onChange={(e) => setFormData({...formData, hirerNRIC: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Status Update */}
            <div className="space-y-4">
              <h3 className="text-[#231F20]">Agreement Status</h3>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({...formData, status: value as RentalAgreement['status']})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedAgreement(null);
                  resetForm();
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#F15929] hover:bg-[#d94d1f]"
                onClick={handleEditAgreement}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Changes (Create v{selectedAgreement ? selectedAgreement.currentVersion + 1 : 1})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Agreement Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rental Agreement</DialogTitle>
            <DialogDescription>
              {selectedAgreement?.agreementNumber} - Version {selectedAgreement?.currentVersion}
            </DialogDescription>
          </DialogHeader>
          {selectedAgreement && (
            <div className="space-y-6">
              {/* Agreement Header */}
              <div className="text-center space-y-2 pb-4 border-b-2 border-[#231F20]">
                <h2 className="text-[#231F20]">RENTAL AGREEMENT</h2>
                <p className="text-[14px] text-[#6B7280]">Power Metal & Steel Sdn Bhd</p>
              </div>

              {/* Agreement Details */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Owner</Label>
                  <p className="text-[#111827]">{selectedAgreement.owner}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Hirer</Label>
                  <p className="text-[#111827]">{selectedAgreement.hirer}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Owner Telephone</Label>
                  <p className="text-[#111827]">{selectedAgreement.ownerPhone}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Hirer Telephone</Label>
                  <p className="text-[#111827]">{selectedAgreement.hirerPhone}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Rental Agreement Number</Label>
                  <p className="text-[#111827]">{selectedAgreement.agreementNumber}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">P/O Number</Label>
                  <p className="text-[#111827]">{selectedAgreement.poNumber}</p>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-[#6B7280]">Project Name</Label>
                  <p className="text-[#111827]">{selectedAgreement.projectName}</p>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-[#6B7280]">Location & Address of Goods</Label>
                  <p className="text-[#111827]">{selectedAgreement.location}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Term of Hire</Label>
                  <p className="text-[#111827]">{selectedAgreement.termOfHire}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Transportation</Label>
                  <p className="text-[#111827]">{selectedAgreement.transportation}</p>
                </div>
              </div>

              {/* Financial Details */}
              <div className="space-y-4 p-4 bg-[#F9FAFB] rounded-lg">
                <h3 className="text-[#231F20]">Financial Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#6B7280]">Monthly Rental</Label>
                    <p className="text-[#111827]">RM {selectedAgreement.monthlyRental.toLocaleString()}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#6B7280]">Security Deposit</Label>
                    <p className="text-[#111827]">{selectedAgreement.securityDeposit} Month(s)</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#6B7280]">Minimum Charges</Label>
                    <p className="text-[#111827]">{selectedAgreement.minimumCharges} Month(s)</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#6B7280]">Default Interest</Label>
                    <p className="text-[#111827]">{selectedAgreement.defaultInterest}% per month</p>
                  </div>
                </div>
              </div>

              {/* Signatory Details */}
              <div className="space-y-4">
                <h3 className="text-[#231F20]">Signatory Details</h3>
                <div className="grid grid-cols-2 gap-6">
                  {/* Owner Signatory */}
                  <div className="space-y-4 p-4 border border-[#E5E7EB] rounded-lg">
                    <h4 className="text-[#111827]">Owner</h4>
                    <div className="space-y-2">
                      <Label className="text-[#6B7280]">Name</Label>
                      <p className="text-[#111827]">{selectedAgreement.ownerSignatoryName}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#6B7280]">NRIC No.</Label>
                      <p className="text-[#111827]">{selectedAgreement.ownerNRIC}</p>
                    </div>
                    {selectedAgreement.ownerSignature && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-[#6B7280]">Signature</Label>
                          <div className="border-2 border-[#E5E7EB] rounded-lg p-2 bg-white">
                            <img src={selectedAgreement.ownerSignature} alt="Owner signature" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[#6B7280]">Date</Label>
                          <p className="text-[#111827]">
                            {selectedAgreement.ownerSignatureDate && format(new Date(selectedAgreement.ownerSignatureDate), "PPP")}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Hirer Signatory */}
                  <div className="space-y-4 p-4 border border-[#E5E7EB] rounded-lg">
                    <h4 className="text-[#111827]">Hirer</h4>
                    <div className="space-y-2">
                      <Label className="text-[#6B7280]">Name</Label>
                      <p className="text-[#111827]">{selectedAgreement.hirerSignatoryName}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#6B7280]">NRIC No.</Label>
                      <p className="text-[#111827]">{selectedAgreement.hirerNRIC}</p>
                    </div>
                    {selectedAgreement.hirerSignature && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-[#6B7280]">Signature</Label>
                          <div className="border-2 border-[#E5E7EB] rounded-lg p-2 bg-white">
                            <img src={selectedAgreement.hirerSignature} alt="Hirer signature" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[#6B7280]">Date</Label>
                          <p className="text-[#111827]">
                            {selectedAgreement.hirerSignatureDate && format(new Date(selectedAgreement.hirerSignatureDate), "PPP")}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Signed Document Section */}
              <div className="space-y-4">
                <h3 className="text-[#231F20]">Signed Agreement Document</h3>
                {selectedAgreement.signedDocumentUrl ? (
                  <Card className="border-[#E5E7EB] bg-[#F0FDF4]">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <FileCheck className="h-5 w-5 text-[#059669] mt-0.5" />
                          <div className="flex-1">
                            <p className="text-[14px] text-[#059669]">
                              Signed document uploaded
                            </p>
                            {selectedAgreement.signedDocumentUploadedAt && (
                              <p className="text-[12px] text-[#6B7280] mt-1">
                                Uploaded on {format(new Date(selectedAgreement.signedDocumentUploadedAt), "PPp")}
                                {selectedAgreement.signedDocumentUploadedBy && 
                                  ` by ${selectedAgreement.signedDocumentUploadedBy}`
                                }
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadSignedDocument(selectedAgreement)}
                          className="h-9 px-4 rounded-lg shrink-0"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-[#E5E7EB] bg-[#FEF3C7]">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <FileSignature className="h-5 w-5 text-[#F59E0B] mt-0.5" />
                        <div className="flex-1">
                          <p className="text-[14px] text-[#92400E]">
                            No signed document uploaded yet
                          </p>
                          <p className="text-[12px] text-[#92400E] mt-1">
                            Use the upload button in the agreements table to upload the signed document.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsViewDialogOpen(false)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1 bg-[#F15929] hover:bg-[#d94d1f]"
                  onClick={() => handleDownloadPDF(selectedAgreement)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Version Control Dialog */}
      <Dialog open={isVersionDialogOpen} onOpenChange={setIsVersionDialogOpen}>
        <DialogContent className="max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              Agreement: {selectedAgreement?.agreementNumber} - All versions are viewable
            </DialogDescription>
          </DialogHeader>
          {selectedAgreement && (
            <div className="space-y-4">
              <div className="space-y-3">
                {[...selectedAgreement.versions].reverse().map((version, index) => (
                  <Card key={version.versionNumber} className="border-[#E5E7EB]">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-[#F15929] hover:bg-[#d94d1f]">
                              Version {version.versionNumber}
                            </Badge>
                            {version.versionNumber === selectedAgreement.currentVersion && (
                              <Badge className="bg-[#059669] hover:bg-[#047857]">Current</Badge>
                            )}
                          </div>
                          <p className="text-[14px] text-[#111827] mb-1">{version.changes}</p>
                          <div className="flex items-center gap-4 text-[12px] text-[#6B7280]">
                            <span>Created by: {version.createdBy}</span>
                            <span>•</span>
                            <span>{format(new Date(version.createdAt), "PPp")}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedVersion(version);
                            setIsViewVersionDialogOpen(true);
                          }}
                          className="ml-4"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsVersionDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Specific Version Dialog */}
      <Dialog open={isViewVersionDialogOpen} onOpenChange={setIsViewVersionDialogOpen}>
        <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Agreement Version</DialogTitle>
            <DialogDescription>
              {selectedAgreement?.agreementNumber} - Version {selectedVersion?.versionNumber}
              {selectedVersion?.versionNumber === selectedAgreement?.currentVersion && " (Current)"}
            </DialogDescription>
          </DialogHeader>
          {selectedAgreement && selectedVersion && (
            <div className="space-y-6">
              {/* Version Information */}
              <Card className="border-[#E5E7EB] bg-[#F9FAFB]">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <p className="text-[14px] text-[#111827]">
                      <strong>Changes:</strong> {selectedVersion.changes}
                    </p>
                    <div className="flex items-center gap-4 text-[12px] text-[#6B7280]">
                      <span>Created by: {selectedVersion.createdBy}</span>
                      <span>•</span>
                      <span>{format(new Date(selectedVersion.createdAt), "PPp")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Agreement Header */}
              <div className="text-center space-y-2 pb-4 border-b-2 border-[#231F20]">
                <h2 className="text-[#231F20]">RENTAL AGREEMENT</h2>
                <p className="text-[14px] text-[#6B7280]">Power Metal & Steel Sdn Bhd</p>
                <Badge className="bg-[#F15929] hover:bg-[#d94d1f]">
                  Version {selectedVersion.versionNumber}
                </Badge>
              </div>

              {/* Agreement Details */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Owner</Label>
                  <p className="text-[#111827]">{selectedAgreement.owner}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Hirer</Label>
                  <p className="text-[#111827]">{selectedAgreement.hirer}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Owner Telephone</Label>
                  <p className="text-[#111827]">{selectedAgreement.ownerPhone}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Hirer Telephone</Label>
                  <p className="text-[#111827]">{selectedAgreement.hirerPhone}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Rental Agreement Number</Label>
                  <p className="text-[#111827]">{selectedAgreement.agreementNumber}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">P/O Number</Label>
                  <p className="text-[#111827]">{selectedAgreement.poNumber}</p>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-[#6B7280]">Project Name</Label>
                  <p className="text-[#111827]">{selectedAgreement.projectName}</p>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-[#6B7280]">Location & Address of Goods</Label>
                  <p className="text-[#111827]">{selectedAgreement.location}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Term of Hire</Label>
                  <p className="text-[#111827]">{selectedAgreement.termOfHire}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Transportation</Label>
                  <p className="text-[#111827]">{selectedAgreement.transportation}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Monthly Rental</Label>
                  <p className="text-[#111827]">RM {selectedAgreement.monthlyRental.toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Total Rental</Label>
                  <p className="text-[#111827]">RM {calculateTotalRental(selectedAgreement.monthlyRental, selectedAgreement.termOfHire).toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Security Deposit</Label>
                  <p className="text-[#111827]">{selectedAgreement.securityDeposit} month(s)</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Minimum Charges</Label>
                  <p className="text-[#111827]">{selectedAgreement.minimumCharges} month(s)</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Default Interest</Label>
                  <p className="text-[#111827]">{selectedAgreement.defaultInterest}% per month</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Status</Label>
                  <div>{getStatusBadge(selectedAgreement.status)}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsViewVersionDialogOpen(false);
                    setSelectedVersion(null);
                  }}
                >
                  Close
                </Button>
                <Button
                  className="flex-1 bg-[#F15929] hover:bg-[#d94d1f]"
                  onClick={() => {
                    toast.success(`Downloading Version ${selectedVersion.versionNumber} as PDF...`);
                    setTimeout(() => {
                      toast.success("PDF downloaded successfully!");
                    }, 1500);
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download This Version
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Signed Agreement Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Upload Signed Agreement</DialogTitle>
            <DialogDescription>
              Upload the signed agreement document for {selectedAgreement?.agreementNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Current Status */}
            {selectedAgreement?.signedDocumentUrl && (
              <Card className="border-[#E5E7EB] bg-[#F0FDF4]">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <FileCheck className="h-5 w-5 text-[#059669] mt-0.5" />
                    <div className="flex-1">
                      <p className="text-[14px] text-[#059669]">
                        A signed document has already been uploaded for this agreement.
                      </p>
                      {selectedAgreement.signedDocumentUploadedAt && (
                        <p className="text-[12px] text-[#6B7280] mt-1">
                          Uploaded on {format(new Date(selectedAgreement.signedDocumentUploadedAt), "PPp")}
                          {selectedAgreement.signedDocumentUploadedBy && 
                            ` by ${selectedAgreement.signedDocumentUploadedBy}`
                          }
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* File Upload */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Document *</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                  <p className="text-[12px] text-[#6B7280]">
                    Accepted formats: PDF, JPG, PNG (Max size: 10MB)
                  </p>
                </div>
              </div>

              {uploadedFile && (
                <Card className="border-[#E5E7EB] bg-[#F9FAFB]">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-[#F15929]" />
                      <div className="flex-1">
                        <p className="text-[14px] text-[#111827]">{uploadedFile.name}</p>
                        <p className="text-[12px] text-[#6B7280]">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Info Box */}
            <Card className="border-[#E5E7EB] bg-[#FEF3C7]">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <FileSignature className="h-5 w-5 text-[#F59E0B] mt-0.5" />
                  <div>
                    <p className="text-[14px] text-[#92400E]">
                      Important Information
                    </p>
                    <ul className="text-[12px] text-[#92400E] mt-2 space-y-1 list-disc list-inside">
                      <li>Upload the agreement that has been signed by the customer</li>
                      <li>Ensure the document is clear and legible</li>
                      <li>Uploading a new document will replace the existing one</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsUploadDialogOpen(false);
                  setUploadedFile(null);
                  setSelectedAgreement(null);
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#F15929] hover:bg-[#d94d1f]"
                onClick={handleUploadSignedDocument}
                disabled={!uploadedFile}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
