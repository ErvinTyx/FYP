/**
 * Prisma Schema Update for RFQ Module
 * Module: Request for Quotation (RFQ)
 * 
 * This file contains the Prisma schema definitions for the RFQ module.
 * Add these models to your prisma/schema.prisma file to enable RFQ data storage.
 * 
 * INSTRUCTIONS:
 * 1. Copy the models below
 * 2. Paste them into prisma/schema.prisma file (at the end, before any closing braces)
 * 3. Run: npx prisma migrate dev --name add_rfq_tables
 * 4. Run: npx prisma generate
 */

/*
===============================================
RFQ MODULE - SCHEMA MODELS
===============================================

model RFQ {
  id                String     @id @default(cuid())
  rfqNumber         String     @unique @index
  customerName      String     @index
  customerEmail     String     @index
  customerPhone     String
  projectName       String     @index
  projectLocation   String
  requestedDate     DateTime
  requiredDate      DateTime
  status            String     @default("draft") @index
  totalAmount       Decimal    @default(0) @db.Decimal(15, 2)
  notes             String?    @db.LongText
  createdBy         String     @index
  items             RFQItem[]
  createdAt         DateTime   @default(now()) @index
  updatedAt         DateTime   @updatedAt

  @@index([rfqNumber])
  @@index([status, createdAt])
}

model RFQItem {
  id                    String     @id @default(cuid())
  rfqId                 String     @index
  rfq                   RFQ        @relation(fields: [rfqId], references: [id], onDelete: Cascade)
  scaffoldingItemId     String
  scaffoldingItemName   String
  quantity              Int
  unit                  String
  unitPrice             Decimal    @db.Decimal(15, 2)
  totalPrice            Decimal    @db.Decimal(15, 2)
  notes                 String?    @db.Text
  createdAt             DateTime   @default(now())
  updatedAt             DateTime   @updatedAt

  @@index([rfqId])
}

===============================================
*/

// This is a documentation file only. Copy the schema models above to prisma/schema.prisma
