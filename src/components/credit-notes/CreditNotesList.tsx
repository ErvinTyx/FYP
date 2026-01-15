import { useState } from "react";
import { Search, Eye, Edit2, Trash2, MoreVertical } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { StatusBadge } from "./StatusBadge";
import { CreditNote } from "../../types/creditNote";

interface CreditNotesListProps {
  creditNotes: CreditNote[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CreditNotesList({
  creditNotes,
  onView,
  onEdit,
  onDelete,
}: CreditNotesListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredNotes = creditNotes.filter((note) => {
    const matchesSearch =
      note.creditNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || note.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalApproved = creditNotes
    .filter((note) => note.status === "Approved")
    .reduce((acc, note) => acc + note.amount, 0);

  const pendingAmount = creditNotes
    .filter((note) => note.status === "Pending Approval")
    .reduce((acc, note) => acc + note.amount, 0);

  const draftCount = creditNotes.filter((note) => note.status === "Draft").length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Total Credit Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#111827]">{creditNotes.length}</p>
            <p className="text-[12px] text-[#6B7280] mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Approved Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#111827]">RM{totalApproved.toLocaleString()}</p>
            <p className="text-[12px] text-[#059669] mt-1">Processed</p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#111827]">RM{pendingAmount.toLocaleString()}</p>
            <p className="text-[12px] text-[#F59E0B] mt-1">Awaiting review</p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] text-[#6B7280]">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#111827]">{draftCount}</p>
            <p className="text-[12px] text-[#6B7280] mt-1">Not submitted</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-[400px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input
            placeholder="Search by credit note # or customer..."
            className="pl-10 h-10 bg-white border-[#D1D5DB] rounded-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px] h-10 bg-white border-[#D1D5DB] rounded-md">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Pending Approval">Pending Approval</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[18px]">Credit Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                <TableHead>Customer</TableHead>
                <TableHead>Original Invoice</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-[#6B7280]">
                    No credit notes found
                  </TableCell>
                </TableRow>
              ) : (
                filteredNotes.map((note) => (
                  <TableRow key={note.id} className="h-14 hover:bg-[#F3F4F6]">
                    <TableCell className="text-[#374151]">{note.customer}</TableCell>
                    <TableCell className="text-[#374151]">
                      {note.originalInvoice}
                    </TableCell>
                    <TableCell className="text-[#111827]">
                      RM{note.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-[#F3F4F6] text-[#374151]">
                        {note.reason}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#374151]">
                      {new Date(note.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={note.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-[#F3F4F6]"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView(note.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          {note.status === "Draft" && (
                            <>
                              <DropdownMenuItem onClick={() => onEdit(note.id)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onDelete(note.id)}
                                className="text-[#DC2626] focus:text-[#DC2626]"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}