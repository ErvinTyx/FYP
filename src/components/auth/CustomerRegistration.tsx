import { useState } from "react";
import { ArrowLeft, Building2, UserCircle, Upload, CheckCircle, Clock, Mail, Lock, Shield, AlertCircle, FileText, Info } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { validatePhoneNumber } from "@/lib/phone-validation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";

interface CustomerRegistrationProps {
  onBack: () => void;
  onComplete: () => void;
}

type IndividualStep = 1 | 2 | 3 | 4 | 5;
type BusinessStep = 1 | 2 | 3 | 4 | 5;

type IdType = 'NRIC' | 'PASSPORT' | 'ARMY';

interface IndividualFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  verificationCode: string;
  password: string;
  confirmPassword: string;
  tin: string;
  idType: IdType;
  idNumber: string;
  identityDocument: File | null;
}

interface BusinessFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  verificationCode: string;
  password: string;
  confirmPassword: string;
  tin: string;
  idNumber: string; // BRN (Business Registration Number)
  idType: 'BRN';
  identityDocument: File | null;
}

export function CustomerRegistration({ onBack, onComplete }: CustomerRegistrationProps) {
  const [customerType, setCustomerType] = useState<'business' | 'individual' | null>(null);
  const [individualStep, setIndividualStep] = useState<IndividualStep>(1);
  const [businessStep, setBusinessStep] = useState<BusinessStep>(1);
  const [formData, setFormData] = useState<IndividualFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    verificationCode: '',
    password: '',
    confirmPassword: '',
    tin: '',
    idType: 'NRIC',
    idNumber: '',
    identityDocument: null,
  });
  const [businessFormData, setBusinessFormData] = useState<BusinessFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    verificationCode: '',
    password: '',
    confirmPassword: '',
    tin: '',
    idNumber: '', // BRN
    idType: 'BRN',
    identityDocument: null,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof IndividualFormData, string>>>({});
  const [businessErrors, setBusinessErrors] = useState<Partial<Record<keyof BusinessFormData, string>>>({});
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  // TIN Validation - Must be IG followed by 12 digits (for individuals)
  const validateTIN = (tin: string): boolean => {
    const tinRegex = /^IG\d{12}$/;
    return tinRegex.test(tin);
  };

  // Business Registration Number (BRN) Validation
  const validateBRN = (brnValue: string): boolean => {
    // Remove spaces/dashes for validation
    const cleanBRN = brnValue.replace(/[\s-]/g, '');
    
    // Must be exactly 12 digits
    if (!/^\d{12}$/.test(cleanBRN)) {
      return false;
    }

    // Extract components
    const year = parseInt(cleanBRN.substring(0, 4));
    const entityType = cleanBRN.substring(4, 6);
    
    // Validate year (reasonable range)
    if (year < 1900 || year > new Date().getFullYear()) {
      return false;
    }

    // Validate entity type (01-06)
    const validEntityTypes = ['01', '02', '03', '04', '05', '06'];
    if (!validEntityTypes.includes(entityType)) {
      return false;
    }

    return true;
  };

  // Company TIN Validation
  const validateCompanyTIN = (tin: string): boolean => {
    const validPrefixes = ['C', 'CS', 'D', 'E', 'F', 'FA', 'PT', 'TA', 'TC', 'TN', 'TR', 'TP', 'J', 'LE'];
    
    // Check if TIN starts with a valid prefix
    const matchedPrefix = validPrefixes.find(prefix => tin.toUpperCase().startsWith(prefix));
    
    if (!matchedPrefix) {
      return false;
    }

    // Extract the numeric part after the prefix
    const numericPart = tin.substring(matchedPrefix.length);
    
    // Must have exactly 12 digits after the prefix
    if (!/^\d{12}$/.test(numericPart)) {
      return false;
    }

    return true;
  };

  // Business Step 1 validation
  const validateBusinessStep1 = (): boolean => {
    const newErrors: Partial<Record<keyof BusinessFormData, string>> = {};

    if (!businessFormData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!businessFormData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!businessFormData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessFormData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!businessFormData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else {
      const phoneValidation = validatePhoneNumber(businessFormData.phone.trim(), 'MY');
      if (!phoneValidation.isValid) {
        newErrors.phone = phoneValidation.error || 'Please enter a valid phone number';
      }
    }

    setBusinessErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Business Step 2 validation (Email Verification)
  const validateBusinessStep2 = async (): Promise<boolean> => {
    if (!businessFormData.verificationCode.trim()) {
      setBusinessErrors({ verificationCode: 'Verification code is required' });
      return false;
    }

    setIsVerifyingCode(true);
    try {
      const response = await fetch('/api/register/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: businessFormData.email,
          code: businessFormData.verificationCode,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setBusinessErrors({ verificationCode: data.message || 'Invalid verification code. Please try again.' });
        return false;
      }

      setBusinessErrors({});
      return true;
    } catch (error) {
      console.error('Verification error:', error);
      setBusinessErrors({ verificationCode: 'Failed to verify code. Please try again.' });
      return false;
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Business Step 3 validation (Password)
  const validateBusinessStep3 = (): boolean => {
    const newErrors: Partial<Record<keyof BusinessFormData, string>> = {};

    if (!businessFormData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (businessFormData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (!businessFormData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (businessFormData.password !== businessFormData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setBusinessErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Business Step 4 validation (TIN, BRN, and Identity Document)
  const validateBusinessStep4 = (): boolean => {
    const newErrors: Partial<Record<keyof BusinessFormData, string>> = {};

    if (!businessFormData.tin.trim()) {
      newErrors.tin = 'Tax Identification Number is required';
    } else if (!validateCompanyTIN(businessFormData.tin)) {
      newErrors.tin = 'Invalid TIN format';
    }

    if (!businessFormData.idNumber.trim()) {
      newErrors.idNumber = 'Business Registration Number is required';
    } else if (!validateBRN(businessFormData.idNumber)) {
      newErrors.idNumber = 'Invalid BRN format';
    }

    if (!businessFormData.identityDocument) {
      newErrors.identityDocument = 'Identity supporting document is required';
    }

    setBusinessErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Send verification code via API
  const sendVerificationCode = async (email: string, firstName?: string): Promise<boolean> => {
    setIsSendingCode(true);
    try {
      const response = await fetch('/api/register/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName }),
      });

      const data = await response.json();

      if (!data.success) {
        console.error('Failed to send code:', data.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Send code error:', error);
      return false;
    } finally {
      setIsSendingCode(false);
    }
  };

  // Handle Business Step Submissions
  const handleBusinessStep1Submit = async () => {
    if (validateBusinessStep1()) {
      const codeSent = await sendVerificationCode(businessFormData.email, businessFormData.firstName);
      if (codeSent) {
        setBusinessStep(2);
        setIsCodeSent(true);
        startResendCountdown();
      } else {
        setBusinessErrors({ email: 'Failed to send verification code. Please try again.' });
      }
    }
  };

  const handleBusinessStep2Submit = async () => {
    const isValid = await validateBusinessStep2();
    if (isValid) {
      setBusinessStep(3);
    }
  };

  const handleBusinessStep3Submit = () => {
    if (validateBusinessStep3()) {
      setBusinessStep(4);
    }
  };

  const handleBusinessStep4Submit = async () => {
    if (!validateBusinessStep4()) {
      return;
    }

    // Submit to API
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // First, upload the identity document
      let identityDocumentUrl: string | null = null;
      if (businessFormData.identityDocument) {
        try {
          identityDocumentUrl = await uploadFileToServer(businessFormData.identityDocument);
        } catch {
          setSubmitError('Failed to upload identity document. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      const response = await fetch('/api/register/customer/business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: businessFormData.firstName,
          lastName: businessFormData.lastName,
          email: businessFormData.email,
          phone: businessFormData.phone,
          password: businessFormData.password,
          tin: businessFormData.tin,
          idNumber: businessFormData.idNumber, // BRN
          idType: businessFormData.idType,
          identityDocumentUrl: identityDocumentUrl,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setSubmitError(data.message || 'Registration failed. Please try again.');
        return;
      }

      // Success - move to pending approval step
      setBusinessStep(5);
    } catch (error) {
      console.error('Business registration error:', error);
      setSubmitError('An error occurred while submitting registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1 validation
  const validateStep1 = (): boolean => {
    const newErrors: Partial<Record<keyof IndividualFormData, string>> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else {
      const phoneValidation = validatePhoneNumber(formData.phone.trim(), 'MY');
      if (!phoneValidation.isValid) {
        newErrors.phone = phoneValidation.error || 'Please enter a valid phone number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Step 1 submission
  const handleStep1Submit = async () => {
    if (validateStep1()) {
      const codeSent = await sendVerificationCode(formData.email, formData.firstName);
      if (codeSent) {
        setIndividualStep(2);
        setIsCodeSent(true);
        startResendCountdown();
      } else {
        setErrors({ email: 'Failed to send verification code. Please try again.' });
      }
    }
  };

  // Start countdown for resend button
  const startResendCountdown = () => {
    setResendCountdown(60);
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle resend code for individual
  const handleResendCode = async () => {
    if (resendCountdown === 0 && !isSendingCode) {
      const codeSent = await sendVerificationCode(formData.email, formData.firstName);
      if (codeSent) {
        startResendCountdown();
      }
    }
  };

  // Handle resend code for business
  const handleBusinessResendCode = async () => {
    if (resendCountdown === 0 && !isSendingCode) {
      const codeSent = await sendVerificationCode(businessFormData.email, businessFormData.firstName);
      if (codeSent) {
        startResendCountdown();
      }
    }
  };

  // Validate verification code
  const handleStep2Submit = async () => {
    if (!formData.verificationCode.trim()) {
      setErrors({ verificationCode: 'Verification code is required' });
      return;
    }

    setIsVerifyingCode(true);
    try {
      const response = await fetch('/api/register/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          code: formData.verificationCode,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setErrors({ verificationCode: data.message || 'Invalid verification code. Please try again.' });
        return;
      }

      setErrors({});
      setIndividualStep(3);
    } catch (error) {
      console.error('Verification error:', error);
      setErrors({ verificationCode: 'Failed to verify code. Please try again.' });
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Validate password
  const handleStep3Submit = () => {
    const newErrors: Partial<Record<keyof IndividualFormData, string>> = {};

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      setIndividualStep(4);
    }
  };

  // Get label for ID number based on idType
  const getIdNumberLabel = (idType: IdType): string => {
    switch (idType) {
      case 'NRIC':
        return 'NRIC Number';
      case 'PASSPORT':
        return 'Passport Number';
      case 'ARMY':
        return 'Army ID Number';
    }
  };

  // Validate and submit individual customer registration
  const handleStep4Submit = async () => {
    const newErrors: Partial<Record<keyof IndividualFormData, string>> = {};

    if (!formData.tin.trim()) {
      newErrors.tin = 'TIN is required';
    } else if (!validateTIN(formData.tin)) {
      newErrors.tin = 'TIN must be in format: IG followed by 12 digits';
    }
    if (!formData.idNumber.trim()) {
      newErrors.idNumber = `${getIdNumberLabel(formData.idType)} is required`;
    }
    if (!formData.identityDocument) {
      newErrors.identityDocument = 'Identity supporting document is required';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    // Submit to API
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // First, upload the identity document
      let identityDocumentUrl: string | null = null;
      if (formData.identityDocument) {
        try {
          identityDocumentUrl = await uploadFileToServer(formData.identityDocument);
        } catch {
          setSubmitError('Failed to upload identity document. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      const response = await fetch('/api/register/customer/individual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          tin: formData.tin,
          idType: formData.idType,
          idNumber: formData.idNumber,
          identityDocumentUrl: identityDocumentUrl,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setSubmitError(data.message || 'Registration failed. Please try again.');
        return;
      }

      // Success - move to pending approval step
      setIndividualStep(5);
    } catch (error) {
      console.error('Registration error:', error);
      setSubmitError('An error occurred while submitting registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Upload file to server and return URL
  const uploadFileToServer = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'identity-documents');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'File upload failed');
      }

      return data.url;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  };

  // Handle file upload for individual form
  const handleFileUpload = (file: File | null) => {
    setFormData({ ...formData, identityDocument: file });
    if (file) {
      setErrors({ ...errors, identityDocument: undefined });
    }
  };

  // Handle file upload for business form
  const handleBusinessFileUpload = (file: File | null) => {
    setBusinessFormData({ ...businessFormData, identityDocument: file });
    if (file) {
      setBusinessErrors({ ...businessErrors, identityDocument: undefined });
    }
  };

  if (!customerType) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-[#1E40AF] to-[#1E3A8A] flex items-center justify-center p-4">
        <div className="w-full max-w-[520px] bg-white rounded-2xl shadow-2xl p-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#6B7280] hover:text-[#374151] mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="text-center mb-8">
            <h2 className="text-[#111827] mb-2">Customer Type</h2>
            <div className="border-b border-[#E5E7EB] my-4"></div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setCustomerType('business')}
              className="w-full p-6 border-2 border-[#E5E7EB] rounded-xl hover:border-[#1E40AF] hover:bg-[#EFF6FF] transition-all text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#EFF6FF] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-6 w-6 text-[#1E40AF]" />
                </div>
                <div>
                  <h3 className="text-[#111827] mb-1">Business Customer</h3>
                  <ul className="text-[14px] text-[#6B7280] space-y-1">
                    <li>• Company account</li>
                    <li>• Multiple users, contracts</li>
                    <li>• Tax invoices, credit terms</li>
                  </ul>
                </div>
              </div>
            </button>

            <button
              onClick={() => setCustomerType('individual')}
              className="w-full p-6 border-2 border-[#E5E7EB] rounded-xl hover:border-[#059669] hover:bg-[#F0FDF4] transition-all text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#F0FDF4] rounded-lg flex items-center justify-center flex-shrink-0">
                  <UserCircle className="h-6 w-6 text-[#059669]" />
                </div>
                <div>
                  <h3 className="text-[#111827] mb-1">Individual Customer</h3>
                  <ul className="text-[14px] text-[#6B7280] space-y-1">
                    <li>• Personal account</li>
                    <li>• Single user, simple billing</li>
                    <li>• Receipts only, prepayment</li>
                  </ul>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Business Registration Flow - 5 Step Process
  if (customerType === 'business') {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-[#1E40AF] to-[#1E3A8A] flex items-center justify-center p-4">
        <div className="w-full max-w-[520px] bg-white rounded-2xl shadow-2xl p-8">
          {/* Step Indicator */}
          {businessStep < 5 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        businessStep >= step
                          ? 'bg-[#1E40AF] text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {step}
                    </div>
                    {step < 4 && (
                      <div
                        className={`flex-1 h-1 mx-2 ${
                          businessStep > step ? 'bg-[#1E40AF]' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                {['Info', 'Verify', 'Password', 'Business'].map((label, index) => (
                  <div key={label} className="flex items-center flex-1">
                    <span className="w-8 text-center">{label}</span>
                    {index < 3 && <div className="flex-1" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Personal Information */}
          {businessStep === 1 && (
            <>
              <button
                onClick={() => setCustomerType(null)}
                className="flex items-center gap-2 text-[#6B7280] hover:text-[#374151] mb-6"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <div className="mb-6">
                <h2 className="text-[#111827] mb-2">Account Creator Information</h2>
                <p className="text-sm text-gray-600">Please provide your personal details</p>
                <div className="border-b border-[#E5E7EB] my-4"></div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessFirstName">
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="businessFirstName"
                      value={businessFormData.firstName}
                      onChange={(e) => setBusinessFormData({ ...businessFormData, firstName: e.target.value })}
                      className={`h-10 border-[#D1D5DB] ${businessErrors.firstName ? 'border-red-500' : ''}`}
                    />
                    {businessErrors.firstName && (
                      <p className="text-xs text-red-500">{businessErrors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessLastName">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="businessLastName"
                      value={businessFormData.lastName}
                      onChange={(e) => setBusinessFormData({ ...businessFormData, lastName: e.target.value })}
                      className={`h-10 border-[#D1D5DB] ${businessErrors.lastName ? 'border-red-500' : ''}`}
                    />
                    {businessErrors.lastName && (
                      <p className="text-xs text-red-500">{businessErrors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessEmail">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    value={businessFormData.email}
                    onChange={(e) => setBusinessFormData({ ...businessFormData, email: e.target.value })}
                    className={`h-10 border-[#D1D5DB] ${businessErrors.email ? 'border-red-500' : ''}`}
                  />
                  {businessErrors.email && (
                    <p className="text-xs text-red-500">{businessErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessPhone">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="businessPhone"
                    type="tel"
                    placeholder="+60 12-345-6789"
                    value={businessFormData.phone}
                    onChange={(e) => setBusinessFormData({ ...businessFormData, phone: e.target.value })}
                    className={`h-10 border-[#D1D5DB] ${businessErrors.phone ? 'border-red-500' : ''}`}
                  />
                  {businessErrors.phone && (
                    <p className="text-xs text-red-500">{businessErrors.phone}</p>
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    onClick={handleBusinessStep1Submit}
                    className="bg-[#1E40AF] hover:bg-[#1E3A8A] h-10 px-6"
                    disabled={isSendingCode}
                  >
                    {isSendingCode ? 'Sending Code...' : 'Continue'}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Email Verification */}
          {businessStep === 2 && (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-[#EFF6FF] rounded-full flex items-center justify-center">
                    <Mail className="h-8 w-8 text-[#1E40AF]" />
                  </div>
                </div>
                <h2 className="text-[#111827] mb-2 text-center">Verify Your Email</h2>
                <p className="text-sm text-gray-600 text-center">
                  We've sent a verification code to<br />
                  <span className="font-medium">{businessFormData.email}</span>
                </p>
                <div className="border-b border-[#E5E7EB] my-4"></div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessVerificationCode">
                    Verification Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="businessVerificationCode"
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    value={businessFormData.verificationCode}
                    onChange={(e) => setBusinessFormData({ ...businessFormData, verificationCode: e.target.value })}
                    className={`h-10 border-[#D1D5DB] text-center text-lg tracking-widest ${
                      businessErrors.verificationCode ? 'border-red-500' : ''
                    }`}
                  />
                  {businessErrors.verificationCode && (
                    <div className="flex items-center gap-2 text-xs text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      <span>{businessErrors.verificationCode}</span>
                    </div>
                  )}
                </div>

                {/* Resend Code */}
                <div className="flex items-center justify-center gap-2 text-sm">
                  {resendCountdown > 0 ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>Resend code in {resendCountdown}s</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleBusinessResendCode}
                      disabled={isSendingCode}
                      className="text-[#1E40AF] hover:text-[#1E3A8A] font-medium disabled:opacity-50"
                    >
                      {isSendingCode ? 'Sending...' : 'Resend Code'}
                    </button>
                  )}
                </div>

                <div className="flex justify-between gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBusinessStep(1)}
                    className="h-10 px-6"
                    disabled={isVerifyingCode}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleBusinessStep2Submit}
                    className="bg-[#1E40AF] hover:bg-[#1E3A8A] h-10 px-6"
                    disabled={isVerifyingCode}
                  >
                    {isVerifyingCode ? 'Verifying...' : 'Verify Email'}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Set Password */}
          {businessStep === 3 && (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-[#EFF6FF] rounded-full flex items-center justify-center">
                    <Lock className="h-8 w-8 text-[#1E40AF]" />
                  </div>
                </div>
                <h2 className="text-[#111827] mb-2 text-center">Set Your Password</h2>
                <p className="text-sm text-gray-600 text-center">
                  Create a secure password for your account
                </p>
                <div className="border-b border-[#E5E7EB] my-4"></div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="businessPassword">
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="text-gray-400 hover:text-gray-600">
                          <Info className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 text-sm bg-white">
                        <p className="font-medium mb-2">Password Requirements</p>
                        <ul className="text-gray-600 space-y-1 text-xs">
                          <li>• At least 8 characters</li>
                          <li>• At least one uppercase letter</li>
                          <li>• At least one lowercase letter</li>
                          <li>• At least one number</li>
                          <li>• At least one symbol</li>
                        </ul>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Input
                    id="businessPassword"
                    type="password"
                    placeholder="At least 8 characters"
                    value={businessFormData.password}
                    onChange={(e) => setBusinessFormData({ ...businessFormData, password: e.target.value })}
                    className={`h-10 border-[#D1D5DB] ${businessErrors.password ? 'border-red-500' : ''}`}
                  />
                  {businessErrors.password && (
                    <p className="text-xs text-red-500">{businessErrors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessConfirmPassword">
                    Confirm Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="businessConfirmPassword"
                    type="password"
                    placeholder="Re-enter your password"
                    value={businessFormData.confirmPassword}
                    onChange={(e) => setBusinessFormData({ ...businessFormData, confirmPassword: e.target.value })}
                    className={`h-10 border-[#D1D5DB] ${businessErrors.confirmPassword ? 'border-red-500' : ''}`}
                  />
                  {businessErrors.confirmPassword && (
                    <p className="text-xs text-red-500">{businessErrors.confirmPassword}</p>
                  )}
                </div>

                <div className="flex justify-between gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBusinessStep(2)}
                    className="h-10 px-6"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleBusinessStep3Submit}
                    className="bg-[#1E40AF] hover:bg-[#1E3A8A] h-10 px-6"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Step 4: Business Details (TIN, BRN & Identity Document) */}
          {businessStep === 4 && (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-[#EFF6FF] rounded-full flex items-center justify-center">
                    <FileText className="h-8 w-8 text-[#1E40AF]" />
                  </div>
                </div>
                <h2 className="text-[#111827] mb-2 text-center">Business Details</h2>
                <p className="text-sm text-gray-600 text-center">
                  Enter your company registration and tax information
                </p>
                <div className="border-b border-[#E5E7EB] my-4"></div>
              </div>

              <div className="space-y-4">
                {/* TIN Field - First */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="businessTin">
                      Tax Identification Number (TIN) <span className="text-red-500">*</span>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="text-gray-400 hover:text-gray-600">
                          <Info className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 text-sm bg-white">
                        <p className="font-medium mb-2">TIN Format</p>
                        <p className="text-gray-600 mb-2">Prefix + 12 digits</p>
                        <p className="text-gray-600 mb-1">Valid prefixes:</p>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-gray-500">
                          <span>C (Companies)</span>
                          <span>CS (Cooperative)</span>
                          <span>D (Partnerships)</span>
                          <span>E (Employers)</span>
                          <span>F (Associations)</span>
                          <span>FA (Entertainers)</span>
                          <span>PT (LLPs)</span>
                          <span>TA (Trust Bodies)</span>
                          <span>TC (Unit Trusts)</span>
                          <span>TN (Business Trusts)</span>
                          <span>TR (REITs)</span>
                          <span>TP (Estates)</span>
                          <span>J (Hindu Families)</span>
                          <span>LE (Labuan)</span>
                        </div>
                        <p className="text-gray-500 mt-2 text-xs">Example: C123456789012</p>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Input
                    id="businessTin"
                    placeholder="C123456789012"
                    value={businessFormData.tin}
                    onChange={(e) => setBusinessFormData({ ...businessFormData, tin: e.target.value.toUpperCase() })}
                    className={`h-10 border-[#D1D5DB] ${businessErrors.tin ? 'border-red-500' : ''}`}
                  />
                  {businessErrors.tin && (
                    <p className="text-xs text-red-500">{businessErrors.tin}</p>
                  )}
                </div>

                {/* BRN Field - Second */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="idNumber">
                      Business Registration Number (BRN) <span className="text-red-500">*</span>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="text-gray-400 hover:text-gray-600">
                          <Info className="h-4 w-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 text-sm bg-white">
                        <p className="font-medium mb-2">BRN Format</p>
                        <p className="text-gray-600 mb-2">YYYY-TT-NNNNNN (12 digits)</p>
                        <ul className="text-xs text-gray-500 space-y-1">
                          <li>• First 4 digits: Year of incorporation</li>
                          <li>• Next 2 digits: Entity type (01-06)</li>
                          <li>• Last 6 digits: Unique entity number</li>
                        </ul>
                        <p className="text-gray-500 mt-2 text-xs">Example: 202201234565</p>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Input
                    id="idNumber"
                    placeholder="202201234565"
                    value={businessFormData.idNumber}
                    onChange={(e) => setBusinessFormData({ ...businessFormData, idNumber: e.target.value })}
                    className={`h-10 border-[#D1D5DB] ${businessErrors.idNumber ? 'border-red-500' : ''}`}
                  />
                  {businessErrors.idNumber && (
                    <p className="text-xs text-red-500">{businessErrors.idNumber}</p>
                  )}
                </div>

                {/* Identity Document Upload */}
                <div className="space-y-2">
                  <Label>
                    Upload Identity Supporting Document <span className="text-red-500">*</span>
                  </Label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-[#1E40AF] transition-colors ${
                      businessErrors.identityDocument ? 'border-red-500' : 'border-gray-300'
                    }`}
                    onClick={() => document.getElementById('businessIdentityDocInput')?.click()}
                  >
                    <input
                      id="businessIdentityDocInput"
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleBusinessFileUpload(e.target.files?.[0] || null)}
                    />
                    {businessFormData.identityDocument ? (
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm">{businessFormData.identityDocument.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to upload identity document</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 10MB</p>
                      </>
                    )}
                  </div>
                  {businessErrors.identityDocument && (
                    <p className="text-xs text-red-500">{businessErrors.identityDocument}</p>
                  )}
                </div>

                {/* Error Message */}
                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{submitError}</p>
                  </div>
                )}

                <div className="flex justify-between gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBusinessStep(3)}
                    className="h-10 px-6"
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleBusinessStep4Submit}
                    className="bg-[#1E40AF] hover:bg-[#1E3A8A] h-10 px-6"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Registration'}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Step 5: Pending Approval */}
          {businessStep === 5 && (
            <div className="text-center space-y-6">
              <div className="flex items-center justify-center">
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="h-10 w-10 text-yellow-600" />
                </div>
              </div>

              <div>
                <h2 className="text-[#111827] mb-2">Company Registration Pending Approval</h2>
                <p className="text-gray-600">
                  Your company registration has been submitted and is now pending admin approval.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                <h3 className="text-sm text-yellow-900 mb-2">What happens next?</h3>
                <ul className="text-sm text-yellow-800 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Our team will review your company registration details</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>We'll verify your Business Registration Number and TIN</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>You'll receive an email once approved (usually within 1-2 business days)</span>
                  </li>
                </ul>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <p className="text-sm text-gray-600 mb-4">
                  Registration Summary:
                </p>
                <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Account Creator:</span>
                    <span className="text-gray-900">{businessFormData.firstName} {businessFormData.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="text-gray-900">{businessFormData.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="text-gray-900">{businessFormData.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">BRN:</span>
                    <span className="text-gray-900">{businessFormData.idNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">TIN:</span>
                    <span className="text-gray-900">{businessFormData.tin}</span>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                onClick={onComplete}
                className="bg-[#1E40AF] hover:bg-[#1E3A8A] h-10 px-8"
              >
                Return to Login
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Individual Registration - 5 Step Flow
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#059669] to-[#047857] flex items-center justify-center p-4">
      <div className="w-full max-w-[520px] bg-white rounded-2xl shadow-2xl p-8">
        {/* Step Indicator */}
        {individualStep < 5 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      individualStep >= step
                        ? 'bg-[#059669] text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step}
                  </div>
                  {step < 4 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        individualStep > step ? 'bg-[#059669]' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              {['Info', 'Verify', 'Password', 'ID'].map((label, index) => (
                <div key={label} className="flex items-center flex-1">
                  <span className="w-8 text-center">{label}</span>
                  {index < 3 && <div className="flex-1" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Individual Information */}
        {individualStep === 1 && (
          <>
            <button
              onClick={() => setCustomerType(null)}
              className="flex items-center gap-2 text-[#6B7280] hover:text-[#374151] mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="mb-6">
              <h2 className="text-[#111827] mb-2">Individual Information</h2>
              <p className="text-sm text-gray-600">Please provide your personal details</p>
              <div className="border-b border-[#E5E7EB] my-4"></div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={`h-10 border-[#D1D5DB] ${errors.firstName ? 'border-red-500' : ''}`}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-red-500">{errors.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className={`h-10 border-[#D1D5DB] ${errors.lastName ? 'border-red-500' : ''}`}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-red-500">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`h-10 border-[#D1D5DB] ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+60 12-345-6789"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`h-10 border-[#D1D5DB] ${errors.phone ? 'border-red-500' : ''}`}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500">{errors.phone}</p>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="button"
                  onClick={handleStep1Submit}
                  className="bg-[#059669] hover:bg-[#047857] h-10 px-6"
                  disabled={isSendingCode}
                >
                  {isSendingCode ? 'Sending Code...' : 'Continue'}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Email Verification */}
        {individualStep === 2 && (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-[#F0FDF4] rounded-full flex items-center justify-center">
                  <Mail className="h-8 w-8 text-[#059669]" />
                </div>
              </div>
              <h2 className="text-[#111827] mb-2 text-center">Verify Your Email</h2>
              <p className="text-sm text-gray-600 text-center">
                We've sent a verification code to<br />
                <span className="font-medium">{formData.email}</span>
              </p>
              <div className="border-b border-[#E5E7EB] my-4"></div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verificationCode">
                  Verification Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="verificationCode"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  value={formData.verificationCode}
                  onChange={(e) => setFormData({ ...formData, verificationCode: e.target.value })}
                  className={`h-10 border-[#D1D5DB] text-center text-lg tracking-widest ${
                    errors.verificationCode ? 'border-red-500' : ''
                  }`}
                />
                {errors.verificationCode && (
                  <div className="flex items-center gap-2 text-xs text-red-500">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.verificationCode}</span>
                  </div>
                )}
              </div>

              {/* Resend Code */}
              <div className="flex items-center justify-center gap-2 text-sm">
                {resendCountdown > 0 ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>Resend code in {resendCountdown}s</span>
                  </div>
                ) : (
                  <button
                    onClick={handleResendCode}
                    disabled={isSendingCode}
                    className="text-[#059669] hover:text-[#047857] font-medium disabled:opacity-50"
                  >
                    {isSendingCode ? 'Sending...' : 'Resend Code'}
                  </button>
                )}
              </div>

              <div className="flex justify-between gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIndividualStep(1)}
                  className="h-10 px-6"
                  disabled={isVerifyingCode}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleStep2Submit}
                  className="bg-[#059669] hover:bg-[#047857] h-10 px-6"
                >
                  Verify Email
                </Button>
              </div>

              <p className="text-xs text-center text-gray-500 pt-2">
                Demo: Use code <span className="font-mono bg-gray-100 px-2 py-1 rounded">123456</span> to verify
              </p>
            </div>
          </>
        )}

        {/* Step 3: Set Password */}
        {individualStep === 3 && (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-[#F0FDF4] rounded-full flex items-center justify-center">
                  <Lock className="h-8 w-8 text-[#059669]" />
                </div>
              </div>
              <h2 className="text-[#111827] mb-2 text-center">Set Your Password</h2>
              <p className="text-sm text-gray-600 text-center">
                Create a secure password for your account
              </p>
              <div className="border-b border-[#E5E7EB] my-4"></div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="password">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="text-gray-400 hover:text-gray-600">
                        <Info className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 text-sm bg-white">
                      <p className="font-medium mb-2">Password Requirements</p>
                      <ul className="text-gray-600 space-y-1 text-xs">
                        <li>• At least 8 characters</li>
                        <li>• Recommended: Mix of letters, numbers, and symbols</li>
                      </ul>
                    </PopoverContent>
                  </Popover>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`h-10 border-[#D1D5DB] ${errors.password ? 'border-red-500' : ''}`}
                />
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`h-10 border-[#D1D5DB] ${errors.confirmPassword ? 'border-red-500' : ''}`}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="flex justify-between gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIndividualStep(2)}
                  className="h-10 px-6"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleStep3Submit}
                  className="bg-[#059669] hover:bg-[#047857] h-10 px-6"
                >
                  Continue
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 4: Identity Verification */}
        {individualStep === 4 && (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-[#F0FDF4] rounded-full flex items-center justify-center">
                  <Shield className="h-8 w-8 text-[#059669]" />
                </div>
              </div>
              <h2 className="text-[#111827] mb-2 text-center">Identity Verification</h2>
              <p className="text-sm text-gray-600 text-center">
                Provide your tax and identity information for verification
              </p>
              <div className="border-b border-[#E5E7EB] my-4"></div>
            </div>

            <div className="space-y-4">
              {/* TIN Field */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="individualTin">
                    Tax Identification Number (TIN) <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="text-gray-400 hover:text-gray-600">
                        <Info className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 text-sm bg-white">
                      <p className="font-medium mb-1">TIN Format</p>
                      <p className="text-gray-600">IG followed by 12 digits</p>
                      <p className="text-gray-500 mt-1">Example: IG123456789012</p>
                    </PopoverContent>
                  </Popover>
                </div>
                <Input
                  id="individualTin"
                  placeholder="IG123456789012"
                  value={formData.tin}
                  onChange={(e) => setFormData({ ...formData, tin: e.target.value.toUpperCase() })}
                  className={`h-10 border-[#D1D5DB] ${errors.tin ? 'border-red-500' : ''}`}
                />
                {errors.tin && (
                  <p className="text-xs text-red-500">{errors.tin}</p>
                )}
              </div>

              {/* ID Type Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="idType">
                  ID Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.idType}
                  onValueChange={(value: IdType) => setFormData({ ...formData, idType: value })}
                >
                  <SelectTrigger className="h-10 border-[#D1D5DB]">
                    <SelectValue placeholder="Select ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NRIC">NRIC</SelectItem>
                    <SelectItem value="PASSPORT">Passport</SelectItem>
                    <SelectItem value="ARMY">Army ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamic ID Number Field */}
              <div className="space-y-2">
                <Label htmlFor="idNumber">
                  {getIdNumberLabel(formData.idType)} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="idNumber"
                  placeholder={`Enter your ${getIdNumberLabel(formData.idType).toLowerCase()}`}
                  value={formData.idNumber}
                  onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                  className={`h-10 border-[#D1D5DB] ${errors.idNumber ? 'border-red-500' : ''}`}
                />
                {errors.idNumber && (
                  <p className="text-xs text-red-500">{errors.idNumber}</p>
                )}
              </div>

              {/* Identity Document Upload */}
              <div className="space-y-2">
                <Label>
                  Upload Identity Supporting Document <span className="text-red-500">*</span>
                </Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-[#059669] transition-colors ${
                    errors.identityDocument ? 'border-red-500' : 'border-gray-300'
                  }`}
                  onClick={() => document.getElementById('identityDocInput')?.click()}
                >
                  <input
                    id="identityDocInput"
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files?.[0] || null)}
                  />
                  {formData.identityDocument ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-sm">{formData.identityDocument.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Click to upload identity document</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 10MB</p>
                    </>
                  )}
                </div>
                {errors.identityDocument && (
                  <p className="text-xs text-red-500">{errors.identityDocument}</p>
                )}
              </div>

              {/* Error Message */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              )}

              <div className="flex justify-between gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIndividualStep(3)}
                  className="h-10 px-6"
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleStep4Submit}
                  className="bg-[#059669] hover:bg-[#047857] h-10 px-6"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Registration'}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 5: Pending Approval */}
        {individualStep === 5 && (
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-10 w-10 text-yellow-600" />
              </div>
            </div>

            <div>
              <h2 className="text-[#111827] mb-2">Account Pending Approval</h2>
              <p className="text-gray-600">
                Thank you for registering! Your account is currently under review.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
              <h3 className="text-sm text-yellow-900 mb-2">What happens next?</h3>
              <ul className="text-sm text-yellow-800 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Our team will review your registration details</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>We'll verify your identity documents</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>You'll receive an email once approved (usually within 1-2 business days)</span>
                </li>
              </ul>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <p className="text-sm text-gray-600 mb-4">
                Registration Summary:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="text-gray-900">{formData.firstName} {formData.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="text-gray-900">{formData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="text-gray-900">{formData.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">TIN:</span>
                  <span className="text-gray-900">{formData.tin}</span>
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={onComplete}
              className="bg-[#059669] hover:bg-[#047857] h-10 px-8"
            >
              Return to Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}