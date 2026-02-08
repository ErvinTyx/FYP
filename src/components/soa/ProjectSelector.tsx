import { useState, useMemo, useEffect } from "react";
import { Calendar, User, Briefcase, Loader2 } from "lucide-react";
import { formatRfqDate } from "../../lib/rfqDate";
import { Card, CardContent } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";
import { Project, Customer } from "../../types/statementOfAccount";

interface ProjectSelectorProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  customers: Customer[];
  projects: Project[];
  selectedCustomer: Customer | null;
  selectedProject: Project | null;
  onCustomerChange: (customer: Customer) => void;
  onProjectChange: (project: Project) => void;
  loadingProjects?: boolean;
}

export function ProjectSelector({
  searchQuery = "",
  onSearchChange,
  customers,
  projects,
  selectedCustomer,
  selectedProject,
  onCustomerChange,
  onProjectChange,
  loadingProjects = false,
}: ProjectSelectorProps) {
  const [localSelectedCustomerId, setLocalSelectedCustomerId] = useState<string | null>(selectedCustomer?.id || null);

  // Sync local state with prop
  useEffect(() => {
    setLocalSelectedCustomerId(selectedCustomer?.id || null);
  }, [selectedCustomer?.id]);

  // Filter projects based on selected customer
  const filteredProjects = useMemo(() => {
    if (!localSelectedCustomerId) {
      return projects;
    }
    return projects.filter((p) => p.customerId === localSelectedCustomerId);
  }, [projects, localSelectedCustomerId]);

  // Filter customers based on search query
  const filteredCustomers = useMemo(() => {
    if (!searchQuery?.trim()) {
      return customers;
    }
    const query = searchQuery.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setLocalSelectedCustomerId(customerId);
      onCustomerChange(customer);
      // Note: Project selection is not cleared - user can still select a project directly
    }
  };

  const handleProjectSelect = (projectId: string) => {
    const project = filteredProjects.find((p) => p.id === projectId);
    if (project) {
      onProjectChange(project);
      // Auto-select the customer for this project
      const customer = customers.find((c) => c.id === project.customerId);
      if (customer) {
        setLocalSelectedCustomerId(customer.id);
        onCustomerChange(customer);
      }
    }
  };

  return (
    <Card className="border-[#E5E7EB]">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Customer search */}
          {onSearchChange && (
            <div>
              <label className="text-sm text-[#374151] mb-2 block">
                Search by customer email or name
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Type customer email or name..."
                  value={searchQuery}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    // Clear customer selection when search changes
                    if (e.target.value.trim() === "") {
                      setLocalSelectedCustomerId(null);
                    }
                  }}
                  className="h-10 border-[#D1D5DB] rounded-md"
                />
                {loadingProjects && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#F15929]" />
                )}
              </div>
              {/* Customer list - Show filtered customers below search */}
              {filteredCustomers.length > 0 && searchQuery.trim() && (
                <div className="mt-2 border border-[#E5E7EB] rounded-md bg-white max-h-48 overflow-y-auto">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => {
                        handleCustomerSelect(customer.id);
                        onSearchChange("");
                      }}
                      className={`px-4 py-3 cursor-pointer hover:bg-[#F9FAFB] border-b border-[#E5E7EB] last:border-b-0 ${
                        localSelectedCustomerId === customer.id
                          ? "bg-[#F0FDF4] border-l-4 border-l-[#059669]"
                          : ""
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-[#111827] font-medium">
                          {customer.name}
                        </span>
                        {customer.email && (
                          <span className="text-xs text-[#6B7280] mt-0.5">
                            {customer.email}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Selected customer indicator */}
              {localSelectedCustomerId && selectedCustomer && (
                <div className="mt-2 px-3 py-2 bg-[#F0FDF4] border border-[#059669] rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm text-[#047857] font-medium">
                        Selected: {selectedCustomer.name}
                      </span>
                      {selectedCustomer.email && (
                        <span className="text-xs text-[#6B7280] mt-0.5">
                          {selectedCustomer.email}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setLocalSelectedCustomerId(null);
                        onSearchChange("");
                      }}
                      className="text-xs text-[#059669] hover:text-[#047857] underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Project Selector */}
          <div>
            <label className="text-sm text-[#374151] mb-2 block">
              Select Project
            </label>
            <Select
              value={selectedProject?.id}
              disabled={loadingProjects}
              onValueChange={handleProjectSelect}
            >
              <SelectTrigger className="w-full h-10 border-[#D1D5DB] rounded-md">
                <SelectValue placeholder="Choose a project to view its statement of account" />
              </SelectTrigger>
              <SelectContent>
                {filteredProjects.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-[#6B7280]">
                    {localSelectedCustomerId
                      ? "No projects found for selected customer"
                      : "No projects available"}
                  </div>
                ) : (
                  filteredProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex flex-col">
                        <span>{project.projectName} - {project.status} {!localSelectedCustomerId && ( `- ${project.customerName}`)}</span>     
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Project Info Summary - Only show after project is selected */}
          {selectedProject && selectedCustomer && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[#F9FAFB] rounded-md border border-[#E5E7EB]">
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-[#F15929] mt-0.5" />
                <div>
                  <p className="text-xs text-[#6B7280]">Project Name</p>
                  <p className="text-[#231F20]">{selectedProject.projectName}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    ID: {selectedProject.id}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-[#F15929] mt-0.5" />
                <div>
                  <p className="text-xs text-[#6B7280]">Customer</p>
                  <p className="text-[#231F20]">{selectedCustomer.name}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    {selectedCustomer.type} · {selectedCustomer.id}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-[#F15929] mt-0.5" />
                <div>
                  <p className="text-xs text-[#6B7280]">Project Period</p>
                  <p className="text-[#231F20]">
                    {formatRfqDate(selectedProject.startDate)}
                  </p>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    {selectedProject.endDate
                      ? `End: ${formatRfqDate(selectedProject.endDate)}`
                      : "Ongoing"}
                  </p>
                </div>
              </div>

              <div className="md:col-span-3 flex items-center gap-2">
                <span className="text-xs text-[#6B7280]">Status:</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                    selectedProject.status === "Active"
                      ? "bg-[#D1FAE5] text-[#065F46]"
                      : selectedProject.status === "Completed"
                      ? "bg-[#DBEAFE] text-[#1E40AF]"
                      : selectedProject.status === "On Hold"
                      ? "bg-[#FEF3C7] text-[#92400E]"
                      : "bg-[#FEE2E2] text-[#991B1B]"
                  }`}
                >
                  {selectedProject.status}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}