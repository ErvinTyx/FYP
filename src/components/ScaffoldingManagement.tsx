import { useState } from "react";
import { Plus, Search, Edit, Upload, Package } from "lucide-react";
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
import { toast } from "sonner@2.0.3";

interface ScaffoldingItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  available: number;
  price: number;
  status: 'Available' | 'Low Stock' | 'Out of Stock';
  location: string;
  itemStatus: 'Available' | 'Unavailable';
  imageUrl?: string;
}

const mockItems: ScaffoldingItem[] = [
  {
    id: 'SC-001',
    name: 'Aluminum Scaffolding Frame',
    category: 'Frames',
    quantity: 150,
    available: 120,
    price: 85,
    status: 'Available',
    location: 'Warehouse A',
    itemStatus: 'Available'
  },
  {
    id: 'SC-002',
    name: 'Steel Platform Board',
    category: 'Platforms',
    quantity: 200,
    available: 15,
    price: 45,
    status: 'Low Stock',
    location: 'Warehouse A',
    itemStatus: 'Available'
  },
  {
    id: 'SC-003',
    name: 'Scaffold Caster Wheels',
    category: 'Accessories',
    quantity: 80,
    available: 0,
    price: 25,
    status: 'Out of Stock',
    location: 'Warehouse B',
    itemStatus: 'Unavailable'
  },
  {
    id: 'SC-004',
    name: 'Guard Rail Set',
    category: 'Safety',
    quantity: 100,
    available: 85,
    price: 65,
    status: 'Available',
    location: 'Warehouse A',
    itemStatus: 'Available'
  },
];

export function ScaffoldingManagement() {
  const [items, setItems] = useState<ScaffoldingItem[]>(mockItems);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ScaffoldingItem | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: 0,
    available: 0,
    price: 0,
    location: '',
    itemStatus: 'Available' as ScaffoldingItem['itemStatus'],
    imageUrl: '' as string | undefined
  });

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.id.toLowerCase().includes(searchTerm.toLowerCase());
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
      quantity: 0,
      available: 0,
      price: 0,
      location: '',
      itemStatus: 'Available',
      imageUrl: ''
    });
  };

  const handleAddItem = () => {
    if (!formData.name || !formData.category || !formData.location) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Determine status based on availability
    let status: ScaffoldingItem['status'] = 'Available';
    if (formData.available === 0) {
      status = 'Out of Stock';
    } else if (formData.available < formData.quantity * 0.2) {
      status = 'Low Stock';
    }

    const newItem: ScaffoldingItem = {
      id: `SC-${String(items.length + 1).padStart(3, '0')}`,
      name: formData.name,
      category: formData.category,
      quantity: formData.quantity,
      available: formData.available,
      price: formData.price,
      status: status,
      location: formData.location,
      itemStatus: formData.itemStatus,
      imageUrl: formData.imageUrl
    };

    setItems([...items, newItem]);
    toast.success("Item added successfully!");
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleEditClick = (item: ScaffoldingItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      available: item.available,
      price: item.price,
      location: item.location,
      itemStatus: item.itemStatus,
      imageUrl: item.imageUrl
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateItem = () => {
    if (!selectedItem || !formData.name || !formData.category || !formData.location) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Determine status based on availability
    let status: ScaffoldingItem['status'] = 'Available';
    if (formData.available === 0) {
      status = 'Out of Stock';
    } else if (formData.available < formData.quantity * 0.2) {
      status = 'Low Stock';
    }

    const updatedItem: ScaffoldingItem = {
      ...selectedItem,
      name: formData.name,
      category: formData.category,
      quantity: formData.quantity,
      available: formData.available,
      price: formData.price,
      status: status,
      location: formData.location,
      itemStatus: formData.itemStatus,
      imageUrl: formData.imageUrl
    };

    setItems(items.map(item => item.id === selectedItem.id ? updatedItem : item));
    toast.success("Item updated successfully!");
    setIsEditDialogOpen(false);
    setSelectedItem(null);
    resetForm();
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
            <SelectTrigger className="w-[160px] h-10 bg-white border-[#D1D5DB] rounded-md">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Frames">Frames</SelectItem>
              <SelectItem value="Platforms">Platforms</SelectItem>
              <SelectItem value="Accessories">Accessories</SelectItem>
              <SelectItem value="Safety">Safety</SelectItem>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredItems.map((item) => (
          <Card key={item.id} className="border-[#E5E7EB] hover:shadow-lg transition-shadow flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2 h-[48px]">
                <div className="flex-1">
                  <CardTitle className="text-[16px]">{item.name}</CardTitle>
                  <p className="text-[12px] text-[#6B7280] mt-1">{item.id}</p>
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
                  <span className="text-[#111827] flex-1 text-right">{item.available} / {item.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280] flex-1">Price/Day:</span>
                  <span className="text-[#111827] flex-1 text-right">RM {item.price}</span>
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
                    <SelectItem value="Frames">Frames</SelectItem>
                    <SelectItem value="Platforms">Platforms</SelectItem>
                    <SelectItem value="Accessories">Accessories</SelectItem>
                    <SelectItem value="Safety">Safety</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Total Quantity *</Label>
                <Input 
                  id="quantity" 
                  type="number" 
                  className="h-10" 
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="price">Price per Day (RM) *</Label>
                <Input 
                  id="price" 
                  type="number" 
                  placeholder="0.00" 
                  className="h-10" 
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
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
              <div className="border-2 border-dashed border-[#D1D5DB] rounded-lg p-8 text-center hover:border-[#F15929] hover:bg-[#FEF2EE] transition-colors cursor-pointer">
                <Upload className="h-8 w-8 text-[#6B7280] mx-auto mb-2" />
                <p className="text-[14px] text-[#374151]">Click to upload or drag and drop</p>
                <p className="text-[12px] text-[#6B7280]">PNG, JPG up to 10MB</p>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="button" className="flex-1 bg-[#F15929] hover:bg-[#d94d1f]" onClick={handleAddItem}>
                Save Item
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
                    <SelectItem value="Frames">Frames</SelectItem>
                    <SelectItem value="Platforms">Platforms</SelectItem>
                    <SelectItem value="Accessories">Accessories</SelectItem>
                    <SelectItem value="Safety">Safety</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editQuantity">Total Quantity *</Label>
                <Input 
                  id="editQuantity" 
                  type="number" 
                  className="h-10" 
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="editPrice">Price per Day (RM) *</Label>
                <Input 
                  id="editPrice" 
                  type="number" 
                  placeholder="0.00" 
                  className="h-10" 
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
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
              <div className="border-2 border-dashed border-[#D1D5DB] rounded-lg p-8 text-center hover:border-[#F15929] hover:bg-[#FEF2EE] transition-colors cursor-pointer">
                {formData.imageUrl ? (
                  <div className="space-y-2">
                    <img src={formData.imageUrl} alt="Preview" className="max-h-32 mx-auto rounded" />
                    <p className="text-[14px] text-[#374151]">Click to change image</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-[#6B7280] mx-auto mb-2" />
                    <p className="text-[14px] text-[#374151]">Click to upload or drag and drop</p>
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
              <Button type="button" className="flex-1 bg-[#F15929] hover:bg-[#d94d1f]" onClick={handleUpdateItem}>
                Update Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}