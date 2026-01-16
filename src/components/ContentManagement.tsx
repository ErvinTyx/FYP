import { useState } from "react";
import {
  FileText,
  HelpCircle,
  FileCheck,
  MapPin,
  Image as ImageIcon,
  Shield,
  Megaphone,
  ClipboardCheck,
  MapPinned,
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Eye,
  Save,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Switch } from "./ui/switch";
import { toast } from "sonner";

type ContentType =
  | "about"
  | "faq"
  | "terms"
  | "delivery-zones"
  | "banners"
  | "safety"
  | "announcements"
  | "permits"
  | "site-access"
  | "blogs";

interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  content: string;
  status: "published" | "draft";
  lastUpdated: string;
  updatedBy: string;
  metadata?: {
    imageUrl?: string;
    priority?: number;
    zone?: string;
    price?: string;
    question?: string;
    answer?: string;
  };
}

const contentCategories = [
  {
    id: "about" as ContentType,
    label: "About Us",
    icon: FileText,
    description: "Company information and history",
  },
  {
    id: "faq" as ContentType,
    label: "FAQs",
    icon: HelpCircle,
    description: "Frequently asked questions",
  },
  {
    id: "terms" as ContentType,
    label: "Terms & Conditions",
    icon: FileCheck,
    description: "Legal terms and policies",
  },
  {
    id: "delivery-zones" as ContentType,
    label: "Delivery Zones & Pricing",
    icon: MapPin,
    description: "Service areas and delivery costs",
  },
  {
    id: "banners" as ContentType,
    label: "Promotional Banners",
    icon: ImageIcon,
    description: "Marketing and promotional content",
  },
  {
    id: "safety" as ContentType,
    label: "Safety Guidelines",
    icon: Shield,
    description: "Safety protocols and guidelines",
  },
  {
    id: "announcements" as ContentType,
    label: "Announcements",
    icon: Megaphone,
    description: "Company news and updates",
  },
  {
    id: "permits" as ContentType,
    label: "Permits",
    icon: ClipboardCheck,
    description: "Required permits and documentation",
  },
  {
    id: "site-access" as ContentType,
    label: "Site Access Instructions",
    icon: MapPinned,
    description: "Access procedures and requirements",
  },
  {
    id: "blogs" as ContentType,
    label: "Blogs",
    icon: BookOpen,
    description: "Industry insights and articles",
  },
];

// Mock data
const mockContentItems: ContentItem[] = [
  {
    id: "1",
    type: "about",
    title: "About Our Company",
    content:
      "We are a leading provider of scaffolding solutions with over 20 years of experience in the construction industry. Our commitment to safety and quality has made us the trusted choice for contractors across the region.",
    status: "published",
    lastUpdated: "2025-11-10",
    updatedBy: "Admin User",
  },
  {
    id: "2",
    type: "faq",
    title: "What is your delivery time?",
    content: "Typically 24-48 hours for standard orders",
    status: "published",
    lastUpdated: "2025-11-08",
    updatedBy: "Support Team",
    metadata: {
      question: "What is your delivery time?",
      answer: "Typically 24-48 hours for standard orders in covered zones.",
    },
  },
  {
    id: "3",
    type: "delivery-zones",
    title: "Zone A - City Center",
    content: "Downtown and surrounding areas",
    status: "published",
    lastUpdated: "2025-11-05",
    updatedBy: "Operations Team",
    metadata: {
      zone: "Zone A",
      price: "$150",
    },
  },
  {
    id: "4",
    type: "banners",
    title: "Winter Promotion 2025",
    content: "Get 20% off on all scaffolding rentals this winter season!",
    status: "published",
    lastUpdated: "2025-11-12",
    updatedBy: "Marketing Team",
    metadata: {
      priority: 1,
      imageUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5",
    },
  },
  {
    id: "5",
    type: "safety",
    title: "Scaffolding Safety Guidelines",
    content:
      "Always ensure proper anchoring and load distribution. Never exceed weight limits. Use personal protective equipment at all times.",
    status: "published",
    lastUpdated: "2025-11-01",
    updatedBy: "Safety Officer",
  },
  {
    id: "6",
    type: "announcements",
    title: "Holiday Schedule",
    content:
      "Our offices will be closed on December 25-26. Emergency services available 24/7.",
    status: "draft",
    lastUpdated: "2025-11-11",
    updatedBy: "Admin User",
  },
  {
    id: "7",
    type: "blogs",
    title: "Best Practices for Scaffolding Installation",
    content:
      "In this article, we explore the essential steps and considerations for safe and efficient scaffolding installation on construction sites...",
    status: "published",
    lastUpdated: "2025-11-09",
    updatedBy: "Content Team",
  },
];

