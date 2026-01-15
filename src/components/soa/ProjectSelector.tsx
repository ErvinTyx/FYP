import { useState } from "react";
import { Search, Calendar, User, Briefcase } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Project, Customer } from "../../types/statementOfAccount";

interface ProjectSelectorProps {
  customers: Customer[];
  projects: Project[];
  selectedCustomer: Customer | null;
  selectedProject: Project | null;
  onCustomerChange: (customer: Customer) => void;
  onProjectChange: (project: Project) => void;
}

export function ProjectSelector({
  customers,
  projects,
  selectedCustomer,
  selectedProject,
  onCustomerChange,
  onProjectChange,
}: ProjectSelectorProps) {
  return (
    <Card className="border-[#E5E7EB]">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Project Selector - Now the primary selector */}
          <div>
            <label className="text-sm text-[#374151] mb-2 block">
              Select Project
            </label>
            <Select
              value={selectedProject?.id}
              onValueChange={(value) => {
                const project = projects.find((p) => p.id === value);
                if (project) {
                  onProjectChange(project);
                  // Auto-select the customer for this project
                  const customer = customers.find((c) => c.id === project.customerId);
                  if (customer) onCustomerChange(customer);
                }
              }}
            >
              <SelectTrigger className="w-full h-10 border-[#D1D5DB] rounded-md">
                <SelectValue placeholder="Choose a project to view its statement of account" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex flex-col">
                      <span>{project.projectName}</span>
                      <span className="text-xs text-[#6B7280]">
                        {project.id} · {project.customerName} · {project.status}
                      </span>
                    </div>
                  </SelectItem>
                ))}
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
                    {new Date(selectedProject.startDate).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    {selectedProject.endDate
                      ? `End: ${new Date(selectedProject.endDate).toLocaleDateString()}`
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