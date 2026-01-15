import React from 'react';
import { ArrowRight, CheckCircle, Clock, FileText, Truck, Package, PenTool, DollarSign, Phone } from 'lucide-react';

export default function DeliveryReturnFlowDiagram() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[#231F20] mb-2">Delivery & Return Process Flow</h1>
        <p className="text-gray-600">Complete workflow for delivery and return management</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Flow */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-[#231F20] mb-6 flex items-center gap-2">
            <Truck className="w-6 h-6 text-[#F15929]" />
            Delivery Process Flow
          </h2>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-[#F15929] text-white rounded-full flex items-center justify-center">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-[#231F20] mb-1">Customer Request</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Customer submits delivery request for specific set (e.g., Set A, Set B) based on agreement schedule
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FileText className="w-4 h-4" />
                  Request ID generated
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-[#F15929] text-white rounded-full flex items-center justify-center">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-[#231F20] mb-1">Staff Review & Quote</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Staff reviews request and creates delivery quote including transportation cost
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <DollarSign className="w-4 h-4" />
                  Quote amount in RM
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-[#F15929] text-white rounded-full flex items-center justify-center">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-[#231F20] mb-1">Customer Approval</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Customer reviews and approves the delivery quote
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle className="w-4 h-4" />
                  Status: Quoted → Scheduled
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-[#F15929] text-white rounded-full flex items-center justify-center">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-[#231F20] mb-1">Generate Delivery Order (DO)</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Staff generates DO with driver info, vehicle details, and delivery schedule
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FileText className="w-4 h-4" />
                  DO Number assigned
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>

            {/* Step 5 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-[#F15929] text-white rounded-full flex items-center justify-center">
                5
              </div>
              <div className="flex-1">
                <h3 className="text-[#231F20] mb-1">Delivery Execution</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Items delivered to customer site on scheduled date
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Truck className="w-4 h-4" />
                  Physical delivery
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>

            {/* Step 6 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-[#F15929] text-white rounded-full flex items-center justify-center">
                6
              </div>
              <div className="flex-1">
                <h3 className="text-[#231F20] mb-1">Signature Upload with OTP</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Customer signature uploaded and verified via 6-digit OTP sent to registered phone
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone className="w-4 h-4" />
                  OTP verification required
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>

            {/* Step 7 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center">
                7
              </div>
              <div className="flex-1">
                <h3 className="text-[#231F20] mb-1">Invoice Generation</h3>
                <p className="text-gray-600 text-sm mb-2">
                  System generates invoice for delivered items and delivery charges
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FileText className="w-4 h-4" />
                  Status: Delivered & Invoiced
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Return Flow */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-[#231F20] mb-6 flex items-center gap-2">
            <Package className="w-6 h-6 text-[#F15929]" />
            Return Process Flow
          </h2>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-[#F15929] text-white rounded-full flex items-center justify-center">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-[#231F20] mb-1">Customer Return Request</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Customer submits return request for specific set with reason (e.g., phase completed)
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FileText className="w-4 h-4" />
                  Return request created
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-[#F15929] text-white rounded-full flex items-center justify-center">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-[#231F20] mb-1">Staff Review</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Staff reviews return request and validates against agreement terms
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  Verification process
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-[#F15929] text-white rounded-full flex items-center justify-center">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-[#231F20] mb-1">Schedule Return</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Staff schedules return collection date and assigns driver/vehicle
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Truck className="w-4 h-4" />
                  Collection scheduled
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-[#F15929] text-white rounded-full flex items-center justify-center">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-[#231F20] mb-1">Return Collection</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Items collected from customer site on scheduled date
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Package className="w-4 h-4" />
                  Physical collection
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>

            {/* Step 5 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-[#F15929] text-white rounded-full flex items-center justify-center">
                5
              </div>
              <div className="flex-1">
                <h3 className="text-[#231F20] mb-1">Signature Upload with OTP</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Customer signature uploaded and verified via 6-digit OTP for return acknowledgment
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone className="w-4 h-4" />
                  OTP verification required
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>

            {/* Step 6 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-[#F15929] text-white rounded-full flex items-center justify-center">
                6
              </div>
              <div className="flex-1">
                <h3 className="text-[#231F20] mb-1">Condition Inspection</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Returned items inspected for condition and damages
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle className="w-4 h-4" />
                  Condition report generated
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-gray-400" />
            </div>

            {/* Step 7 */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center">
                7
              </div>
              <div className="flex-1">
                <h3 className="text-[#231F20] mb-1">Update Billing & Agreement</h3>
                <p className="text-gray-600 text-sm mb-2">
                  System updates billing records and agreement status. Generate damage invoice if needed.
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FileText className="w-4 h-4" />
                  Status: Returned & Processed
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-[#231F20] mb-4">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-5 h-5 text-[#F15929]" />
              <h3 className="text-[#231F20]">OTP Verification</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Secure 6-digit OTP sent to customer{"'"}s registered phone number for signature verification
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-[#F15929]" />
              <h3 className="text-[#231F20]">Automated DO Generation</h3>
            </div>
            <p className="text-gray-600 text-sm">
              System generates delivery orders with all details including driver, vehicle, and items
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-[#F15929]" />
              <h3 className="text-[#231F20]">Multi-Set Management</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Handle multiple delivery sets per agreement (Set A, Set B, etc.) with independent schedules
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
