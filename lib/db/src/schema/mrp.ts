import {
  pgTable,
  text,
  uuid,
  numeric,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { productsTable } from "./core";

export const mrpRunStatusEnum = pgEnum("mrp_run_status", [
  "calculado",
  "aprovado",
  "cancelado",
]);

export const mrpSuggestedActionEnum = pgEnum("mrp_suggested_action", [
  "usar_estoque",
  "montar",
  "usinar",
  "fabricar",
  "comprar",
  "fundir_comprar",
  "sem_acao",
]);

export const mrpRunsTable = pgTable("mrp_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  runNumber: text("run_number").notNull().unique(),
  runDate: timestamp("run_date", { withTimezone: true }).notNull().defaultNow(),
  status: mrpRunStatusEnum("status").notNull().default("calculado"),
  consideredSalesOrders: boolean("considered_sales_orders").notNull().default(true),
  consideredMinimumStock: boolean("considered_minimum_stock").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mrpResultsTable = pgTable("mrp_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  mrpRunId: uuid("mrp_run_id").notNull().references(() => mrpRunsTable.id),
  productId: uuid("product_id").notNull().references(() => productsTable.id),
  grossRequirement: numeric("gross_requirement", { precision: 15, scale: 4 }).notNull().default("0"),
  availableStock: numeric("available_stock", { precision: 15, scale: 4 }).notNull().default("0"),
  reservedStock: numeric("reserved_stock", { precision: 15, scale: 4 }).notNull().default("0"),
  openProductionQuantity: numeric("open_production_quantity", { precision: 15, scale: 4 }).notNull().default("0"),
  openPurchaseQuantity: numeric("open_purchase_quantity", { precision: 15, scale: 4 }).notNull().default("0"),
  netRequirement: numeric("net_requirement", { precision: 15, scale: 4 }).notNull().default("0"),
  suggestedAction: mrpSuggestedActionEnum("suggested_action").notNull().default("sem_acao"),
  suggestedQuantity: numeric("suggested_quantity", { precision: 15, scale: 4 }).notNull().default("0"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  sourceReference: text("source_reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MrpRun = typeof mrpRunsTable.$inferSelect;
export type MrpResult = typeof mrpResultsTable.$inferSelect;
