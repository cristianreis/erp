import {
  pgTable,
  pgEnum,
  text,
  uuid,
  boolean,
  numeric,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { productsTable, machinesTable, sectorsTable, operationsTable } from "./core";

export const bomHeadersTable = pgTable("bom_headers", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentProductId: uuid("parent_product_id").notNull().references(() => productsTable.id),
  version: integer("version").notNull().default(1),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validTo: timestamp("valid_to", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const bomItemsTable = pgTable("bom_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  bomHeaderId: uuid("bom_header_id").notNull().references(() => bomHeadersTable.id),
  componentProductId: uuid("component_product_id").notNull().references(() => productsTable.id),
  quantityPerParent: numeric("quantity_per_parent", { precision: 15, scale: 4 }).notNull().default("1"),
  scrapPercentage: numeric("scrap_percentage", { precision: 5, scale: 2 }).notNull().default("0"),
  isMandatory: boolean("is_mandatory").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const routingsTable = pgTable("routings", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => productsTable.id),
  version: integer("version").notNull().default(1),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const routingOperationsTable = pgTable("routing_operations", {
  id: uuid("id").primaryKey().defaultRandom(),
  routingId: uuid("routing_id").notNull().references(() => routingsTable.id),
  sequenceNumber: integer("sequence_number").notNull(),
  operationId: uuid("operation_id").notNull().references(() => operationsTable.id),
  machineId: uuid("machine_id").references(() => machinesTable.id),
  sectorId: uuid("sector_id").references(() => sectorsTable.id),
  setupTimeMinutes: numeric("setup_time_minutes", { precision: 10, scale: 2 }).notNull().default("0"),
  standardTimeMinutes: numeric("standard_time_minutes", { precision: 10, scale: 2 }).notNull().default("0"),
  isExternal: boolean("is_external").notNull().default(false),
  tools: text("tools"),
  checklist: text("checklist"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documentTypeEnum = pgEnum("document_type", [
  "desenho_tecnico", "instrucao_trabalho", "checklist", "foto", "certificado",
  "ficha_tecnica", "plano_controle", "outro",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "em_desenvolvimento", "em_analise", "aprovado", "liberado", "obsoleto", "bloqueado",
]);

export const productDocumentsTable = pgTable("product_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => productsTable.id),
  name: text("name").notNull(),
  description: text("description"),
  documentType: documentTypeEnum("document_type").notNull().default("desenho_tecnico"),
  revision: text("revision").notNull().default("Rev.00"),
  status: documentStatusEnum("status").notNull().default("em_desenvolvimento"),
  objectPath: text("object_path"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  changeReason: text("change_reason"),
  responsiblePerson: text("responsible_person"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type BomHeader = typeof bomHeadersTable.$inferSelect;
export type BomItem = typeof bomItemsTable.$inferSelect;
export type Routing = typeof routingsTable.$inferSelect;
export type RoutingOperation = typeof routingOperationsTable.$inferSelect;
export type ProductDocument = typeof productDocumentsTable.$inferSelect;
