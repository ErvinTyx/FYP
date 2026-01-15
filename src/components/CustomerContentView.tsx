import { useState } from "react";
import {
  FileText,
  HelpCircle,
  FileCheck,
  MapPin,
  Shield,
  Megaphone,
  ClipboardCheck,
  MapPinned,
  BookOpen,
  ChevronRight,
  Search,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface ContentItem {
  id: string;
  type: string;
  title: string;
  content: string;
  status: "published" | "draft";
  lastUpdated: string;
  metadata?: {
    imageUrl?: string;
    priority?: number;
    zone?: string;
    price?: string;
    question?: string;
    answer?: string;
  };
}

// Mock published content (in real app, fetch only published items)
const mockPublishedContent: ContentItem[] = [
  {
    id: "1",
    type: "about",
    title: "About Our Company",
    content:
      "We are a leading provider of scaffolding solutions with over 20 years of experience in the construction industry. Our commitment to safety and quality has made us the trusted choice for contractors across the region.\n\nOur Mission:\nTo provide reliable, safe, and cost-effective scaffolding solutions that enable our clients to complete their projects efficiently and safely.\n\nOur Values:\n• Safety First - We never compromise on safety standards\n• Quality Service - Excellence in every interaction\n• Innovation - Constantly improving our offerings\n• Reliability - You can count on us, every time",
    status: "published",
    lastUpdated: "2025-11-10",
  },
  {
    id: "2",
    type: "faq",
    title: "Delivery Time",
    content: "",
    status: "published",
    lastUpdated: "2025-11-08",
    metadata: {
      question: "What is your typical delivery time?",
      answer:
        "Typically 24-48 hours for standard orders in covered zones. Rush delivery available upon request.",
    },
  },
  {
    id: "3",
    type: "faq",
    title: "Rental Period",
    content: "",
    status: "published",
    lastUpdated: "2025-11-08",
    metadata: {
      question: "What is the minimum rental period?",
      answer:
        "Our minimum rental period is one month. Monthly billing cycles apply with prorated calculations for partial months.",
    },
  },
  {
    id: "4",
    type: "faq",
    title: "Safety Certification",
    content: "",
    status: "published",
    lastUpdated: "2025-11-08",
    metadata: {
      question: "Are your scaffolding materials safety certified?",
      answer:
        "Yes, all our scaffolding equipment meets international safety standards and undergoes regular inspections.",
    },
  },
  {
    id: "5",
    type: "delivery-zones",
    title: "Zone A - City Center",
    content: "Downtown and surrounding areas including Central Business District",
    status: "published",
    lastUpdated: "2025-11-05",
    metadata: {
      zone: "Zone A",
      price: "$150",
    },
  },
  {
    id: "6",
    type: "delivery-zones",
    title: "Zone B - Suburbs",
    content: "Suburban areas within 25km radius",
    status: "published",
    lastUpdated: "2025-11-05",
    metadata: {
      zone: "Zone B",
      price: "$200",
    },
  },
  {
    id: "7",
    type: "delivery-zones",
    title: "Zone C - Extended Areas",
    content: "Areas 25-50km from city center",
    status: "published",
    lastUpdated: "2025-11-05",
    metadata: {
      zone: "Zone C",
      price: "$300",
    },
  },
  {
    id: "8",
    type: "banners",
    title: "Winter Promotion 2025",
    content: "Get 20% off on all scaffolding rentals this winter season!",
    status: "published",
    lastUpdated: "2025-11-12",
    metadata: {
      priority: 1,
      imageUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5",
    },
  },
  {
    id: "9",
    type: "safety",
    title: "General Safety Guidelines",
    content:
      "1. Inspection Before Use\n• Visually inspect all scaffolding components before assembly\n• Check for damage, rust, or wear\n• Report any defects immediately\n\n2. Proper Assembly\n• Follow manufacturer's assembly instructions\n• Ensure all connections are secure\n• Use base plates on solid, level ground\n• Install guardrails at all open sides\n\n3. Load Distribution\n• Never exceed maximum load capacity\n• Distribute weight evenly across platform\n• Account for workers, tools, and materials\n\n4. Personal Protective Equipment\n• Hard hats are mandatory\n• Non-slip footwear required\n• Use fall protection when working at height\n• Safety harnesses for heights above 6 feet",
    status: "published",
    lastUpdated: "2025-11-01",
  },
  {
    id: "10",
    type: "safety",
    title: "Weather Precautions",
    content:
      "Do not use scaffolding during:\n• High winds (over 25 mph)\n• Heavy rain or storms\n• Icy conditions\n• Poor visibility\n\nSecure all materials and equipment when adverse weather is expected.",
    status: "published",
    lastUpdated: "2025-11-01",
  },
  {
    id: "11",
    type: "announcements",
    title: "New Service Area Expansion",
    content:
      "We're excited to announce that we've expanded our service coverage to include the Northern Industrial Zone! Deliveries to this area are now available with standard pricing.",
    status: "published",
    lastUpdated: "2025-11-10",
  },
  {
    id: "12",
    type: "permits",
    title: "Street Occupancy Permit",
    content:
      "Required when scaffolding extends into public right-of-way.\n\nDocuments needed:\n• Site plan showing scaffolding location\n• Proof of liability insurance\n• Contractor license\n• Traffic management plan\n\nProcessing time: 5-7 business days\nFee: Varies by municipality",
    status: "published",
    lastUpdated: "2025-10-28",
  },
  {
    id: "13",
    type: "site-access",
    title: "Standard Site Access Procedure",
    content:
      "1. Delivery Coordination\n• Confirm delivery window 24 hours in advance\n• Provide site contact name and phone number\n• Ensure access route is clear\n\n2. Site Requirements\n• Level ground for unloading\n• Clear path to installation location\n• Adequate space for delivery vehicle\n• Access to water and power (if needed)\n\n3. Safety Briefing\n• Site-specific hazards review\n• PPE requirements\n• Emergency procedures\n• Site rules and regulations",
    status: "published",
    lastUpdated: "2025-10-15",
  },
  {
    id: "14",
    type: "blogs",
    title: "Best Practices for Scaffolding Installation",
    content:
      "In this comprehensive guide, we explore essential steps for safe and efficient scaffolding installation on construction sites.\n\nPlanning Phase:\nBefore installation begins, conduct a thorough site assessment. Identify potential hazards, overhead obstructions, and underground utilities. Plan the scaffolding layout to optimize workflow and safety.\n\nFoundation Preparation:\nThe foundation is critical for scaffolding stability. Ensure the ground is level, stable, and capable of supporting the anticipated loads. Use base plates and mud sills on soft ground.\n\nAssembly Best Practices:\n• Work systematically from one end to the other\n• Install components in correct sequence\n• Ensure all connections are properly secured\n• Add bracing as you build upward\n• Install safety features immediately\n\nFinal Inspection:\nBefore use, conduct a comprehensive inspection of the completed scaffolding system. Verify all connections, check plumb and level, and ensure all safety features are in place.",
    status: "published",
    lastUpdated: "2025-11-09",
  },
  {
    id: "15",
    type: "blogs",
    title: "Understanding Scaffolding Load Capacity",
    content:
      "Load capacity is one of the most critical factors in scaffolding safety. Understanding how to calculate and manage loads can prevent accidents and ensure project success.\n\nTypes of Loads:\n1. Dead Load - The weight of the scaffolding itself\n2. Live Load - Workers, tools, and materials\n3. Environmental Load - Wind, snow, ice\n\nLoad Classes:\n• Light Duty (25 psf) - Inspection and light work\n• Medium Duty (50 psf) - Plastering and painting\n• Heavy Duty (75 psf) - Masonry and heavy materials\n\nSafety Tips:\n• Never exceed the rated capacity\n• Account for dynamic loads (movement)\n• Distribute weight evenly\n• Remove debris regularly\n• Post load capacity signs",
    status: "published",
    lastUpdated: "2025-11-07",
  },
  {
    id: "16",
    type: "terms",
    title: "Terms and Conditions",
    content:
      "SCAFFOLDING RENTAL AGREEMENT\n\n1. RENTAL TERMS\n1.1 Minimum rental period is one (1) month\n1.2 Billing is monthly with prorated calculations for partial months\n1.3 Rental begins upon delivery and ends upon pickup\n\n2. PAYMENT TERMS\n2.1 Deposit required before delivery\n2.2 Monthly rental invoiced at start of each period\n2.3 Payment due within 14 days of invoice date\n2.4 Late payments subject to 1.5% monthly interest\n\n3. CUSTOMER RESPONSIBILITIES\n3.1 Ensure site access for delivery and pickup\n3.2 Provide safe working environment\n3.3 Use equipment in accordance with safety guidelines\n3.4 Maintain equipment in good condition\n3.5 Report damage or issues immediately\n\n4. LIABILITY\n4.1 Customer assumes liability once equipment is delivered\n4.2 Customer responsible for loss, damage, or theft\n4.3 Customer must maintain adequate insurance\n\n5. TERMINATION\n5.1 Either party may terminate with 7 days written notice\n5.2 Early termination may incur fees\n5.3 Equipment must be returned in original condition\n\n6. INDEMNIFICATION\nCustomer agrees to indemnify and hold harmless the Company from any claims arising from equipment use.\n\nBy accepting delivery, customer agrees to these terms and conditions.",
    status: "published",
    lastUpdated: "2025-10-01",
  },
];

export function CustomerContentView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("info");

  const filterContent = (type: string) => {
    return mockPublishedContent
      .filter((item) => item.type === type)
      .filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
  };

  const banners = filterContent("banners");
  const aboutContent = filterContent("about");
  const faqs = filterContent("faq");
  const terms = filterContent("terms");
  const deliveryZones = filterContent("delivery-zones");
  const safetyGuidelines = filterContent("safety");
  const announcements = filterContent("announcements");
  const permits = filterContent("permits");
  const siteAccess = filterContent("site-access");
  const blogs = filterContent("blogs");

  return (
    <div className="space-y-6">
      {/* Promotional Banners */}
      {banners.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map((banner) => (
            <Card key={banner.id} className="overflow-hidden border-[#059669]">
              {banner.metadata?.imageUrl && (
                <div className="h-40 overflow-hidden">
                  <img
                    src={banner.metadata.imageUrl}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader className="bg-gradient-to-r from-[#059669] to-[#047857]">
                <CardTitle className="text-white">{banner.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-[#111827]">{banner.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <Card className="border-[#F59E0B]">
          <CardHeader className="bg-[#FEF3C7] border-b border-[#F59E0B]">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-[#F59E0B]" />
              <CardTitle className="text-[#92400E]">Latest Announcements</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="p-4 bg-[#FFFBEB] rounded-lg border border-[#FDE68A]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="text-[#111827] mb-1">{announcement.title}</h4>
                    <p className="text-[#6B7280] text-sm">{announcement.content}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {new Date(announcement.lastUpdated).toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Information Center</CardTitle>
          <CardDescription>
            Find information about our services, policies, and guidelines
          </CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <Input
              placeholder="Search for information..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="info">
            <FileText className="h-4 w-4 mr-2" />
            About
          </TabsTrigger>
          <TabsTrigger value="faq">
            <HelpCircle className="h-4 w-4 mr-2" />
            FAQs
          </TabsTrigger>
          <TabsTrigger value="delivery">
            <MapPin className="h-4 w-4 mr-2" />
            Delivery
          </TabsTrigger>
          <TabsTrigger value="safety">
            <Shield className="h-4 w-4 mr-2" />
            Safety
          </TabsTrigger>
          <TabsTrigger value="permits">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Permits
          </TabsTrigger>
          <TabsTrigger value="access">
            <MapPinned className="h-4 w-4 mr-2" />
            Site Access
          </TabsTrigger>
          <TabsTrigger value="blogs">
            <BookOpen className="h-4 w-4 mr-2" />
            Blogs
          </TabsTrigger>
          <TabsTrigger value="terms">
            <FileCheck className="h-4 w-4 mr-2" />
            Terms
          </TabsTrigger>
        </TabsList>

        {/* About Us */}
        <TabsContent value="info" className="space-y-4">
          {aboutContent.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-[#374151]">{item.content}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* FAQs */}
        <TabsContent value="faq">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>
                Find answers to common questions about our scaffolding services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={faq.id} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.metadata?.question || faq.title}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-[#6B7280]">
                        {faq.metadata?.answer || faq.content}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Zones */}
        <TabsContent value="delivery">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Zones & Pricing</CardTitle>
              <CardDescription>
                Our service areas and delivery rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {deliveryZones.map((zone) => (
                  <Card key={zone.id} className="border-[#1E40AF]">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-[#1E40AF]">
                          {zone.metadata?.zone}
                        </CardTitle>
                        <Badge className="bg-[#1E40AF] text-white">
                          {zone.metadata?.price}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-[#6B7280] text-sm">{zone.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Safety Guidelines */}
        <TabsContent value="safety" className="space-y-4">
          {safetyGuidelines.map((guide) => (
            <Card key={guide.id} className="border-[#DC2626]">
              <CardHeader className="bg-[#FEE2E2]">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[#DC2626]" />
                  <CardTitle className="text-[#991B1B]">{guide.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-[#374151]">{guide.content}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Permits */}
        <TabsContent value="permits" className="space-y-4">
          {permits.map((permit) => (
            <Card key={permit.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-[#1E40AF]" />
                  <CardTitle>{permit.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-[#374151]">{permit.content}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Site Access */}
        <TabsContent value="access" className="space-y-4">
          {siteAccess.map((access) => (
            <Card key={access.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MapPinned className="h-5 w-5 text-[#059669]" />
                  <CardTitle>{access.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-[#374151]">{access.content}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Blogs */}
        <TabsContent value="blogs" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {blogs.map((blog) => (
              <Card key={blog.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-[#111827]">{blog.title}</CardTitle>
                    <Badge variant="outline" className="shrink-0">
                      {new Date(blog.lastUpdated).toLocaleDateString()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-[#6B7280] line-clamp-3">{blog.content}</p>
                  <Button
                    variant="outline"
                    className="w-full border-[#1E40AF] text-[#1E40AF] hover:bg-[#1E40AF] hover:text-white"
                  >
                    Read More
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Terms & Conditions */}
        <TabsContent value="terms">
          {terms.map((term) => (
            <Card key={term.id}>
              <CardHeader>
                <CardTitle>{term.title}</CardTitle>
                <CardDescription>
                  Last updated: {new Date(term.lastUpdated).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-[#374151]">{term.content}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
