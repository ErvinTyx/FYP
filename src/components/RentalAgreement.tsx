import { useState, useRef, useEffect, useCallback } from "react";
import { FileText, Plus, Eye, Edit, History, Download, FileSignature, Lock, Unlock, Save, X, Calendar as CalendarIcon, Upload, FileCheck } from "lucide-react";
import { generateRentalAgreementPdf } from "@/lib/rental-agreement-pdf";
import { uploadFile } from "@/lib/upload";
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
  snapshot?: Record<string, unknown> | null;
}


interface RFQOption {
  id: string;
  rfqNumber?: string;
  customerName: string;
  customerPhone?: string;
  projectName: string;
  projectLocation?: string;
  totalAmount?: number;
}

interface DepositInfo {
  id: string;
  depositNumber: string;
  depositAmount: number;
  status: string;
  dueDate: string;
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
  signedStatus?: string | null;
  status: 'Draft' | 'Active' | 'Expired' | 'Terminated';
  currentVersion: number;
  versions: AgreementVersion[];
  createdAt: string;
  createdBy: string;
  rfqId?: string;
  rfq?: RFQOption;
  deposits?: DepositInfo[];
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
  const [rfqProjectList, setRfqProjectList] = useState<RFQOption[]>([]);
  const [rfqProjectLoading, setRfqProjectLoading] = useState(false);
  const [selectedRfqProjectId, setSelectedRfqProjectId] = useState<string>('');

  // Fetch agreements from API
  const fetchAgreements = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/rental-agreement');
      const data = await response.json();
      
