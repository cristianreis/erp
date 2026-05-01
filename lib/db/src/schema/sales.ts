import {
  pgTable,
  text,
  uuid,
  numeric,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { productsTable } from "./core";
import { customersTable } from "./customers-suppliers";

export const salesOrderStatusEnum = pgEnum("sales_order_status", [
  "rascunho",
  "aguardando_aprovacao",
  "aprovado",
  "reservado",
  "em_producao",
  "pronto_expedicao",
  "expedido",
  "faturado",
  "cancelado",
]);

export const salesOrderItemStatusEnum = pgEnum("sales_order_item_status", [
  "pendente",
  "reservado",
  "falta_estoque",
  "em_producao",
  "pronto",
  "entregue",
  "cancelado",
]);

export const salesOrdersTable = pgTable("sales_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: text("order_number").notNull().unique(),
  customerId: uuid("customer_id").notNull().references(() => customersTable.id),
  orderDate: timestamp("order_date", { withTimezone: true }).notNull().defaultNow(),
  expectedDeliveryDate: timestamp("expected_delivery_date", { withTimezone: true }),
  status: salesOrderStatusEnum("status").notNull().default("rascunho"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 4 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const salesOrderItemsTable = pgTable("sales_order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  salesOrderId: uuid("sales_order_id").notNull().references(() => salesOrdersTable.id),
  productId: uuid("product_id").notNull().references(() => productsTable.id),
  quantity: numeric("quantity", { precision: 15, scale: 4 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 4 }).notNull(),
  totalPrice: numeric("total_price", { precision: 15, scale: 4 }).notNull(),
  availableAtOrderTime: numeric("available_at_order_time", { precision: 15, scale: 4 }).notNull().default("0"),
  reservedQuantity: numeric("reserved_quantity", { precision: 15, scale: 4 }).notNull().default("0"),
  deliveredQuantity: numeric("delivered_quantity", { precision: 15, scale: 4 }).notNull().default("0"),
  status: salesOrderItemStatusEnum("status").notNull().default("pendente"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shipmentsTable = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  salesOrderId: uuid("sales_order_id").notNull().references(() => salesOrdersTable.id),
  shipmentNumber: text("shipment_number").notNull(),
  shipmentDate: timestamp("shipment_date", { withTimezone: true }).notNull().defaultNow(),
  status: text("status").notNull().default("expedido"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SalesOrder = typeof salesOrdersTable.$inferSelect;
export type SalesOrderItem = typeof salesOrderItemsTable.$inferSelect;
export type Shipment = typeof shipmentsTable.$inferSelect;