export function ContentManagement() {
  const [selectedCategory, setSelectedCategory] = useState<ContentType>("about");
  const [contentItems, setContentItems] = useState<ContentItem[]>(mockContentItems);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<ContentItem | null>(null);
  const [isNewItem, setIsNewItem] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formStatus, setFormStatus] = useState<"published" | "draft">("draft");
  const [formMetadata, setFormMetadata] = useState<any>({});

  const filteredItems = contentItems.filter((item) => item.type === selectedCategory);

  const handleCreate = () => {
    setIsNewItem(true);
    setCurrentItem(null);
    setFormTitle("");
    setFormContent("");
    setFormStatus("draft");
    setFormMetadata({});
    setIsEditorOpen(true);
  };

  const handleEdit = (item: ContentItem) => {
    setIsNewItem(false);
    setCurrentItem(item);
    setFormTitle(item.title);
    setFormContent(item.content);
    setFormStatus(item.status);
    setFormMetadata(item.metadata || {});
    setIsEditorOpen(true);
  };

  const handleView = (item: ContentItem) => {
    setCurrentItem(item);
    setIsViewerOpen(true);
  };

  const handleDelete = (id: string) => {
    setContentItems(contentItems.filter((item) => item.id !== id));
    toast.success("Content deleted successfully");
  };

  const handleSave = () => {
    if (!formTitle || !formContent) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (isNewItem) {
      const newItem: ContentItem = {
        id: Date.now().toString(),
        type: selectedCategory,
        title: formTitle,
        content: formContent,
        status: formStatus,
        lastUpdated: new Date().toISOString().split("T")[0],
        updatedBy: "Current User",
        metadata: formMetadata,
      };
      setContentItems([...contentItems, newItem]);
      toast.success("Content created successfully");
    } else if (currentItem) {
      setContentItems(
        contentItems.map((item) =>
          item.id === currentItem.id
            ? {
                ...item,
                title: formTitle,
                content: formContent,
                status: formStatus,
                lastUpdated: new Date().toISOString().split("T")[0],
                metadata: formMetadata,
              }
            : item
        )
      );
      toast.success("Content updated successfully");
    }

    setIsEditorOpen(false);
  };

  const getCategoryInfo = () => {
    return contentCategories.find((cat) => cat.id === selectedCategory);
  };

  const renderMetadataFields = () => {
    switch (selectedCategory) {
      case "faq":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                value={formMetadata.question || ""}
                onChange={(e) =>
                  setFormMetadata({ ...formMetadata, question: e.target.value })
                }
                placeholder="Enter the question"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer">Answer</Label>
              <Textarea
                id="answer"
                value={formMetadata.answer || ""}
                onChange={(e) =>
                  setFormMetadata({ ...formMetadata, answer: e.target.value })
                }
                placeholder="Enter the answer"
                rows={4}
              />
            </div>
          </>
        );
      case "delivery-zones":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="zone">Zone Name</Label>
              <Input
                id="zone"
                value={formMetadata.zone || ""}
                onChange={(e) =>
                  setFormMetadata({ ...formMetadata, zone: e.target.value })
                }
                placeholder="e.g., Zone A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Delivery Price</Label>
              <Input
                id="price"
                value={formMetadata.price || ""}
                onChange={(e) =>
                  setFormMetadata({ ...formMetadata, price: e.target.value })
                }
                placeholder="e.g., $150"
              />
            </div>
          </>
        );
      case "banners":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Banner Image URL</Label>
              <Input
                id="imageUrl"
                value={formMetadata.imageUrl || ""}
                onChange={(e) =>
                  setFormMetadata({ ...formMetadata, imageUrl: e.target.value })
                }
                placeholder="Enter image URL"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority (1-10)</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                max="10"
                value={formMetadata.priority || ""}
                onChange={(e) =>
                  setFormMetadata({
                    ...formMetadata,
                    priority: parseInt(e.target.value),
                  })
                }
                placeholder="1"
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[#111827] mb-2">Content Management</h1>
        <p className="text-[#6B7280]">
          Create, update, and manage company-related content for the customer portal
        </p>
      </div>

      {/* Content Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Content Categories</CardTitle>
          <CardDescription>
            Select a category to view and manage its content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={selectedCategory}
            onValueChange={(value) => setSelectedCategory(value as ContentType)}
          >
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-2 h-auto p-2">
              {contentCategories.map((category) => {
                const Icon = category.icon;
                const count = contentItems.filter(
                  (item) => item.type === category.id
                ).length;
                return (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="flex flex-col items-center gap-1 p-3 h-auto data-[state=active]:bg-[#1E40AF] data-[state=active]:text-white"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs text-center">{category.label}</span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0.5 min-w-[20px]"
                    >
                      {count}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {contentCategories.map((category) => (
              <TabsContent
                key={category.id}
                value={category.id}
                className="mt-6 space-y-4"
              >
                {/* Category Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-[#111827] mb-1">{category.label}</h3>
                    <p className="text-[#6B7280] text-sm">{category.description}</p>
                  </div>
                  <Button
                    onClick={handleCreate}
                    className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New
                  </Button>
                </div>

                {/* Content List */}
                {filteredItems.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <category.icon className="h-12 w-12 text-[#9CA3AF] mb-4" />
                      <p className="text-[#6B7280] mb-4">
                        No content available for this category
                      </p>
                      <Button
                        onClick={handleCreate}
                        variant="outline"
                        className="border-[#1E40AF] text-[#1E40AF]"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Item
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#F9FAFB]">
                          <TableHead>Title</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Updated</TableHead>
                          <TableHead>Updated By</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="text-[#111827]">{item.title}</p>
                                <p className="text-sm text-[#6B7280] line-clamp-1">
                                  {item.content}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  item.status === "published"
                                    ? "default"
                                    : "secondary"
                                }
                                className={
                                  item.status === "published"
                                    ? "bg-[#059669] hover:bg-[#047857]"
                                    : ""
                                }
                              >
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-[#6B7280]">
                              {new Date(item.lastUpdated).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-[#6B7280]">
                              {item.updatedBy}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleView(item)}
                                  className="h-8 w-8"
                                >
                                  <Eye className="h-4 w-4 text-[#6B7280]" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(item)}
                                  className="h-8 w-8"
                                >
                                  <Edit className="h-4 w-4 text-[#1E40AF]" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(item.id)}
                                  className="h-8 w-8"
                                >
                                  <Trash2 className="h-4 w-4 text-[#DC2626]" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isNewItem ? "Create New" : "Edit"} {getCategoryInfo()?.label}
            </DialogTitle>
            <DialogDescription>
              {isNewItem ? "Add new content to" : "Update content for"}{" "}
              {getCategoryInfo()?.label.toLowerCase()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-[#DC2626]">*</span>
              </Label>
              <Input
                id="title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Enter content title"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">
                Content <span className="text-[#DC2626]">*</span>
              </Label>
              <Textarea
                id="content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Enter content details"
                rows={8}
                className="resize-none"
              />
            </div>

            {/* Category-specific metadata fields */}
            {renderMetadataFields()}

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="status"
                    checked={formStatus === "published"}
                    onCheckedChange={(checked) =>
                      setFormStatus(checked ? "published" : "draft")
                    }
                  />
                  <Label htmlFor="status" className="cursor-pointer">
                    {formStatus === "published" ? "Published" : "Draft"}
                  </Label>
                </div>
                <p className="text-sm text-[#6B7280]">
                  {formStatus === "published"
                    ? "Visible to customers"
                    : "Hidden from customers"}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditorOpen(false)}
              className="border-[#E5E7EB]"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Viewer Dialog */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentItem?.title}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant={
                    currentItem?.status === "published" ? "default" : "secondary"
                  }
                  className={
                    currentItem?.status === "published"
                      ? "bg-[#059669] hover:bg-[#047857]"
                      : ""
                  }
                >
                  {currentItem?.status}
                </Badge>
                <span className="text-[#6B7280]">•</span>
                <span>
                  Updated on{" "}
                  {currentItem?.lastUpdated &&
                    new Date(currentItem.lastUpdated).toLocaleDateString()}
                </span>
                <span className="text-[#6B7280]">•</span>
                <span>by {currentItem?.updatedBy}</span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Banner preview */}
            {currentItem?.type === "banners" && currentItem.metadata?.imageUrl && (
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={currentItem.metadata.imageUrl}
                  alt={currentItem.title}
                  className="w-full h-48 object-cover"
                />
              </div>
            )}

            {/* FAQ format */}
            {currentItem?.type === "faq" && currentItem.metadata && (
              <div className="space-y-3">
                <div>
                  <Label className="text-[#6B7280]">Question</Label>
                  <p className="text-[#111827] mt-1">
                    {currentItem.metadata.question}
                  </p>
                </div>
                <div>
                  <Label className="text-[#6B7280]">Answer</Label>
                  <p className="text-[#111827] mt-1">
                    {currentItem.metadata.answer}
                  </p>
                </div>
              </div>
            )}

            {/* Delivery zone format */}
            {currentItem?.type === "delivery-zones" && currentItem.metadata && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#6B7280]">Zone</Label>
                  <p className="text-[#111827] mt-1">{currentItem.metadata.zone}</p>
                </div>
                <div>
                  <Label className="text-[#6B7280]">Price</Label>
                  <p className="text-[#111827] mt-1">{currentItem.metadata.price}</p>
                </div>
              </div>
            )}

            {/* Content */}
            <div>
              <Label className="text-[#6B7280]">Content</Label>
              <div className="mt-2 p-4 bg-[#F9FAFB] rounded-lg border">
                <p className="text-[#111827] whitespace-pre-wrap">
                  {currentItem?.content}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewerOpen(false)}
              className="border-[#E5E7EB]"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setIsViewerOpen(false);
                if (currentItem) handleEdit(currentItem);
              }}
              className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
