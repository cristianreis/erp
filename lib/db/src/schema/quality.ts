import {
  pgTable,
  text,
  uuid,
  numeric,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { productsTable } from "./core";
import { productionOrdersTable } from "./production";

export const inspectionStatusEnum = pgEnum("inspection_status", [
  "aprovado",
  "reprovado_parcial",
  "reprovado_total",
]);

export const qualityInspectionsTable = pgTable("quality_inspections", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => productsTable.id),
  productionOrderId: uuid("production_order_id").references(() => productionOrdersTable.id),
  inspectionDate: timestamp("inspection_date", { withTimezone: true }).notNull().defaultNow(),
  inspectedQuantity: numeric("inspected_quantity", { precision: 15, scale: 4 }).notNull(),
  approvedQuantity: numeric("approved_quantity", { precision: 15, scale: 4 }).notNull().default("0"),
  rejectedQuantity: numeric("rejected_quantity", { precision: 15, scale: 4 }).notNull().default("0"),
  status: inspectionStatusEnum("inspection_status").notNull().default("aprovado"),
  scrapAction: text("scrap_action"),
  reworkAction: text("rework_action"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type QualityInspection = typeof qualityInspectionsTable.$inferSelect;
