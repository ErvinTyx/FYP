import { useState } from "react";
import { Truck, Package, Calendar as CalendarIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";

interface Delivery {
  id: string;
  customer: string;
  items: number;
  date: string;
  timeSlot: string;
  status: 'Scheduled' | 'In Transit' | 'Delivered' | 'Failed';
  address: string;
}

interface Return {
  id: string;
  customer: string;
  items: number;
  date: string;
  status: 'Requested' | 'Approved' | 'In Transit' | 'Received';
  condition: 'Good' | 'Damaged' | 'Needs Repair';
}

const mockDeliveries: Delivery[] = [
  {
    id: 'DEL-2024-001',
    customer: 'Acme Construction',
    items: 15,
    date: '2024-11-05',
    timeSlot: '09:00 - 12:00',
    status: 'Scheduled',
    address: 'Downtown Plaza, Main St'
  },
  {
    id: 'DEL-2024-002',
    customer: 'BuildRight Inc.',
    items: 8,
    date: '2024-11-04',
    timeSlot: '14:00 - 17:00',
    status: 'In Transit',
    address: 'Riverside Complex, Oak Ave'
  },
  {
    id: 'DEL-2024-003',
    customer: 'Metro Builders',
    items: 12,
    date: '2024-11-03',
    timeSlot: '09:00 - 12:00',
    status: 'Delivered',
    address: 'City Center Tower, Park Rd'
  },
];

const mockReturns: Return[] = [
  {
    id: 'RET-2024-001',
    customer: 'Premium Projects',
    items: 5,
    date: '2024-11-06',
    status: 'Requested',
    condition: 'Good'
  },
  {
    id: 'RET-2024-002',
    customer: 'Skyline Developers',
    items: 3,
    date: '2024-11-05',
    status: 'Approved',
    condition: 'Damaged'
  },
];

export function DeliveryReturns() {
  const [deliveries] = useState<Delivery[]>(mockDeliveries);
  const [returns, setReturns] = useState<Return[]>(mockReturns);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");

  const getDeliveryStatusBadge = (status: Delivery['status']) => {
    switch (status) {
      case 'Scheduled':
        return <Badge className="bg-[#3B82F6] hover:bg-[#2563EB]">Scheduled</Badge>;
      case 'In Transit':
        return <Badge className="bg-[#F59E0B] hover:bg-[#D97706]">In Transit</Badge>;
      case 'Delivered':
        return <Badge className="bg-[#059669] hover:bg-[#047857]">Delivered</Badge>;
      case 'Failed':
        return <Badge className="bg-[#DC2626] hover:bg-[#B91C1C]">Failed</Badge>;
    }
  };

  const getReturnStatusBadge = (status: Return['status']) => {
    switch (status) {
      case 'Requested':
        return <Badge className="bg-[#3B82F6] hover:bg-[#2563EB]">Requested</Badge>;
      case 'Approved':
        return <Badge className="bg-[#059669] hover:bg-[#047857]">Approved</Badge>;
      case 'In Transit':
        return <Badge className="bg-[#F59E0B] hover:bg-[#D97706]">In Transit</Badge>;
      case 'Received':
        return <Badge className="bg-[#6B7280] hover:bg-[#4B5563]">Received</Badge>;
    }
  };

  const getConditionBadge = (condition: Return['condition']) => {
    switch (condition) {
      case 'Good':
        return <Badge className="bg-[#059669] hover:bg-[#047857]">Good</Badge>;
      case 'Damaged':
        return <Badge className="bg-[#DC2626] hover:bg-[#B91C1C]">Damaged</Badge>;
      case 'Needs Repair':
        return <Badge className="bg-[#F59E0B] hover:bg-[#D97706]">Needs Repair</Badge>;
    }
  };

  const handleScheduleDelivery = () => {
    toast.success("Delivery scheduled successfully!");
    setIsScheduleOpen(false);
  };

  const handleProcessReturn = (id: string) => {
    setReturns(returns.map(ret => 
      ret.id === id ? { ...ret, status: 'Approved' as Return['status'] } : ret
    ));
    toast.success("Return approved and processed!");
    setIsReturnOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1>Delivery & Returns Management</h1>
        <p className="text-[#374151]">Schedule deliveries and process returns</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Today's Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-[#3B82F6]" />
              <p className="text-[#111827]">3</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#F59E0B]">{deliveries.filter(d => d.status === 'In Transit').length}</p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Pending Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[#F59E0B]" />
              <p className="text-[#111827]">{returns.filter(r => r.status === 'Requested').length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Completed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#059669]">{deliveries.filter(d => d.status === 'Delivered').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Deliveries Section */}
      <Card className="border-[#E5E7EB]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[18px]">Deliveries</CardTitle>
          <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1E40AF] hover:bg-[#1E3A8A] h-10 px-6 rounded-lg">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Schedule Delivery
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Schedule Delivery</DialogTitle>
                <DialogDescription>
                  Select delivery date and time slot
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label>Customer Order</Label>
                  <Input value="ORD-2024-045 - Acme Construction" disabled className="h-10" />
                </div>
                
                <div className="space-y-2">
                  <Label>Delivery Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full h-10 justify-start text-left"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Time Slot</Label>
                  <RadioGroup value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-[#F3F4F6] cursor-pointer">
                      <RadioGroupItem value="morning" id="morning" />
                      <Label htmlFor="morning" className="cursor-pointer flex-1">
                        Morning (09:00 - 12:00)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-[#F3F4F6] cursor-pointer">
                      <RadioGroupItem value="afternoon" id="afternoon" />
                      <Label htmlFor="afternoon" className="cursor-pointer flex-1">
                        Afternoon (14:00 - 17:00)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Delivery Address</Label>
                  <Textarea 
                    id="address"
                    placeholder="Enter delivery address"
                    className="min-h-[80px]"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsScheduleOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" className="flex-1 bg-[#1E40AF] hover:bg-[#1E3A8A]" onClick={handleScheduleDelivery}>
                    Confirm Schedule
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Delivery ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time Slot</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((delivery) => (
                <TableRow key={delivery.id} className="h-14 hover:bg-[#F3F4F6]">
                  <TableCell className="text-[#111827]">{delivery.id}</TableCell>
                  <TableCell className="text-[#374151]">{delivery.customer}</TableCell>
                  <TableCell className="text-[#374151]">{delivery.items} items</TableCell>
                  <TableCell className="text-[#374151]">{delivery.date}</TableCell>
                  <TableCell className="text-[#374151]">{delivery.timeSlot}</TableCell>
                  <TableCell>{getDeliveryStatusBadge(delivery.status)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      Track
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Returns Section */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Returns Processing</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Return ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.map((returnItem) => (
                <TableRow key={returnItem.id} className="h-14 hover:bg-[#F3F4F6]">
                  <TableCell className="text-[#111827]">{returnItem.id}</TableCell>
                  <TableCell className="text-[#374151]">{returnItem.customer}</TableCell>
                  <TableCell className="text-[#374151]">{returnItem.items} items</TableCell>
                  <TableCell className="text-[#374151]">{returnItem.date}</TableCell>
                  <TableCell>{getConditionBadge(returnItem.condition)}</TableCell>
                  <TableCell>{getReturnStatusBadge(returnItem.status)}</TableCell>
                  <TableCell>
                    {returnItem.status === 'Requested' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleProcessReturn(returnItem.id)}
                      >
                        Process
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delivery Tracking Timeline */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Delivery Tracking - DEL-2024-002</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <CheckCircle2 className="h-6 w-6 text-[#059669]" />
              </div>
              <div className="flex-1">
                <h4 className="text-[#111827]">Order Confirmed</h4>
                <p className="text-[12px] text-[#6B7280]">November 4, 2024 at 8:30 AM</p>
              </div>
            </div>
            <div className="ml-3 border-l-2 border-[#E5E7EB] h-6"></div>
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <CheckCircle2 className="h-6 w-6 text-[#059669]" />
              </div>
              <div className="flex-1">
                <h4 className="text-[#111827]">Items Prepared</h4>
                <p className="text-[12px] text-[#6B7280]">November 4, 2024 at 9:15 AM</p>
              </div>
            </div>
            <div className="ml-3 border-l-2 border-[#E5E7EB] h-6"></div>
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <div className="h-6 w-6 bg-[#F59E0B] rounded-full flex items-center justify-center">
                  <Truck className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-[#111827]">Out for Delivery</h4>
                <p className="text-[12px] text-[#6B7280]">November 4, 2024 at 2:00 PM</p>
                <p className="text-[12px] text-[#F59E0B] mt-1">Driver: John Smith - Contact: +60 12-345-6789</p>
              </div>
            </div>
            <div className="ml-3 border-l-2 border-dashed border-[#E5E7EB] h-6"></div>
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <div className="h-6 w-6 border-2 border-[#E5E7EB] rounded-full"></div>
              </div>
              <div className="flex-1">
                <h4 className="text-[#6B7280]">Delivered</h4>
                <p className="text-[12px] text-[#6B7280]">Expected: 2:00 PM - 5:00 PM</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
