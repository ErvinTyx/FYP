import { useState } from 'react';
import { Search, Upload, Check, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { OpenRepairSlip, RepairItem, InventoryAdjustment } from '../../types/inspection';
import { toast } from 'sonner@2.0.3';

interface MaintenanceDashboardProps {
  repairSlips: OpenRepairSlip[];
  onUpdateRepairSlip: (updatedSlip: OpenRepairSlip) => void;
  onCreateInventoryLog: (log: InventoryAdjustment) => void;
  onBackToInspection?: () => void; // Add callback to go back to main view
}

export function MaintenanceDashboard({ repairSlips, onUpdateRepairSlip, onCreateInventoryLog, onBackToInspection }: MaintenanceDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlip, setSelectedSlip] = useState<OpenRepairSlip | null>(null);
  const [selectedItem, setSelectedItem] = useState<RepairItem | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [updateForm, setUpdateForm] = useState({
    quantityToRepair: 0,
    repairStatus: '' as RepairItem['repairStatus'],
    notes: ''
  });

  // Filter slips that have remaining quantities to repair
  const activeRepairSlips = repairSlips
    .filter(slip => {
      // Show slips with at least one item that has remaining quantity
      const hasRemaining = slip.items.some(item => (item.quantityRemaining || item.quantity) > 0);
      return hasRemaining && (slip.status === 'open' || slip.status === 'in-repair');
    })
    .filter(slip => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        slip.orpNumber.toLowerCase().includes(query) ||
        slip.rcfNumber.toLowerCase().includes(query) ||
        slip.items.some(item => item.scaffoldingItemName.toLowerCase().includes(query))
      );
    });

  const handleOpenUpdateDialog = (slip: OpenRepairSlip, item: RepairItem) => {
    setSelectedSlip(slip);
    setSelectedItem(item);
    
    // Initialize fields if they don't exist (for backward compatibility)
    const quantityRemaining = item.quantityRemaining !== undefined ? item.quantityRemaining : item.quantity;
    const quantityRepaired = item.quantityRepaired || 0;
    
    setUpdateForm({
      quantityToRepair: quantityRemaining,
      repairStatus: item.repairStatus,
      notes: ''
    });
    setUploadedImages(item.afterImages || []);
    setShowUpdateDialog(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Simulate image upload (in real app, upload to server)
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveUpdate = () => {
    if (!selectedSlip || !selectedItem) return;

    // Initialize fields if they don't exist
    const currentQuantityRemaining = selectedItem.quantityRemaining !== undefined ? selectedItem.quantityRemaining : selectedItem.quantity;
    const currentQuantityRepaired = selectedItem.quantityRepaired || 0;

    // Validate
    if (updateForm.quantityToRepair <= 0) {
      toast.error('Repair quantity must be greater than 0');
      return;
    }

    if (updateForm.quantityToRepair > currentQuantityRemaining) {
      toast.error(`Repair quantity cannot exceed remaining quantity (${currentQuantityRemaining})`);
      return;
    }

    if (!updateForm.repairStatus) {
      toast.error('Please select a repair status');
      return;
    }

    // Only completed items reduce the remaining quantity
    const newQuantityRepaired = updateForm.repairStatus === 'completed' 
      ? currentQuantityRepaired + updateForm.quantityToRepair 
      : currentQuantityRepaired;
    const newQuantityRemaining = updateForm.repairStatus === 'completed'
      ? currentQuantityRemaining - updateForm.quantityToRepair
      : currentQuantityRemaining;

    // Update the repair item
    const updatedItems = selectedSlip.items.map(item => {
      if (item.id === selectedItem.id) {
        return {
          ...item,
          quantityRepaired: newQuantityRepaired,
          quantityRemaining: newQuantityRemaining,
          repairStatus: updateForm.repairStatus,
          afterImages: uploadedImages,
          completedDate: updateForm.repairStatus === 'completed' && newQuantityRemaining === 0 ? new Date().toISOString() : item.completedDate
        };
      }
      return item;
    });

    // Update slip status based on all items
    let newSlipStatus = selectedSlip.status;
    const allCompleted = updatedItems.every(item => {
      const remaining = item.quantityRemaining !== undefined ? item.quantityRemaining : item.quantity;
      return remaining === 0;
    });
    const anyInProgress = updatedItems.some(item => item.repairStatus === 'in-progress');
    
    if (allCompleted) {
      newSlipStatus = 'completed';
    } else if (anyInProgress) {
      newSlipStatus = 'in-repair';
    }

    const updatedSlip: OpenRepairSlip = {
      ...selectedSlip,
      items: updatedItems,
      status: newSlipStatus,
      updatedAt: new Date().toISOString()
    };

    onUpdateRepairSlip(updatedSlip);

    // Create inventory adjustment log if completed
    if (updateForm.repairStatus === 'completed') {
      const inventoryLog: InventoryAdjustment = {
        id: `adj-${Date.now()}-${Math.random()}`,
        adjustmentType: 'repair-completed',
        scaffoldingItemId: selectedItem.scaffoldingItemId,
        scaffoldingItemName: selectedItem.scaffoldingItemName,
        quantity: updateForm.quantityToRepair,
        fromStatus: 'under-repair',
        toStatus: 'available',
        referenceId: selectedSlip.orpNumber,
        referenceType: 'repair-slip',
        adjustedBy: 'Current User',
        adjustedAt: new Date().toISOString(),
        notes: updateForm.notes || `Repaired ${updateForm.quantityToRepair} units`
      };
      
      onCreateInventoryLog(inventoryLog);
    }
    
    toast.success('Repair item updated successfully');
    setShowUpdateDialog(false);
    setSelectedSlip(null);
    setSelectedItem(null);
    
    // Go back to main inspection view if callback is provided
    if (onBackToInspection) {
      onBackToInspection();
    }
  };

  const getStatusColor = (status: RepairItem['repairStatus']) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: OpenRepairSlip['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search by ORP number, RCF number, or item name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Repair Slips */}
      {activeRepairSlips.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            No active repair slips found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeRepairSlips.map((slip) => (
            <Card key={slip.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-[#231F20]">{slip.orpNumber}</CardTitle>
                    <p className="text-gray-600 text-sm mt-1">RCF: {slip.rcfNumber}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getPriorityColor(slip.priority)}>
                      {slip.priority}
                    </Badge>
                    <Badge className={getStatusColor(slip.status as any)}>
                      {slip.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Repair Items */}
                <div className="space-y-3">
                  {slip.items.map((item) => {
                    const quantityRemaining = item.quantityRemaining !== undefined ? item.quantityRemaining : item.quantity;
                    const quantityRepaired = item.quantityRepaired || 0;
                    
                    // Show all items, but mark completed ones

                    return (
                      <div
                        key={item.id}
                        className={`border rounded-lg p-4 transition-colors ${
                          quantityRemaining === 0 
                            ? 'border-green-300 bg-green-50' 
                            : 'border-gray-200 hover:border-[#F15929]'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="text-[#231F20]">{item.scaffoldingItemName}</h4>
                            <p className="text-gray-600 text-sm mt-1">
                              Total Qty: {item.quantity} | Repaired: {quantityRepaired} | Remaining: {quantityRemaining}
                            </p>
                            <p className="text-gray-600 text-sm">
                              Damage: {item.damageType} - {item.damageDescription}
                            </p>
                          </div>
                          <Badge className={getStatusColor(quantityRemaining === 0 ? 'completed' : item.repairStatus)}>
                            {quantityRemaining === 0 ? 'COMPLETED' : item.repairStatus.replace('-', ' ').toUpperCase()}
                          </Badge>
                        </div>

                        {/* Repair Actions */}
                        <div className="mt-3">
                          <p className="text-sm text-gray-700">
                            <span className="text-gray-600">Repair Actions:</span> {item.repairActions.join(', ')}
                          </p>
                          {item.repairDescription && (
                            <p className="text-sm text-gray-700 mt-1">
                              <span className="text-gray-600">Details:</span> {item.repairDescription}
                            </p>
                          )}
                        </div>

                        {/* Before/After Images */}
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Before Images ({item.beforeImages.length})</p>
                            {item.beforeImages.length > 0 && (
                              <div className="grid grid-cols-2 gap-2">
                                {item.beforeImages.slice(0, 2).map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt={`Before ${idx + 1}`}
                                    className="w-full h-20 object-cover rounded border"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-2">After Images ({item.afterImages.length})</p>
                            {item.afterImages.length > 0 && (
                              <div className="grid grid-cols-2 gap-2">
                                {item.afterImages.slice(0, 2).map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt={`After ${idx + 1}`}
                                    className="w-full h-20 object-cover rounded border"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Update Button */}
                        <div className="mt-4 flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenUpdateDialog(slip, item)}
                            className="border-[#F15929] text-[#F15929] hover:bg-[#F15929] hover:text-white"
                          >
                            <Upload className="size-4 mr-2" />
                            Update Repair
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Slip Info */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {slip.assignedTo && (
                      <div>
                        <span className="text-gray-600">Assigned To:</span> {slip.assignedTo}
                      </div>
                    )}
                    {slip.startDate && (
                      <div>
                        <span className="text-gray-600">Start Date:</span>{' '}
                        {new Date(slip.startDate).toLocaleDateString()}
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Estimated Cost:</span> RM {slip.estimatedCost.toFixed(2)}
                    </div>
                    <div>
                      <span className="text-gray-600">Actual Cost:</span> RM {slip.actualCost.toFixed(2)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Update Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Repair Item</DialogTitle>
            <DialogDescription>
              Update the repair progress, upload completion photos, and update repair status
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
              {/* Item Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-[#231F20]">{selectedItem.scaffoldingItemName}</h4>
                <p className="text-gray-600 text-sm mt-1">{selectedItem.damageDescription}</p>
                <p className="text-gray-600 text-sm mt-1">
                  Total: {selectedItem.quantity} | 
                  Repaired: {selectedItem.quantityRepaired || 0} | 
                  Remaining: {selectedItem.quantityRemaining !== undefined ? selectedItem.quantityRemaining : selectedItem.quantity}
                </p>
              </div>

              {/* Quantity to Repair */}
              <div className="space-y-2">
                <Label>Quantity to Repair *</Label>
                <Input
                  type="number"
                  min="1"
                  max={selectedItem.quantityRemaining !== undefined ? selectedItem.quantityRemaining : selectedItem.quantity}
                  value={updateForm.quantityToRepair}
                  onChange={(e) => setUpdateForm({ ...updateForm, quantityToRepair: parseInt(e.target.value) || 0 })}
                />
                <p className="text-sm text-gray-500">
                  Remaining quantity: {selectedItem.quantityRemaining !== undefined ? selectedItem.quantityRemaining : selectedItem.quantity}
                </p>
              </div>

              {/* Repair Status */}
              <div className="space-y-2">
                <Label>Repair Status *</Label>
                <Select
                  value={updateForm.repairStatus}
                  onValueChange={(value) => setUpdateForm({ ...updateForm, repairStatus: value as RepairItem['repairStatus'] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Upload Photos */}
              <div className="space-y-2">
                <Label>After Repair Photos</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="repair-images"
                  />
                  <label htmlFor="repair-images" className="cursor-pointer">
                    <Upload className="size-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Click to upload repair completion photos</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                  </label>
                </div>

                {/* Image Preview */}
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-3 mt-3">
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img}
                          alt={`Upload ${idx + 1}`}
                          className="w-full h-24 object-cover rounded border"
                        />
                        <button
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <AlertCircle className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={updateForm.notes}
                  onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                  placeholder="Add any notes about the repair..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveUpdate}
              className="bg-[#F15929] hover:bg-[#d94d1f]"
            >
              <Check className="size-4 mr-2" />
              Save Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}