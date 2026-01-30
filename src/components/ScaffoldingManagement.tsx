"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Search, Edit, Upload, Package, Loader2, X } from "lucide-react";
import { uploadScaffoldingImage } from "@/lib/upload";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { toast } from "sonner";

interface ScaffoldingItem {
  id: string;
  itemCode: string;
  name: string;
  category: string;  // Project type: CLUSTER (4.7M), CLUSTER (3.5M), BUNGALOW (5.5M), BUNGALOW (3.95M)
  available: number; // Available Quantity
  price: number;
  originPrice?: number;
  status: 'Available' | 'Low Stock' | 'Out of Stock';
  location: string;
  itemStatus: 'Available' | 'Unavailable';
  imageUrl?: string;
}

export function ScaffoldingManagement() {
  const [items, setItems] = useState<ScaffoldingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ScaffoldingItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputEditRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    available: 0,
    price: 0,
    originPrice: 0,
    location: '',
    itemStatus: 'Available' as ScaffoldingItem['itemStatus'],
    imageUrl: '' as string | undefined
  });

  // Fetch scaffolding items from API
  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/scaffolding');
      const data = await response.json();
      
      if (data.success) {
        setItems(data.data);
      } else {
        toast.error(data.message || 'Failed to fetch scaffolding items');
      }
    } catch (error) {
      console.error('Error fetching scaffolding items:', error);
      toast.error('Failed to fetch scaffolding items');
    } finally {
      setLoading(false);
    }
  };

  // Fetch items on mount
  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.itemCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || 
                          item.status === statusFilter || 
                          item.itemStatus === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      available: 0,
      price: 0,
      originPrice: 0,
      location: '',
      itemStatus: 'Available',
      imageUrl: ''
    });
  };

  const handleAddItem = async () => {
    if (!formData.name || !formData.category || !formData.location) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch('/api/scaffolding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          available: formData.available,
          price: formData.price,
          originPrice: formData.originPrice,
          location: formData.location,
          itemStatus: formData.itemStatus,
          imageUrl: formData.imageUrl,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Item added successfully!");
        setIsAddDialogOpen(false);
        resetForm();
        fetchItems(); // Refresh the list
      } else {
        toast.error(data.message || 'Failed to add item');
      }
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (item: ScaffoldingItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      available: item.available,
      price: item.price,
      originPrice: item.originPrice ?? 0,
      location: item.location,
      itemStatus: item.itemStatus,
      imageUrl: item.imageUrl
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateItem = async () => {
    if (!selectedItem || !formData.name || !formData.category || !formData.location) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch('/api/scaffolding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedItem.id,
          name: formData.name,
          category: formData.category,
          available: formData.available,
          price: formData.price,
          originPrice: formData.originPrice,
          location: formData.location,
          itemStatus: formData.itemStatus,
          imageUrl: formData.imageUrl,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Item updated successfully!");
        setIsEditDialogOpen(false);
        setSelectedItem(null);
        resetForm();
        fetchItems(); // Refresh the list
      } else {
        toast.error(data.message || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: ScaffoldingItem['status']) => {
    switch (status) {
      case 'Available':
        return <Badge className="bg-[#059669] hover:bg-[#047857]">Available</Badge>;
      case 'Low Stock':
        return <Badge className="bg-[#F59E0B] hover:bg-[#D97706]">Low Stock</Badge>;
      case 'Out of Stock':
        return <Badge className="bg-[#DC2626] hover:bg-[#B91C1C]">Out of Stock</Badge>;
    }
  };

  const getItemStatusBadge = (itemStatus: ScaffoldingItem['itemStatus']) => {
    switch (itemStatus) {
      case 'Available':
        return <Badge className="bg-[#059669] hover:bg-[#047857]">Available</Badge>;
      case 'Unavailable':
        return <Badge className="bg-[#DC2626] hover:bg-[#B91C1C]">Unavailable</Badge>;
    }
  };

  const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
  const MAX_IMAGE_SIZE_MB = 10;

  const handleImageUpload = async (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Please upload a JPG or PNG image only.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be under ${MAX_IMAGE_SIZE_MB}MB.`);
      return;
    }
    setIsUploadingImage(true);
    try {
      const result = await uploadScaffoldingImage(file);
      if (result.success && result.url) {
        setFormData(prev => ({ ...prev, imageUrl: result.url }));
        toast.success('Image uploaded.');
      } else {
        toast.error(result.error || 'Failed to upload image.');
      }
    } catch {
      toast.error('Failed to upload image.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    e.target.value = '';
  };

  const clearImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: undefined }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#F15929]" />
        <span className="ml-2 text-[#374151]">Loading scaffolding items...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1>Scaffolding Management</h1>
        <p className="text-[#374151]">Manage inventory, stock levels, and item catalog</p>
      </div>

      {/* Actions & Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-4 items-center flex-1">
          <div className="relative flex-1 max-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input
              placeholder="Search items..."
              className="pl-10 h-10 bg-white border-[#D1D5DB] rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] h-10 bg-white border-[#D1D5DB] rounded-md">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="CLUSTER (4.7M)">CLUSTER (4.7M)</SelectItem>
              <SelectItem value="CLUSTER (3.5M)">CLUSTER (3.5M)</SelectItem>
              <SelectItem value="BUNGALOW (5.5M)">BUNGALOW (5.5M)</SelectItem>
              <SelectItem value="BUNGALOW (3.95M)">BUNGALOW (3.95M)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-10 bg-white border-[#D1D5DB] rounded-md">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Low Stock">Low Stock</SelectItem>
              <SelectItem value="Out of Stock">Out of Stock</SelectItem>
              <SelectItem value="Unavailable">Unavailable</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          className="bg-[#F15929] hover:bg-[#d94d1f] h-10 px-6 rounded-lg"
          onClick={() => {
            resetForm();
            setIsAddDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Item
        </Button>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-[#9CA3AF] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#374151]">No scaffolding items found</h3>
          <p className="text-[#6B7280] mt-1">
            {items.length === 0 
              ? "Get started by adding your first scaffolding item."
              : "Try adjusting your search or filter criteria."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="border-[#E5E7EB] hover:shadow-lg transition-shadow flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 h-[48px]">
                  <div className="flex-1">
                    <CardTitle className="text-[16px]">{item.name}</CardTitle>
                    <p className="text-[12px] text-[#6B7280] mt-1">{item.itemCode}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {(item.status === 'Low Stock' || item.status === 'Out of Stock') && getStatusBadge(item.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 flex-1 flex flex-col">
                <div className="aspect-video bg-[#F3F4F6] rounded-lg flex items-center justify-center overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-12 w-12 text-[#9CA3AF]" />
                  )}
                </div>
                
                <div className="space-y-2 text-[14px] flex-1">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280] flex-1">Category:</span>
                    <span className="text-[#111827] flex-1 text-right">{item.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280] flex-1">Available:</span>
                    <span className="text-[#111827] flex-1 text-right">{item.available}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280] flex-1">Price/Day:</span>
                    <span className="text-[#111827] flex-1 text-right">RM {item.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280] flex-1">Origin Price:</span>
                    <span className="text-[#111827] flex-1 text-right">RM {(item.originPrice ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280] flex-1">Location:</span>
                    <span className="text-[#111827] flex-1 text-right">{item.location}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#6B7280] flex-1">Status:</span>
                    <span className="flex-1 flex justify-end">{getItemStatusBadge(item.itemStatus)}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleEditClick(item)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Scaffolding Item</DialogTitle>
            <DialogDescription>
              Enter the details of the new scaffolding item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name *</Label>
              <Input 
                id="itemName" 
                className="h-10" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select 
                  value={formData.category}
                  onValueChange={(value) => setFormData({...formData, category: value})}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLUSTER (4.7M)">CLUSTER (4.7M)</SelectItem>
                    <SelectItem value="CLUSTER (3.5M)">CLUSTER (3.5M)</SelectItem>
                    <SelectItem value="BUNGALOW (5.5M)">BUNGALOW (5.5M)</SelectItem>
                    <SelectItem value="BUNGALOW (3.95M)">BUNGALOW (3.95M)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="available">Available Quantity *</Label>
                <Input 
                  id="available" 
                  type="number" 
                  className="h-10" 
                  value={formData.available}
                  onChange={(e) => setFormData({...formData, available: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price per Day (RM) *</Label>
                <Input 
                  id="price" 
                  type="number" 
                  step="0.01"
                  placeholder="0.00" 
                  className="h-10" 
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originPrice">Origin Price (RM) *</Label>
                <Input 
                  id="originPrice" 
                  type="number" 
                  step="0.01"
                  placeholder="0.00" 
                  className="h-10" 
                  value={formData.originPrice}
                  onChange={(e) => setFormData({...formData, originPrice: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Warehouse Location *</Label>
                <Select
                  value={formData.location}
                  onValueChange={(value) => setFormData({...formData, location: value})}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Warehouse A">Warehouse A</SelectItem>
                    <SelectItem value="Warehouse B">Warehouse B</SelectItem>
                    <SelectItem value="Warehouse C">Warehouse C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemStatus">Status *</Label>
                <Select
                  value={formData.itemStatus}
                  onValueChange={(value) => setFormData({...formData, itemStatus: value as ScaffoldingItem['itemStatus']})}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Unavailable">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Item Image (Optional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer select-none ${
                  isDragging
                    ? 'border-[#F15929] bg-[#FEF2EE]'
                    : 'border-[#D1D5DB] hover:border-[#F15929] hover:bg-[#FEF2EE]'
                } ${isUploadingImage ? 'pointer-events-none opacity-70' : ''}`}
              >
                {formData.imageUrl ? (
                  <div className="space-y-2 relative">
                    <img src={formData.imageUrl} alt="Preview" className="max-h-40 mx-auto rounded object-contain" />
                    <p className="text-[14px] text-[#374151]">Click or drop to replace image</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => { e.stopPropagation(); clearImage(); }}
                    >
                      <X className="h-4 w-4 mr-1 inline" /> Remove image
                    </Button>
                  </div>
                ) : (
                  <>
                    {isUploadingImage ? (
                      <Loader2 className="h-8 w-8 animate-spin text-[#F15929] mx-auto mb-2" />
                    ) : (
                      <Upload className="h-8 w-8 text-[#6B7280] mx-auto mb-2" />
                    )}
                    <p className="text-[14px] text-[#374151]">
                      {isUploadingImage ? 'Uploading...' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-[12px] text-[#6B7280]">PNG, JPG up to 10MB</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button 
                type="button" 
                className="flex-1 bg-[#F15929] hover:bg-[#d94d1f]" 
                onClick={handleAddItem}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Item'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Scaffolding Item</DialogTitle>
            <DialogDescription>
              Update the details of {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editItemName">Item Name *</Label>
              <Input 
                id="editItemName" 
                className="h-10" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editCategory">Category *</Label>
                <Select 
                  value={formData.category}
                  onValueChange={(value) => setFormData({...formData, category: value})}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLUSTER (4.7M)">CLUSTER (4.7M)</SelectItem>
                    <SelectItem value="CLUSTER (3.5M)">CLUSTER (3.5M)</SelectItem>
                    <SelectItem value="BUNGALOW (5.5M)">BUNGALOW (5.5M)</SelectItem>
                    <SelectItem value="BUNGALOW (3.95M)">BUNGALOW (3.95M)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editAvailable">Available Quantity *</Label>
                <Input 
                  id="editAvailable" 
                  type="number" 
                  className="h-10" 
                  value={formData.available}
                  onChange={(e) => setFormData({...formData, available: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editPrice">Price per Day (RM) *</Label>
                <Input 
                  id="editPrice" 
                  type="number" 
                  step="0.01"
                  placeholder="0.00" 
                  className="h-10" 
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editOriginPrice">Origin Price (RM) *</Label>
                <Input 
                  id="editOriginPrice" 
                  type="number" 
                  step="0.01"
                  placeholder="0.00" 
                  className="h-10" 
                  value={formData.originPrice}
                  onChange={(e) => setFormData({...formData, originPrice: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editLocation">Warehouse Location *</Label>
                <Select
                  value={formData.location}
                  onValueChange={(value) => setFormData({...formData, location: value})}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Warehouse A">Warehouse A</SelectItem>
                    <SelectItem value="Warehouse B">Warehouse B</SelectItem>
                    <SelectItem value="Warehouse C">Warehouse C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editItemStatus">Status *</Label>
                <Select
                  value={formData.itemStatus}
                  onValueChange={(value) => setFormData({...formData, itemStatus: value as ScaffoldingItem['itemStatus']})}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Unavailable">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editImage">Item Image (Optional)</Label>
              <input
                ref={fileInputEditRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputEditRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer select-none ${
                  isDragging
                    ? 'border-[#F15929] bg-[#FEF2EE]'
                    : 'border-[#D1D5DB] hover:border-[#F15929] hover:bg-[#FEF2EE]'
                } ${isUploadingImage ? 'pointer-events-none opacity-70' : ''}`}
              >
                {formData.imageUrl ? (
                  <div className="space-y-2">
                    <img src={formData.imageUrl} alt="Preview" className="max-h-40 mx-auto rounded object-contain" />
                    <p className="text-[14px] text-[#374151]">Click or drop to replace image</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => { e.stopPropagation(); clearImage(); }}
                    >
                      <X className="h-4 w-4 mr-1 inline" /> Remove image
                    </Button>
                  </div>
                ) : (
                  <>
                    {isUploadingImage ? (
                      <Loader2 className="h-8 w-8 animate-spin text-[#F15929] mx-auto mb-2" />
                    ) : (
                      <Upload className="h-8 w-8 text-[#6B7280] mx-auto mb-2" />
                    )}
                    <p className="text-[14px] text-[#374151]">
                      {isUploadingImage ? 'Uploading...' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-[12px] text-[#6B7280]">PNG, JPG up to 10MB</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedItem(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button 
                type="button" 
                className="flex-1 bg-[#F15929] hover:bg-[#d94d1f]" 
                onClick={handleUpdateItem}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Item'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
