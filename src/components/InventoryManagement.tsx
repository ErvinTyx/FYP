"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  FolderOpen, 
  Loader2,
  Upload
} from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { toast } from "sonner";

// Types
interface Category {
  id: string;
  name: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

interface InventoryItem {
  id: string;
  name: string;
  pricePerDayPc: number;
  pricePerItem: number;
  replacementPerItem: number;
  status: 'Available' | 'Low Stock' | 'Out of Stock' | 'Unavailable' | 'Discontinued';
  quantityAvailable: number;
  quantityTotal: number;
  categories: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
}

export function InventoryManagement() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'categories' | 'products'>('categories');

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '' });
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Products state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isSavingItem, setIsSavingItem] = useState(false);

  // Item form state
  const [itemFormData, setItemFormData] = useState({
    name: '',
    pricePerDayPc: 0,
    pricePerItem: 0,
    replacementPerItem: 0,
    status: 'Available' as InventoryItem['status'],
    quantityAvailable: 0,
    quantityTotal: 0,
    categoryIds: [] as string[],
  });

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await fetch('/api/inventory/categories');
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.data);
      } else {
        toast.error(data.message || 'Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  // Fetch items
  const fetchItems = async () => {
    try {
      setLoadingItems(true);
      const response = await fetch('/api/inventory/items');
      const data = await response.json();
      
      if (data.success) {
        setItems(data.data);
      } else {
        toast.error(data.message || 'Failed to fetch items');
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to fetch items');
    } finally {
      setLoadingItems(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchCategories();
    fetchItems();
  }, []);

  // Filter categories
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(categorySearchTerm.toLowerCase())
  );

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(itemSearchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || 
      item.categories.some(cat => cat.id === categoryFilter);
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Category CRUD handlers
  const resetCategoryForm = () => {
    setCategoryFormData({ name: '' });
  };

  const handleAddCategory = async () => {
    if (!categoryFormData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      setIsSavingCategory(true);
      const response = await fetch('/api/inventory/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: categoryFormData.name }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Category created successfully!");
        setIsAddCategoryDialogOpen(false);
        resetCategoryForm();
        fetchCategories();
      } else {
        toast.error(data.message || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleEditCategoryClick = (category: Category) => {
    setSelectedCategory(category);
    setCategoryFormData({ name: category.name });
    setIsEditCategoryDialogOpen(true);
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory || !categoryFormData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      setIsSavingCategory(true);
      const response = await fetch('/api/inventory/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: selectedCategory.id, 
          name: categoryFormData.name 
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Category updated successfully!");
        setIsEditCategoryDialogOpen(false);
        setSelectedCategory(null);
        resetCategoryForm();
        fetchCategories();
      } else {
        toast.error(data.message || 'Failed to update category');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategoryClick = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteCategoryDialogOpen(true);
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;

    try {
      const response = await fetch(`/api/inventory/categories?id=${selectedCategory.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Category deleted successfully!");
        setIsDeleteCategoryDialogOpen(false);
        setSelectedCategory(null);
        fetchCategories();
      } else {
        toast.error(data.message || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  // Item CRUD handlers
  const resetItemForm = () => {
    setItemFormData({
      name: '',
      pricePerDayPc: 0,
      pricePerItem: 0,
      replacementPerItem: 0,
      status: 'Available',
      quantityAvailable: 0,
      quantityTotal: 0,
      categoryIds: [],
    });
  };

  const handleAddItem = async () => {
    if (!itemFormData.name.trim()) {
      toast.error("Item name is required");
      return;
    }

    try {
      setIsSavingItem(true);
      const response = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemFormData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Item created successfully!");
        setIsAddItemDialogOpen(false);
        resetItemForm();
        fetchItems();
      } else {
        toast.error(data.message || 'Failed to create item');
      }
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error('Failed to create item');
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleEditItemClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setItemFormData({
      name: item.name,
      pricePerDayPc: item.pricePerDayPc,
      pricePerItem: item.pricePerItem,
      replacementPerItem: item.replacementPerItem,
      status: item.status,
      quantityAvailable: item.quantityAvailable,
      quantityTotal: item.quantityTotal,
      categoryIds: item.categories.map(c => c.id),
    });
    setIsEditItemDialogOpen(true);
  };

  const handleUpdateItem = async () => {
    if (!selectedItem || !itemFormData.name.trim()) {
      toast.error("Item name is required");
      return;
    }

    try {
      setIsSavingItem(true);
      const response = await fetch('/api/inventory/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: selectedItem.id,
          ...itemFormData 
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Item updated successfully!");
        setIsEditItemDialogOpen(false);
        setSelectedItem(null);
        resetItemForm();
        fetchItems();
      } else {
        toast.error(data.message || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    } finally {
      setIsSavingItem(false);
    }
  };

  // Status badge helpers
  const getStatusBadge = (status: InventoryItem['status']) => {
    switch (status) {
      case 'Available':
        return <Badge className="bg-[#059669] hover:bg-[#047857]">Available</Badge>;
      case 'Low Stock':
        return <Badge className="bg-[#F59E0B] hover:bg-[#D97706]">Low Stock</Badge>;
      case 'Out of Stock':
        return <Badge className="bg-[#DC2626] hover:bg-[#B91C1C]">Out of Stock</Badge>;
      case 'Unavailable':
        return <Badge className="bg-[#6B7280] hover:bg-[#4B5563]">Unavailable</Badge>;
      case 'Discontinued':
        return <Badge className="bg-[#374151] hover:bg-[#1F2937]">Discontinued</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Category selection handler for multi-select
  const toggleCategorySelection = (categoryId: string) => {
    setItemFormData(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter(id => id !== categoryId)
        : [...prev.categoryIds, categoryId]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-[#111827]">Inventory Management</h1>
        <p className="text-[#374151]">Manage categories and inventory items</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 px-4 ${
            activeTab === 'categories'
              ? 'border-b-2 border-[#F15929] text-[#F15929]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <FolderOpen className="size-5" />
            <span>Categories</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 px-4 ${
            activeTab === 'products'
              ? 'border-b-2 border-[#F15929] text-[#F15929]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Package className="size-5" />
            <span>Products</span>
          </div>
        </button>
      </div>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Actions & Search */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
              <Input
                placeholder="Search categories..."
                className="pl-10 h-10 bg-white border-[#D1D5DB] rounded-md"
                value={categorySearchTerm}
                onChange={(e) => setCategorySearchTerm(e.target.value)}
              />
            </div>
            
            <Button 
              className="bg-[#F15929] hover:bg-[#d94d1f] h-10 px-6 rounded-lg"
              onClick={() => {
                resetCategoryForm();
                setIsAddCategoryDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>

          {/* Categories Table */}
          {loadingCategories ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-[#F15929]" />
              <span className="ml-2 text-[#374151]">Loading categories...</span>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-[#9CA3AF] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#374151]">No categories found</h3>
              <p className="text-[#6B7280] mt-1">
                {categories.length === 0 
                  ? "Get started by adding your first category."
                  : "Try adjusting your search criteria."}
              </p>
            </div>
          ) : (
            <Card className="border-[#E5E7EB]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">Category Name</TableHead>
                    <TableHead className="w-[25%]">Items</TableHead>
                    <TableHead className="w-[25%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{category.itemCount} items</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditCategoryClick(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteCategoryClick(category)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Actions & Filters */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-4 items-center flex-1">
              <div className="relative flex-1 max-w-[300px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                <Input
                  placeholder="Search items..."
                  className="pl-10 h-10 bg-white border-[#D1D5DB] rounded-md"
                  value={itemSearchTerm}
                  onChange={(e) => setItemSearchTerm(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px] h-10 bg-white border-[#D1D5DB] rounded-md">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
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
                  <SelectItem value="Discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              className="bg-[#F15929] hover:bg-[#d94d1f] h-10 px-6 rounded-lg"
              onClick={() => {
                resetItemForm();
                setIsAddItemDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Item
            </Button>
          </div>

          {/* Items Grid */}
          {loadingItems ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-[#F15929]" />
              <span className="ml-2 text-[#374151]">Loading items...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-[#9CA3AF] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#374151]">No items found</h3>
              <p className="text-[#6B7280] mt-1">
                {items.length === 0 
                  ? "Get started by adding your first inventory item."
                  : "Try adjusting your search or filter criteria."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item) => (
                <Card key={item.id} className="border-[#E5E7EB] hover:shadow-lg transition-shadow flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 min-h-[48px]">
                      <div className="flex-1">
                        <CardTitle className="text-[16px]">{item.name}</CardTitle>
                        {item.categories.length > 0 && (
                          <p className="text-[12px] text-[#6B7280] mt-1">
                            {item.categories.map(c => c.name).join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {(item.status === 'Low Stock' || item.status === 'Out of Stock') && getStatusBadge(item.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 flex-1 flex flex-col">
                    <div className="aspect-video bg-[#F3F4F6] rounded-lg flex items-center justify-center overflow-hidden">
                      <Package className="h-12 w-12 text-[#9CA3AF]" />
                    </div>
                    
                    <div className="space-y-2 text-[14px] flex-1">
                      <div className="flex justify-between">
                        <span className="text-[#6B7280] flex-1">Available:</span>
                        <span className="text-[#111827] flex-1 text-right">{item.quantityAvailable} / {item.quantityTotal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#6B7280] flex-1">Price/Day:</span>
                        <span className="text-[#111827] flex-1 text-right">RM {item.pricePerDayPc.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#6B7280] flex-1">Price/Item:</span>
                        <span className="text-[#111827] flex-1 text-right">RM {item.pricePerItem.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#6B7280] flex-1">Replacement:</span>
                        <span className="text-[#111827] flex-1 text-right">RM {item.replacementPerItem.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#6B7280] flex-1">Status:</span>
                        <span className="flex-1 flex justify-end">{getStatusBadge(item.status)}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleEditItemClick(item)}
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
        </div>
      )}

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new inventory category
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category Name *</Label>
              <Input 
                id="categoryName" 
                className="h-10" 
                placeholder="Enter category name"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ name: e.target.value })}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1" 
                onClick={() => {
                  setIsAddCategoryDialogOpen(false);
                  resetCategoryForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                className="flex-1 bg-[#F15929] hover:bg-[#d94d1f]" 
                onClick={handleAddCategory}
                disabled={isSavingCategory}
              >
                {isSavingCategory ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Create Category'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category name
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editCategoryName">Category Name *</Label>
              <Input 
                id="editCategoryName" 
                className="h-10" 
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ name: e.target.value })}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1" 
                onClick={() => {
                  setIsEditCategoryDialogOpen(false);
                  setSelectedCategory(null);
                  resetCategoryForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                className="flex-1 bg-[#F15929] hover:bg-[#d94d1f]" 
                onClick={handleUpdateCategory}
                disabled={isSavingCategory}
              >
                {isSavingCategory ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Category'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <AlertDialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedCategory?.name}&quot;? 
              {selectedCategory && selectedCategory.itemCount > 0 && (
                <span className="block mt-2 text-amber-600">
                  This category has {selectedCategory.itemCount} item(s) associated with it. 
                  Items will be unlinked from this category but not deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedCategory(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteCategory}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Item Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
            <DialogDescription>
              Enter the details of the new inventory item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name *</Label>
              <Input 
                id="itemName" 
                className="h-10" 
                value={itemFormData.name}
                onChange={(e) => setItemFormData({...itemFormData, name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Categories</Label>
              <div className="border border-[#D1D5DB] rounded-md p-3 max-h-[120px] overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">No categories available. Create one first.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleCategorySelection(category.id)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          itemFormData.categoryIds.includes(category.id)
                            ? 'bg-[#F15929] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantityTotal">Total Quantity *</Label>
                <Input 
                  id="quantityTotal" 
                  type="number" 
                  className="h-10" 
                  value={itemFormData.quantityTotal}
                  onChange={(e) => setItemFormData({...itemFormData, quantityTotal: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantityAvailable">Available Quantity *</Label>
                <Input 
                  id="quantityAvailable" 
                  type="number" 
                  className="h-10" 
                  value={itemFormData.quantityAvailable}
                  onChange={(e) => setItemFormData({...itemFormData, quantityAvailable: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pricePerDayPc">Price/Day (RM)</Label>
                <Input 
                  id="pricePerDayPc" 
                  type="number" 
                  step="0.01"
                  className="h-10" 
                  value={itemFormData.pricePerDayPc}
                  onChange={(e) => setItemFormData({...itemFormData, pricePerDayPc: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pricePerItem">Price/Item (RM)</Label>
                <Input 
                  id="pricePerItem" 
                  type="number" 
                  step="0.01"
                  className="h-10" 
                  value={itemFormData.pricePerItem}
                  onChange={(e) => setItemFormData({...itemFormData, pricePerItem: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="replacementPerItem">Replacement (RM)</Label>
                <Input 
                  id="replacementPerItem" 
                  type="number" 
                  step="0.01"
                  className="h-10" 
                  value={itemFormData.replacementPerItem}
                  onChange={(e) => setItemFormData({...itemFormData, replacementPerItem: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={itemFormData.status}
                onValueChange={(value) => setItemFormData({...itemFormData, status: value as InventoryItem['status']})}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Unavailable">Unavailable</SelectItem>
                  <SelectItem value="Discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1" 
                onClick={() => {
                  setIsAddItemDialogOpen(false);
                  resetItemForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                className="flex-1 bg-[#F15929] hover:bg-[#d94d1f]" 
                onClick={handleAddItem}
                disabled={isSavingItem}
              >
                {isSavingItem ? (
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
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Update the details of {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="editItemName">Item Name *</Label>
              <Input 
                id="editItemName" 
                className="h-10" 
                value={itemFormData.name}
                onChange={(e) => setItemFormData({...itemFormData, name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Categories</Label>
              <div className="border border-[#D1D5DB] rounded-md p-3 max-h-[120px] overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">No categories available. Create one first.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleCategorySelection(category.id)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          itemFormData.categoryIds.includes(category.id)
                            ? 'bg-[#F15929] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editQuantityTotal">Total Quantity *</Label>
                <Input 
                  id="editQuantityTotal" 
                  type="number" 
                  className="h-10" 
                  value={itemFormData.quantityTotal}
                  onChange={(e) => setItemFormData({...itemFormData, quantityTotal: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editQuantityAvailable">Available Quantity *</Label>
                <Input 
                  id="editQuantityAvailable" 
                  type="number" 
                  className="h-10" 
                  value={itemFormData.quantityAvailable}
                  onChange={(e) => setItemFormData({...itemFormData, quantityAvailable: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editPricePerDayPc">Price/Day (RM)</Label>
                <Input 
                  id="editPricePerDayPc" 
                  type="number" 
                  step="0.01"
                  className="h-10" 
                  value={itemFormData.pricePerDayPc}
                  onChange={(e) => setItemFormData({...itemFormData, pricePerDayPc: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPricePerItem">Price/Item (RM)</Label>
                <Input 
                  id="editPricePerItem" 
                  type="number" 
                  step="0.01"
                  className="h-10" 
                  value={itemFormData.pricePerItem}
                  onChange={(e) => setItemFormData({...itemFormData, pricePerItem: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editReplacementPerItem">Replacement (RM)</Label>
                <Input 
                  id="editReplacementPerItem" 
                  type="number" 
                  step="0.01"
                  className="h-10" 
                  value={itemFormData.replacementPerItem}
                  onChange={(e) => setItemFormData({...itemFormData, replacementPerItem: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editStatus">Status</Label>
              <Select
                value={itemFormData.status}
                onValueChange={(value) => setItemFormData({...itemFormData, status: value as InventoryItem['status']})}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Unavailable">Unavailable</SelectItem>
                  <SelectItem value="Discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1" 
                onClick={() => {
                  setIsEditItemDialogOpen(false);
                  setSelectedItem(null);
                  resetItemForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                className="flex-1 bg-[#F15929] hover:bg-[#d94d1f]" 
                onClick={handleUpdateItem}
                disabled={isSavingItem}
              >
                {isSavingItem ? (
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
