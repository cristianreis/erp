import {
  pgTable,
  text,
  uuid,
  numeric,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { productsTable, warehousesTable } from "./core";
import { suppliersTable } from "./customers-suppliers";

export const purchaseRequestSourceEnum = pgEnum("purchase_request_source", [
  "manual",
  "mrp",
  "estoque_minimo",
  "producao",
]);

export const purchaseRequestStatusEnum = pgEnum("purchase_request_status", [
  "aberta",
  "aprovada",
  "convertida_pedido",
  "cancelada",
]);

export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "aberto",
  "enviado",
  "recebido_parcial",
  "recebido_total",
  "cancelado",
]);

export const purchaseRequestsTable = pgTable("purchase_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestNumber: text("request_number").notNull().unique(),
  productId: uuid("product_id").notNull().references(() => productsTable.id),
  quantity: numeric("quantity", { precision: 15, scale: 4 }).notNull(),
  neededDate: timestamp("needed_date", { withTimezone: true }),
  source: purchaseRequestSourceEnum("source").notNull().default("manual"),
  status: purchaseRequestStatusEnum("status").notNull().default("aberta"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: text("order_number").notNull().unique(),
  supplierId: uuid("supplier_id").notNull().references(() => suppliersTable.id),
  orderDate: timestamp("order_date", { withTimezone: true }).notNull().defaultNow(),
  expectedDate: timestamp("expected_date", { withTimezone: true }),
  status: purchaseOrderStatusEnum("status").notNull().default("aberto"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 4 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const purchaseOrderItemsTable = pgTable("purchase_order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  purchaseOrderId: uuid("purchase_order_id").notNull().references(() => purchaseOrdersTable.id),
  productId: uuid("product_id").notNull().references(() => productsTable.id),
  quantity: numeric("quantity", { precision: 15, scale: 4 }).notNull(),
  receivedQuantity: numeric("received_quantity", { precision: 15, scale: 4 }).notNull().default("0"),
  unitPrice: numeric("unit_price", { precision: 15, scale: 4 }).notNull(),
  totalPrice: numeric("total_price", { precision: 15, scale: 4 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const receiptsTable = pgTable("receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  receiptNumber: text("receipt_number").notNull().unique(),
  purchaseOrderId: uuid("purchase_order_id").notNull().references(() => purchaseOrdersTable.id),
  receiptDate: timestamp("receipt_date", { withTimezone: true }).notNull().defaultNow(),
  status: text("status").notNull().default("recebido"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const receiptItemsTable = pgTable("receipt_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  receiptId: uuid("receipt_id").notNull().references(() => receiptsTable.id),
  purchaseOrderItemId: uuid("purchase_order_item_id").references(() => purchaseOrderItemsTable.id),
  productId: uuid("product_id").notNull().references(() => productsTable.id),
  quantity: numeric("quantity", { precision: 15, scale: 4 }).notNull(),
  warehouseId: uuid("warehouse_id").notNull().references(() => warehousesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PurchaseRequest = typeof purchaseRequestsTable.$inferSelect;
export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;
export type PurchaseOrderItem = typeof purchaseOrderItemsTable.$inferSelect;
export type Receipt = typeof receiptsTable.$inferSelect;
export type ReceiptItem = typeof receiptItemsTable.$inferSelect;
