# ERD: User Management & Billing Module

## User Management ERD

```mermaid
erDiagram
    User {
        string id PK "CUID"
        string email UK
        string password
        string firstName
        string lastName
        string phone UK
        string status "pending|active|inactive|rejected"
        datetime createdAt
        datetime updatedAt
    }

    Customer {
        string id PK,FK "Same as User.id"
        string customerType "individual|business"
        string tin
        string idType "NRIC|PASSPORT|ARMY|BRN"
        string idNumber
        string identityDocumentUrl
        string rejectionReason
        datetime createdAt
        datetime updatedAt
    }

    Role {
        string id PK
        string name UK
        datetime createdAt
        datetime updatedAt
    }

    UserRole {
        string userId FK
        string roleId FK
    }

    PasswordSetupToken {
        string id PK
        string userId FK
        string token UK
        datetime expiresAt
        boolean used
        datetime createdAt
    }

    VerificationCode {
        string id PK
        string email
        string code
        datetime expiresAt
        boolean used
        datetime createdAt
    }

    User ||--|| Customer : "has profile"
    User ||--o{ UserRole : "assigned"
    Role ||--o{ UserRole : "assigned to"
    User ||--o{ PasswordSetupToken : "has"
```

---

## Billing Module ERD — Part 1a: Agreement Management

> Covers: Customer, RentalAgreement, AgreementItem, AgreementVersion, ProjectClosureRequest

```mermaid
erDiagram
    Customer {
        string id PK
        string customerType "individual|business"
        string tin
    }

    RentalAgreement {
        string id PK
        string agreementNumber UK
        string poNumber
        string projectName
        string owner
        string hirer
        string location
        string termOfHire
        int totalRentalMonth
        decimal monthlyRental
        decimal securityDeposit
        decimal minimumCharges
        decimal defaultInterest
        string status "Draft|Active|Closed"
        int currentVersion
        string createdBy
        datetime createdAt
        datetime updatedAt
    }

    AgreementItem {
        string id PK
        string agreementId FK
        string scaffoldingItemId
        string scaffoldingItemName
        decimal agreedMonthlyRate
        int minimumRentalMonths
        datetime createdAt
    }

    AgreementVersion {
        string id PK
        string agreementId FK
        int versionNumber
        string changes
        string allowedRoles
        string createdBy
        json snapshot
        datetime createdAt
    }

    ProjectClosureRequest {
        string id PK
        string closureRequestNumber UK "PCR-YYYY-NNN"
        string agreementId FK
        datetime requestDate
        string status "active|pending|approved"
        string approvedBy
        datetime approvedAt
        datetime createdAt
        datetime updatedAt
    }

    Customer ||--o{ RentalAgreement : "party to"
    RentalAgreement ||--o{ AgreementItem : "contains"
    RentalAgreement ||--o{ AgreementVersion : "versioned by"
    RentalAgreement ||--o{ ProjectClosureRequest : "closed via"
```

---

## Billing Module ERD — Part 1b: Deposit & Monthly Invoicing

> Covers: RentalAgreement, Deposit, MonthlyRentalInvoice, MonthlyRentalInvoiceItem

```mermaid
erDiagram
    RentalAgreement {
        string id PK
        string agreementNumber UK
        string projectName
        string hirer
        decimal monthlyRental
        decimal securityDeposit
        string status "Draft|Active|Closed"
    }

    Deposit {
        string id PK
        string depositNumber UK "DEP-YYYYMMDD-XXX"
        string agreementId FK
        decimal depositAmount
        string status "Pending Payment|Pending Approval|Paid|Rejected|Overdue|Expired"
        datetime dueDate
        string paymentProofUrl
        string paymentProofFileName
        datetime paymentProofUploadedAt
        string paymentProofUploadedBy
        datetime paymentSubmittedAt
        string referenceNumber
        string approvedBy
        datetime approvedAt
        string rejectedBy
        datetime rejectedAt
        string rejectionReason
        datetime createdAt
        datetime updatedAt
    }

    MonthlyRentalInvoice {
        string id PK
        string invoiceNumber UK "MRI-YYYYMMDD-XXX"
        string deliveryRequestId FK
        string agreementId FK
        string customerName
        string customerEmail
        string customerPhone
        int billingMonth
        int billingYear
        datetime billingStartDate
        datetime billingEndDate
        int daysInPeriod
        decimal baseAmount
        decimal overdueCharges
        decimal totalAmount
        string status "Pending Payment|Pending Approval|Paid|Rejected|Overdue"
        datetime dueDate
        string paymentProofUrl
        string paymentProofFileName
        datetime paymentProofUploadedAt
        string paymentProofUploadedBy
        string referenceNumber
        string approvedBy
        datetime approvedAt
        string rejectedBy
        datetime rejectedAt
        string rejectionReason
        datetime createdAt
        datetime updatedAt
    }

    MonthlyRentalInvoiceItem {
        string id PK
        string invoiceId FK
        string scaffoldingItemId
        string scaffoldingItemName
        int quantityBilled
        decimal unitPrice
        decimal lineTotal
        datetime createdAt
    }

    RentalAgreement ||--o{ Deposit : "has"
    RentalAgreement ||--o{ MonthlyRentalInvoice : "generates"
    MonthlyRentalInvoice ||--o{ MonthlyRentalInvoiceItem : "itemized by"
```

---

## Billing Module ERD — Part 2a: Additional Charges

