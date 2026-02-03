import { CreditNotesMain } from "./credit-notes/CreditNotesMain";

type SOANavigationAction = "view" | "viewDocument" | "downloadReceipt";

interface CreditNotesProps {
  initialOpenFromSOA?: { entityId: string; action: SOANavigationAction } | null;
  onConsumedSOANavigation?: () => void;
}

export function CreditNotes({ initialOpenFromSOA, onConsumedSOANavigation }: CreditNotesProps) {
  return (
    <CreditNotesMain
      initialOpenFromSOA={initialOpenFromSOA}
      onConsumedSOANavigation={onConsumedSOANavigation}
    />
  );
}