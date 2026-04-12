export interface CustomerNameSource {
  firstName?: string | null;
  lastName?: string | null;
}

export function getCustomerDisplayName(
  customer: CustomerNameSource | null | undefined
): string {
  if (!customer) return "Unknown";
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ");
  return name || "Unknown";
}