> Covers: AdditionalCharge, AdditionalChargeItem

```mermaid
erDiagram
    AdditionalCharge {
        string id PK
        string invoiceNo UK
        string openRepairSlipId FK
        string returnRequestId FK
        string deliverySetId FK
        string conditionReportId
        string customerName
        string doId
        string returnedDate
        datetime dueDate
        string status "pending_payment|pending_approval|approved|rejected"
        decimal totalCharges
        string proofOfPaymentUrl
        string referenceId
        string rejectionReason
        datetime approvalDate
        datetime rejectionDate
        string uploadedByEmail
        datetime createdAt
        datetime updatedAt
    }

    AdditionalChargeItem {
        string id PK
        string additionalChargeId FK
        string itemName
        string itemType "Damage|Repair"
        string repairDescription
        int quantity
        decimal unitPrice
        decimal amount
        datetime createdAt
        datetime updatedAt
    }

    AdditionalCharge ||--o{ AdditionalChargeItem : "itemized by"
```

---

## Billing Module ERD — Part 2b: Credit Notes

> Covers: CreditNote, CreditNoteItem, CreditNoteAttachment, CreditNoteApplication

```mermaid
erDiagram
    CreditNote {
        string id PK
        string creditNoteNumber UK "CN-YYYY-XXX"
        string customerName
        string customerId
        string invoiceType "deposit|monthlyRental|additionalCharge"
        string sourceId
        string originalInvoice
        string deliveryOrderId
        string agreementId
        decimal amount
        string reason
        string reasonDescription
        datetime date
        string status "Draft|Pending Approval|Approved|Rejected"
        string createdBy
        string approvedBy
        datetime approvedAt
        string rejectedBy
        datetime rejectedAt
        string rejectionReason
        datetime createdAt
        datetime updatedAt
    }

    CreditNoteItem {
        string id PK
        string creditNoteId FK
        string description
        int quantity
        decimal previousPrice
        decimal currentPrice
        decimal unitPrice
        decimal amount
        datetime createdAt
    }

    CreditNoteAttachment {
        string id PK
        string creditNoteId FK
        string fileName
        string fileUrl
        int fileSize
        datetime uploadedAt
    }

    CreditNoteApplication {
        string id PK
        string creditNoteId FK
        string targetInvoiceType "deposit|monthlyRental|additionalCharge"
        string targetInvoiceId
        string targetInvoiceNumber
        decimal amountApplied
        string appliedBy
        datetime appliedAt
        string notes
    }

    CreditNote ||--o{ CreditNoteItem : "itemized by"
    CreditNote ||--o{ CreditNoteAttachment : "has"
    CreditNote ||--o{ CreditNoteApplication : "applied via"
```

---

## Billing Module ERD — Part 2c: Refunds

> Covers: CreditNote, Refund, RefundAttachment

```mermaid
erDiagram
    CreditNote {
        string id PK
        string creditNoteNumber UK "CN-YYYY-XXX"
        string customerId
        string invoiceType "deposit|monthlyRental|additionalCharge"
        decimal amount
        string status "Draft|Pending Approval|Approved|Rejected"
    }

    Refund {
        string id PK
        string refundNumber UK "REF-YYYY-XXX"
        string invoiceType "deposit|monthlyRental|additionalCharge"
        string sourceId
        string originalInvoice
        string customerName
        string customerId
        string creditNoteId FK
        string creditNoteNumber
        decimal amount
        string refundMethod "Bank Transfer|eWallet|Cash"
        string reason
        string reasonDescription
        string status "Draft|Pending Approval|Approved|Rejected"
        string createdBy
        string approvedBy
        datetime approvedAt
        string rejectedBy
        datetime rejectedAt
        string rejectionReason
        datetime createdAt
        datetime updatedAt
    }

    RefundAttachment {
        string id PK
        string refundId FK
        string fileName
        string fileUrl
        int fileSize
        datetime uploadedAt
    }

    CreditNote }o--o| Refund : "linked to"
    Refund ||--o{ RefundAttachment : "has"
```

---

## Combined Overview ERD (User → Billing)

```mermaid
erDiagram
    User {
        string id PK
        string email UK
        string status
    }

    Customer {
        string id PK,FK
        string customerType
        string tin
    }

    RentalAgreement {
        string id PK
        string agreementNumber UK
        string hirer
        decimal monthlyRental
        decimal securityDeposit
        string status
    }

    Deposit {
        string id PK
        string depositNumber UK
        string agreementId FK
        decimal depositAmount
        string status
    }

    MonthlyRentalInvoice {
        string id PK
        string invoiceNumber UK
        string agreementId FK
        decimal totalAmount
        string status
    }

    AdditionalCharge {
        string id PK
        string invoiceNo UK
        decimal totalCharges
        string status
    }

    CreditNote {
        string id PK
        string creditNoteNumber UK
        string customerId
        decimal amount
        string status
    }

    Refund {
        string id PK
        string refundNumber UK
        string customerId
        decimal amount
        string status
    }

    User ||--|| Customer : "is a"
    Customer ||--o{ RentalAgreement : "party to"
    RentalAgreement ||--o{ Deposit : "requires"
    RentalAgreement ||--o{ MonthlyRentalInvoice : "generates"
    MonthlyRentalInvoice ||--o{ AdditionalCharge : "may incur"
    CreditNote }o--|| Customer : "issued to"
    CreditNote }o--o| Refund : "triggers"
```