      if (data.success) {
        setAgreements(data.agreements);
      } else {
        toast.error(data.message || 'Failed to fetch agreements');
      }
    } catch (error) {
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

  // Fetch RFQ projects when create dialog opens (for project name selector).
  // Exclude RFQs that already have a rental agreement linked so they don't appear in the dropdown.
  const fetchRfqProjects = useCallback(async (existingAgreements: RentalAgreement[]) => {
    try {
      setRfqProjectLoading(true);
      const response = await fetch('/api/rfq');
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        const linkedRfqIds = new Set(
          existingAgreements.map((a) => a.rfqId).filter((id): id is string => Boolean(id))
        );
        const list = data.data
          .filter((r: { id: string }) => !linkedRfqIds.has(r.id))
          .map((r: { id: string; projectName: string; customerName: string; customerPhone?: string; projectLocation?: string; rfqNumber?: string; totalAmount?: number }) => ({
            id: r.id,
            projectName: r.projectName,
            customerName: r.customerName,
            customerPhone: r.customerPhone ?? '',
            projectLocation: r.projectLocation ?? '',
            rfqNumber: r.rfqNumber,
            totalAmount: r.totalAmount != null ? Number(r.totalAmount) : undefined,
          }));
        setRfqProjectList(list);
      } else {
        setRfqProjectList([]);
      }
    } catch (err) {
      console.error('Error fetching RFQ projects:', err);
      toast.error('Failed to load projects');
      setRfqProjectList([]);
    } finally {
      setRfqProjectLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isCreateDialogOpen) fetchRfqProjects(agreements);
  }, [isCreateDialogOpen, fetchRfqProjects, agreements]);

  // Form state
  const [formData, setFormData] = useState<Partial<RentalAgreement>>({
    owner: 'Power Metal & Steel Sdn Bhd',
    ownerPhone: '+60 3-1234 5678',
    status: 'Draft',
    currentVersion: 1,
    versions: [],
    rfqId: undefined,
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

  const getCreateValidationError = (): string | null => {
    if (!formData.projectName?.trim()) return 'Project Name';
    if (!formData.owner?.trim()) return 'Owner';
    if (!formData.ownerPhone?.trim()) return 'Owner Telephone';
    if (!formData.hirer?.trim()) return 'Hirer';
    if (!formData.hirerPhone?.trim()) return 'Hirer Telephone';
    if (!formData.location?.trim()) return 'Location & Address of Goods';
    if (!formData.termOfHire?.trim()) return 'Term of Hire';
    if (!formData.transportation?.trim()) return 'Transportation';
    const num = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v === '') || Number(v) < 0;
    if (num(formData.monthlyRental)) return 'Monthly Rental (RM)';
    if (num(formData.securityDeposit)) return 'Security Deposit (Month)';
    if (num(formData.minimumCharges)) return 'Minimum Charges (Month)';
    if (num(formData.defaultInterest)) return 'Default Interest (% per month)';
    if (!formData.ownerSignatoryName?.trim()) return 'Owner Signatory Name';
    if (!formData.ownerNRIC?.trim()) return 'Owner NRIC No.';
    if (!formData.hirerSignatoryName?.trim()) return 'Hirer Signatory Name';
    if (!formData.hirerNRIC?.trim()) return 'Hirer NRIC No.';
    if (!formData.status) return 'Status';
    return null;
  };

  const handleCreateAgreement = async () => {
    const missing = getCreateValidationError();
    if (missing) {
      toast.error(`Please fill in all required fields. Missing: ${missing}`);
      return;
    }

    try {
      const response = await fetch('/api/rental-agreement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
          status: (formData.status as RentalAgreement['status']) || 'Draft',
          allowedRoles: versionAccess,
          rfqId: formData.rfqId || null,
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

  const getEditValidationError = (): string | null => {
    if (!formData.projectName?.trim()) return 'Project Name';
    if (!formData.owner?.trim()) return 'Owner';
    if (!formData.ownerPhone?.trim()) return 'Owner Telephone';
    if (!formData.hirer?.trim()) return 'Hirer';
    if (!formData.hirerPhone?.trim()) return 'Hirer Telephone';
    if (!formData.location?.trim()) return 'Location & Address of Goods';
    if (!formData.termOfHire?.trim()) return 'Term of Hire';
    if (!formData.transportation?.trim()) return 'Transportation';
    const num = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v === '') || Number(v) < 0;
    if (num(formData.monthlyRental)) return 'Monthly Rental (RM)';
    if (num(formData.securityDeposit)) return 'Security Deposit (Month)';
    if (num(formData.minimumCharges)) return 'Minimum Charges (Month)';
    if (num(formData.defaultInterest)) return 'Default Interest (% per month)';
    if (!formData.ownerSignatoryName?.trim()) return 'Owner Signatory Name';
    if (!formData.ownerNRIC?.trim()) return 'Owner NRIC No.';
    if (!formData.hirerSignatoryName?.trim()) return 'Hirer Signatory Name';
    if (!formData.hirerNRIC?.trim()) return 'Hirer NRIC No.';
    if (!formData.status) return 'Status';
    return null;
  };

  const handleEditAgreement = async () => {
    if (!selectedAgreement) {
      toast.error("Agreement not found");
      return;
    }
    const missing = getEditValidationError();
    if (missing) {
      toast.error(`Please fill in all required fields. Missing: ${missing}`);
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

  const getInitialCreateFormData = (): Partial<RentalAgreement> => ({
    projectName: '',
    owner: 'Power Metal & Steel Sdn Bhd',
    ownerPhone: '+60 3-1234 5678',
    hirer: '',
    hirerPhone: '',
    location: '',
    termOfHire: '',
    transportation: undefined,
    monthlyRental: undefined,
    securityDeposit: undefined,
    minimumCharges: undefined,
    defaultInterest: undefined,
    ownerSignatoryName: '',
    ownerNRIC: '',
    hirerSignatoryName: '',
    hirerNRIC: '',
    status: 'Draft',
    currentVersion: 1,
    versions: [],
    rfqId: undefined,
  });

  const resetForm = () => {
    setSelectedRfqProjectId('');
    setFormData(getInitialCreateFormData());
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
    try {
      toast.success(`Downloading ${agreement.agreementNumber} as PDF...`);
      const doc = generateRentalAgreementPdf({
        agreementNumber: agreement.agreementNumber,
        poNumber: agreement.poNumber ?? undefined,
        projectName: agreement.projectName,
        owner: agreement.owner,
        ownerPhone: agreement.ownerPhone ?? undefined,
        hirer: agreement.hirer,
        hirerPhone: agreement.hirerPhone ?? undefined,
        location: agreement.location ?? undefined,
        termOfHire: agreement.termOfHire ?? undefined,
        transportation: agreement.transportation ?? undefined,
        monthlyRental: Number(agreement.monthlyRental),
        securityDeposit: Number(agreement.securityDeposit),
        minimumCharges: Number(agreement.minimumCharges),
        defaultInterest: Number(agreement.defaultInterest),
        ownerSignatoryName: agreement.ownerSignatoryName ?? undefined,
        ownerNRIC: agreement.ownerNRIC ?? undefined,
        hirerSignatoryName: agreement.hirerSignatoryName ?? undefined,
        hirerNRIC: agreement.hirerNRIC ?? undefined,
        ownerSignatureDate: agreement.ownerSignatureDate ?? undefined,
        hirerSignatureDate: agreement.hirerSignatureDate ?? undefined,
      });
      doc.save(`Rental-Agreement-${agreement.agreementNumber}.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  const handleUploadSignedDocument = async () => {
    if (!uploadedFile || !selectedAgreement) {
      toast.error("Please select a file to upload");
      return;
    }

    try {
      const uploadResult = await uploadFile(uploadedFile, {
        folder: 'agreements/signed',
        maxSizeMB: 10,
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
      });

      if (!uploadResult.success || !uploadResult.url) {
        toast.error(uploadResult.error || 'Failed to upload file');
        return;
      }

      const response = await fetch('/api/rental-agreement', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedAgreement.id,
          signedDocumentUrl: uploadResult.url,
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

  const handleDownloadSignedDocument = async (agreement: RentalAgreement) => {
    if (!agreement.signedDocumentUrl) {
      toast.error("No signed document available to download.");
      return;
    }
    try {
      toast.success("Downloading signed agreement...");
      const url = agreement.signedDocumentUrl.startsWith("http")
        ? agreement.signedDocumentUrl
        : `${window.location.origin}${agreement.signedDocumentUrl.startsWith("/") ? "" : "/"}${agreement.signedDocumentUrl}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("File not found");
      const blob = await res.blob();
      const ext = agreement.signedDocumentUrl.split(".").pop()?.toLowerCase() || "pdf";
      const filename = `Signed-Agreement-${agreement.agreementNumber}.${ext}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Download complete!");
    } catch (err) {
      console.error("Download signed document failed:", err);
      toast.error("Failed to download. The file may be missing or inaccessible.");
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
            onClick={() => {
              resetForm();
              setIsCreateDialogOpen(true);
            }}
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
                    disabled
                    readOnly
                    value={`Auto-generated on save (e.g. RA-${new Date().getFullYear()}-001)`}
                    className="bg-[#F3F4F6] text-[#6B7280] cursor-not-allowed border-[#E5E7EB]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>P/O Number *</Label>
                  <Input
                    disabled
                    readOnly
                    value={`Auto-generated on save (e.g. PO-${new Date().getFullYear()}-001)`}
                    className="bg-[#F3F4F6] text-[#6B7280] cursor-not-allowed border-[#E5E7EB]"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Project Name *</Label>
                  <Select
                    value={selectedRfqProjectId || ''}
                    onValueChange={(value) => {
                      if (value === 'manual') {
                        setSelectedRfqProjectId('manual');
                        setFormData((prev) => ({
                          ...prev,
                          rfqId: undefined,
                          projectName: '',
                          hirer: '',
                          hirerPhone: '',
                          location: '',
                          monthlyRental: undefined,
                        }));
                        return;
                      }
                      setSelectedRfqProjectId(value);
                      const rfq = rfqProjectList.find((r) => r.id === value);
                      if (rfq) {
                        setFormData((prev) => ({
                          ...prev,
                          projectName: rfq.projectName,
                          hirer: rfq.customerName,
                          hirerPhone: rfq.customerPhone ?? '',
                          location: rfq.projectLocation ?? '',
                          rfqId: rfq.id,
                          monthlyRental: rfq.totalAmount != null ? rfq.totalAmount * 30 : prev.monthlyRental,
                        }));
                      }
                    }}
                    disabled={rfqProjectLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={rfqProjectLoading ? 'Loading projects...' : 'Select project (from RFQ)'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Enter project name manually</SelectItem>
                      {rfqProjectList.map((rfq) => (
                        <SelectItem key={rfq.id} value={rfq.id}>
                          {rfq.projectName}
                          {rfq.rfqNumber ? ` (${rfq.rfqNumber})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedRfqProjectId === 'manual' ? (
                    <Input
                      placeholder="Enter project name"
                      value={formData.projectName || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, projectName: e.target.value }))}
                      className="mt-1"
                    />
                  ) : selectedRfqProjectId ? (
                    <p className="text-xs text-[#6B7280]">
                      Hirer, Hirer telephone, and Location are auto-filled from the selected RFQ. You can edit them below.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Owner & Hirer Details */}
            <div className="space-y-4">
              <h3 className="text-[#231F20]">Owner & Hirer Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Owner *</Label>
                  <Input
                    value={formData.owner || 'Power Metal & Steel Sdn Bhd'}
                    onChange={(e) => setFormData({...formData, owner: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Owner Telephone *</Label>
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
                  <Label>Location & Address of Goods *</Label>
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
                    <Label>Transportation *</Label>
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
                  <Label>Security Deposit (Month) *</Label>
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
                  <Label>Default Interest (% per month) *</Label>
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
                  <Label>Owner NRIC No. *</Label>
                  <Input
                    placeholder="XXXXXX-XX-XXXX"
                    value={formData.ownerNRIC || ''}
                    onChange={(e) => setFormData({...formData, ownerNRIC: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hirer Signatory Name *</Label>
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

            {/* Agreement Status (Create: no Terminated option) */}
            <div className="space-y-4">
              <h3 className="text-[#231F20]">Agreement Status</h3>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select
                  value={formData.status || 'Draft'}
                  onValueChange={(value) => setFormData({ ...formData, status: value as RentalAgreement['status'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
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
                  <Label>Rental Agreement Number *</Label>
                  <Input
                    value={formData.agreementNumber || ''}
                    onChange={(e) => setFormData({...formData, agreementNumber: e.target.value})}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>P/O Number *</Label>
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
                  <Label>Owner *</Label>
                  <Input
                    value={formData.owner || ''}
                    onChange={(e) => setFormData({...formData, owner: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Owner Telephone *</Label>
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
                  <Label>Location & Address of Goods *</Label>
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
                    <Label>Transportation *</Label>
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
                  <Label>Security Deposit (Month) *</Label>
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
                  <Label>Default Interest (% per month) *</Label>
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
                  <Label>Owner NRIC No. *</Label>
                  <Input
                    value={formData.ownerNRIC || ''}
                    onChange={(e) => setFormData({...formData, ownerNRIC: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hirer Signatory Name *</Label>
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
                <Label>Status *</Label>
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
          {selectedAgreement && selectedVersion && (() => {
            const display = selectedVersion.snapshot && typeof selectedVersion.snapshot === 'object' && !Array.isArray(selectedVersion.snapshot)
              ? (selectedVersion.snapshot as Record<string, unknown>)
              : (selectedAgreement as unknown as Record<string, unknown>);
            const v = (k: string) => String(display[k] ?? '');
            const vn = (k: string) => Number(display[k] ?? 0);
            const statusVal = (String(display.status ?? 'Draft')) as RentalAgreement['status'];
            return (
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
                  <p className="text-[#111827]">{v('owner')}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Hirer</Label>
                  <p className="text-[#111827]">{v('hirer')}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Owner Telephone</Label>
                  <p className="text-[#111827]">{v('ownerPhone')}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Hirer Telephone</Label>
                  <p className="text-[#111827]">{v('hirerPhone')}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Rental Agreement Number</Label>
                  <p className="text-[#111827]">{v('agreementNumber')}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">P/O Number</Label>
                  <p className="text-[#111827]">{v('poNumber')}</p>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-[#6B7280]">Project Name</Label>
                  <p className="text-[#111827]">{v('projectName')}</p>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-[#6B7280]">Location & Address of Goods</Label>
                  <p className="text-[#111827]">{v('location')}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Term of Hire</Label>
                  <p className="text-[#111827]">{v('termOfHire')}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Transportation</Label>
                  <p className="text-[#111827]">{v('transportation')}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Monthly Rental</Label>
                  <p className="text-[#111827]">RM {(vn('monthlyRental')).toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Total Rental</Label>
                  <p className="text-[#111827]">RM {calculateTotalRental(vn('monthlyRental'), v('termOfHire')).toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Security Deposit</Label>
                  <p className="text-[#111827]">{vn('securityDeposit')} month(s)</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Minimum Charges</Label>
                  <p className="text-[#111827]">{vn('minimumCharges')} month(s)</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Default Interest</Label>
                  <p className="text-[#111827]">{vn('defaultInterest')}% per month</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Status</Label>
                  <div>{getStatusBadge(statusVal)}</div>
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
            );
          })()}
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
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectedAgreement && handleDownloadSignedDocument(selectedAgreement)}
                      className="h-9 px-4 rounded-lg shrink-0"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
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
