export const roles = {
  super_user: "super_user",
  admin: "admin",
  sales: "sales",
  finance: "finance",
  production: "production",
  operations: "operations",
  vendor: "vendor",
  customer: "customer",
} as const;

export type Role = (typeof roles)[keyof typeof roles];

export const roleLabels: Record<Role, string> = {
  super_user: "Super User",
  admin: "Admin",
  sales: "Sales",
  finance: "Finance",
  production: "Production",
  operations: "Operations",
  vendor: "Vendor",
  customer: "Customer",
};

// Role hierarchy - higher index = more privileges
export const roleHierarchy: Role[] = [
  "customer",
  "vendor",
  "sales",
  "finance",
  "production",
  "operations",
  "admin",
  "super_user",
];

export function hasHigherOrEqualRole(userRoles: Role[], requiredRole: Role): boolean {
  const requiredIndex = roleHierarchy.indexOf(requiredRole);
  return userRoles.some((role) => roleHierarchy.indexOf(role) >= requiredIndex);
}
