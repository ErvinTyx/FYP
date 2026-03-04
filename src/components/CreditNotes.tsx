import { CreditNotesMain } from "./credit-notes/CreditNotesMain";

type SOANavigationAction = "view" | "viewDocument" | "downloadReceipt";

interface CreditNotesProps {
  userRole?: "super_user" | "Admin" | "Finance" | "Sales" | "Viewer" | "Other";
  initialOpenFromSOA?: { entityId: string; action: SOANavigationAction } | null;
  onConsumedSOANavigation?: () => void;
}

export function CreditNotes({ userRole = "Other", initialOpenFromSOA, onConsumedSOANavigation }: CreditNotesProps) {
  return (
    <CreditNotesMain
      userRole={userRole}
      initialOpenFromSOA={initialOpenFromSOA}
      onConsumedSOANavigation={onConsumedSOANavigation}
    />
  );
}