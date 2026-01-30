import { useRef } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { OpenRepairSlip } from '../../types/inspection';
import { toast } from 'sonner';

interface RepairSlipPrintProps {
  repairSlip: OpenRepairSlip;
  onClose: () => void;
}

export function RepairSlipPrint({ repairSlip, onClose }: RepairSlipPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Note: Browser print dialog can save as PDF
    toast.info('Use the Print dialog and select "Save as PDF" to download');
    window.print();
  };

  return (
    <div className="p-6">
      {/* Action Buttons - Hidden on Print */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-[#231F20]">Open Repair Slip - Print Preview</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="size-4 mr-2" />
            Close
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="size-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={handlePrint} className="bg-[#F15929] hover:bg-[#d94d1f]">
            <Printer className="size-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Printable Repair Slip */}
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-12" ref={printRef}>
          {/* Header */}
          <div className="border-b-4 border-[#F15929] pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-[#231F20] text-3xl mb-2">Power Metal & Steel</h1>
                <p className="text-gray-600">Scaffolding Rental & Services</p>
              </div>
              <div className="text-right">
                <div className="text-[#F15929] text-xl mb-2">OPEN REPAIR SLIP</div>
                <div className="text-[#231F20]">{repairSlip.orpNumber}</div>
              </div>
            </div>
          </div>

          {/* Repair Slip Information */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-[#231F20] mb-4">Repair Slip Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="text-gray-600 w-32">RCF Number:</span>
                  <span className="text-[#231F20]">{repairSlip.rcfNumber}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-600 w-32">Priority:</span>
                  <span className="text-[#231F20]">{repairSlip.priority.toUpperCase()}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-600 w-32">Status:</span>
                  <span className="text-[#231F20]">{repairSlip.status.toUpperCase()}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-600 w-32">Created Date:</span>
                  <span className="text-[#231F20]">
                    {new Date(repairSlip.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {repairSlip.startDate && (
                  <div className="flex">
                    <span className="text-gray-600 w-32">Start Date:</span>
                    <span className="text-[#231F20]">
                      {new Date(repairSlip.startDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {repairSlip.completionDate && (
                  <div className="flex">
                    <span className="text-gray-600 w-32">Completion Date:</span>
                    <span className="text-[#231F20]">
                      {new Date(repairSlip.completionDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-[#231F20] mb-4">Assignment & Cost</h3>
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="text-gray-600 w-32">Assigned To:</span>
                  <span className="text-[#231F20]">{repairSlip.assignedTo || 'Unassigned'}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-600 w-32">Created By:</span>
                  <span className="text-[#231F20]">{repairSlip.createdBy}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-600 w-32">Estimated Cost:</span>
                  <span className="text-[#231F20]">RM {Number(repairSlip.estimatedCost || 0).toFixed(2)}</span>
                </div>
                {repairSlip.actualCost > 0 && (
                  <div className="flex">
                    <span className="text-gray-600 w-32">Actual Cost:</span>
                    <span className="text-[#231F20]">RM {Number(repairSlip.actualCost || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Repair Notes */}
          {repairSlip.repairNotes && (
            <div className="mb-8">
              <h3 className="text-[#231F20] mb-2">Repair Notes</h3>
              <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded">
                {repairSlip.repairNotes}
              </p>
            </div>
          )}

          {/* Items Requiring Repair */}
          <div className="mb-8">
            <h3 className="text-[#231F20] mb-4">Items Requiring Repair</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left text-sm">#</th>
                  <th className="border border-gray-300 p-2 text-left text-sm">Item Description</th>
                  <th className="border border-gray-300 p-2 text-center text-sm">Qty</th>
                  <th className="border border-gray-300 p-2 text-left text-sm">Damage Type</th>
                  <th className="border border-gray-300 p-2 text-left text-sm">Repair Actions</th>
                  <th className="border border-gray-300 p-2 text-left text-sm">Status</th>
                  <th className="border border-gray-300 p-2 text-right text-sm">Cost (RM)</th>
                </tr>
              </thead>
              <tbody>
                {repairSlip.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="border border-gray-300 p-2 text-sm">{index + 1}</td>
                    <td className="border border-gray-300 p-2 text-sm">
                      <div>
                        <div className="text-[#231F20]">{item.scaffoldingItemName}</div>
                        {item.damageDescription && (
                          <div className="text-xs text-gray-600 mt-1">
                            {item.damageDescription}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-300 p-2 text-center text-sm">
                      {item.quantity}
                    </td>
                    <td className="border border-gray-300 p-2 text-sm">
                      {item.damageType.replace('-', ' ').toUpperCase()}
                    </td>
                    <td className="border border-gray-300 p-2 text-sm">
                      <ul className="list-disc list-inside text-xs">
                        {item.repairActions.map((action, idx) => (
                          <li key={idx}>{action}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="border border-gray-300 p-2 text-sm">
                      {item.repairStatus.replace('-', ' ').toUpperCase()}
                    </td>
                    <td className="border border-gray-300 p-2 text-right text-sm">
                      {Number(item.totalCost || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100">
                  <td colSpan={6} className="border border-gray-300 p-2 text-right text-sm">
                    <strong>Total Estimated Cost:</strong>
                  </td>
                  <td className="border border-gray-300 p-2 text-right text-sm">
                    <strong className="text-[#F15929]">
                      RM {Number(repairSlip.estimatedCost || 0).toFixed(2)}
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-12 mt-16">
            <div>
              <div className="border-t-2 border-[#231F20] pt-2 mt-16">
                <div className="text-sm text-gray-600">Prepared By</div>
                <div className="text-sm text-[#231F20] mt-1">{repairSlip.createdBy}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Date: {new Date(repairSlip.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div>
              <div className="border-t-2 border-[#231F20] pt-2 mt-16">
                <div className="text-sm text-gray-600">Technician Acknowledgment</div>
                <div className="text-sm text-[#231F20] mt-1">
                  {repairSlip.assignedTo || '_____________________'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Date: _____________________
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-gray-300 text-center text-xs text-gray-500">
            <p>This is a computer-generated document. No signature is required for validity.</p>
            <p className="mt-1">
              Power Metal & Steel | Generated on {new Date().toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          #root, #root * {
            visibility: visible;
          }
          ${printRef.current ? `#${printRef.current.id}` : ''} {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}
