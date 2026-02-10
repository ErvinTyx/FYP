import { useState } from "react";
import { ArrowLeft, Upload, FileText, Shield } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Card, CardContent } from "../ui/card";
import { validatePhoneNumber } from "@/lib/phone-validation";

interface VendorRegistrationProps {
  onBack: () => void;
  onComplete: () => void;
}

export function VendorRegistration({ onBack, onComplete }: VendorRegistrationProps) {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const progressPercentage = (step / 4) * 100;

  const handleStep1Next = () => {
    // Validate phone number if provided
    if (phone && phone.trim()) {
      const phoneValidation = validatePhoneNumber(phone.trim(), 'MY');
      if (!phoneValidation.isValid) {
        setPhoneError(phoneValidation.error || "Please enter a valid phone number");
        return;
      }
    }
    setPhoneError("");
    setStep(2);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center p-4">
      <div className="w-full max-w-[520px] bg-white rounded-2xl shadow-2xl p-8">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#6B7280] hover:text-[#374151] mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h2 className="text-[#111827] mb-2">Vendor Registration</h2>
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-[12px] text-[#6B7280] mt-2">Step {step} of 4</p>
        </div>

        {/* Step 1: Vendor Profile */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[#111827] mb-4">Vendor Profile</h3>
              <div className="border-b border-[#E5E7EB] mb-4"></div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                className="h-10 border-[#D1D5DB]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessClassification">Business Classification</Label>
              <Select>
                <SelectTrigger className="h-10 border-[#D1D5DB]">
                  <SelectValue placeholder="Select classification..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equipment">Equipment Supplier</SelectItem>
                  <SelectItem value="services">Service Provider</SelectItem>
                  <SelectItem value="materials">Materials Supplier</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="services">Services/Products Offered</Label>
              <Input
                id="services"
                className="h-10 border-[#D1D5DB]"
                placeholder="e.g., Construction equipment rental"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearsInOperation">Years in Operation</Label>
              <Input
                id="yearsInOperation"
                type="number"
                className="h-10 border-[#D1D5DB]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPerson">Primary Contact Person</Label>
              <Input
                id="contactPerson"
                className="h-10 border-[#D1D5DB]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                className="h-10 border-[#D1D5DB]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+60 12-345-6789"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneError) setPhoneError("");
                }}
                onBlur={() => {
                  if (phone && phone.trim()) {
                    const phoneValidation = validatePhoneNumber(phone.trim(), 'MY');
                    if (!phoneValidation.isValid) {
                      setPhoneError(phoneValidation.error || "Please enter a valid phone number");
                    } else {
                      setPhoneError("");
                    }
                  }
                }}
                className={`h-10 border-[#D1D5DB] ${phoneError ? 'border-red-500' : ''}`}
              />
              {phoneError && (
                <p className="text-xs text-red-500">{phoneError}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleStep1Next}
                className="bg-[#F59E0B] hover:bg-[#D97706] h-10 px-6"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Document Upload */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[#111827] mb-4">Document Upload</h3>
              <div className="border-b border-[#E5E7EB] mb-4"></div>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-[#D1D5DB] rounded-lg p-8 text-center hover:border-[#F59E0B] hover:bg-[#FFFBEB] transition-colors cursor-pointer">
                <Upload className="h-12 w-12 text-[#6B7280] mx-auto mb-3" />
                <p className="text-[14px] text-[#374151] mb-1">Business Registration</p>
                <p className="text-[12px] text-[#6B7280]">Drag & drop or click to upload</p>
                <p className="text-[12px] text-[#6B7280]">PDF, JPG, PNG (Max 10MB)</p>
              </div>

              <div className="border-2 border-dashed border-[#D1D5DB] rounded-lg p-8 text-center hover:border-[#F59E0B] hover:bg-[#FFFBEB] transition-colors cursor-pointer">
                <Upload className="h-12 w-12 text-[#6B7280] mx-auto mb-3" />
                <p className="text-[14px] text-[#374151] mb-1">Tax Certificates</p>
                <p className="text-[12px] text-[#6B7280]">Drag & drop or click to upload</p>
                <p className="text-[12px] text-[#6B7280]">PDF, JPG, PNG (Max 10MB)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  className="h-10 border-[#D1D5DB]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  className="h-10 border-[#D1D5DB]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  className="h-10 border-[#D1D5DB]"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="h-10 px-6"
              >
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="bg-[#F59E0B] hover:bg-[#D97706] h-10 px-6"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Service Agreements */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[#111827] mb-4">Service Agreements</h3>
              <div className="border-b border-[#E5E7EB] mb-4"></div>
            </div>

            <Card className="border-[#E5E7EB]">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[#111827] mb-2">Terms & Conditions</h4>
                    <div className="text-[12px] text-[#6B7280] space-y-1 max-h-40 overflow-y-auto p-3 bg-[#F9FAFB] rounded">
                      <p>1. Vendor agrees to provide services/products as specified</p>
                      <p>2. Payment terms: Net 30 days from invoice date</p>
                      <p>3. Quality standards must be maintained</p>
                      <p>4. Compliance with all local regulations required</p>
                      <p>5. Confidentiality and data protection obligations</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Preferred Payment Terms</Label>
              <Select>
                <SelectTrigger className="h-10 border-[#D1D5DB]">
                  <SelectValue placeholder="Select payment terms..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="net15">Net 15 days</SelectItem>
                  <SelectItem value="net30">Net 30 days</SelectItem>
                  <SelectItem value="net45">Net 45 days</SelectItem>
                  <SelectItem value="net60">Net 60 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <Checkbox id="agreeTerms" />
                <Label htmlFor="agreeTerms" className="cursor-pointer">
                  I agree to the terms and conditions
                </Label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox id="agreeSLA" />
                <Label htmlFor="agreeSLA" className="cursor-pointer">
                  I accept the service level agreements
                </Label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox id="agreeConfidentiality" />
                <Label htmlFor="agreeConfidentiality" className="cursor-pointer">
                  I understand confidentiality requirements
                </Label>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="h-10 px-6"
              >
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                className="bg-[#F59E0B] hover:bg-[#D97706] h-10 px-6"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-[#111827] mb-4">Review & Submit</h3>
              <div className="border-b border-[#E5E7EB] mb-4"></div>
            </div>

            <Card className="border-[#E5E7EB] bg-[#FFFBEB]">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[#111827] mb-2">Approval Process</h4>
                    <ol className="text-[14px] text-[#6B7280] space-y-1">
                      <li>1. Procurement team review</li>
                      <li>2. Document verification</li>
                      <li>3. Compliance check</li>
                      <li>4. Contract signing</li>
                      <li>5. Vendor portal access granted (3-5 business days)</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#E5E7EB]">
              <CardContent className="pt-4">
                <h4 className="text-[#111827] mb-3">What happens next?</h4>
                <div className="text-[14px] text-[#6B7280] space-y-2">
                  <p>• You'll receive a confirmation email</p>
                  <p>• Our team will review your application</p>
                  <p>• We may contact you for additional information</p>
                  <p>• Upon approval, you'll get vendor portal credentials</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(3)}
                className="h-10 px-6"
              >
                Back
              </Button>
              <Button
                onClick={onComplete}
                className="bg-[#F59E0B] hover:bg-[#D97706] h-10 px-6"
              >
                Submit for Approval
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
