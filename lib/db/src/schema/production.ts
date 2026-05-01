import {
  pgTable,
  text,
  uuid,
  numeric,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { productsTable, machinesTable, operationsTable, warehousesTable } from "./core";
import { salesOrdersTable } from "./sales";

export const productionOrderTypeEnum = pgEnum("production_order_type", [
  "usinagem",
  "montagem",
  "fabricacao",
  "retrabalho",
]);

export const productionOrderStatusEnum = pgEnum("production_order_status", [
  "planejada",
  "liberada",
  "em_producao",
  "pausada",
  "aguardando_material",
  "aguardando_maquina",
  "em_inspecao",
  "finalizada",
  "cancelada",
]);

export const productionOrderPriorityEnum = pgEnum("production_order_priority", [
  "baixa",
  "normal",
  "alta",
  "urgente",
]);

export const productionOrdersTable = pgTable("production_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: text("order_number").notNull().unique(),
  productId: uuid("product_id").notNull().references(() => productsTable.id),
  salesOrderId: uuid("sales_order_id").references(() => salesOrdersTable.id),
  quantityPlanned: numeric("quantity_planned", { precision: 15, scale: 4 }).notNull(),
  quantityProduced: numeric("quantity_produced", { precision: 15, scale: 4 }).notNull().default("0"),
  quantityRejected: numeric("quantity_rejected", { precision: 15, scale: 4 }).notNull().default("0"),
  orderType: productionOrderTypeEnum("order_type").notNull(),
  status: productionOrderStatusEnum("status").notNull().default("planejada"),
  priority: productionOrderPriorityEnum("priority").notNull().default("normal"),
  plannedStartDate: timestamp("planned_start_date", { withTimezone: true }),
  plannedEndDate: timestamp("planned_end_date", { withTimezone: true }),
  actualStartDate: timestamp("actual_start_date", { withTimezone: true }),
  actualEndDate: timestamp("actual_end_date", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const productionOrderMaterialsTable = pgTable("production_order_materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  productionOrderId: uuid("production_order_id").notNull().references(() => productionOrdersTable.id),
  productId: uuid("product_id").notNull().references(() => productsTable.id),
  requiredQuantity: numeric("required_quantity", { precision: 15, scale: 4 }).notNull(),
  issuedQuantity: numeric("issued_quantity", { precision: 15, scale: 4 }).notNull().default("0"),
  consumedQuantity: numeric("consumed_quantity", { precision: 15, scale: 4 }).notNull().default("0"),
  warehouseId: uuid("warehouse_id").references(() => warehousesTable.id),
  status: text("status").notNull().default("pendente"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productionOrderOperationsTable = pgTable("production_order_operations", {
  id: uuid("id").primaryKey().defaultRandom(),
  productionOrderId: uuid("production_order_id").notNull().references(() => productionOrdersTable.id),
  sequenceNumber: integer("sequence_number").notNull(),
  operationId: uuid("operation_id").notNull().references(() => operationsTable.id),
  machineId: uuid("machine_id").references(() => machinesTable.id),
  plannedTimeMinutes: numeric("planned_time_minutes", { precision: 10, scale: 2 }),
  actualTimeMinutes: numeric("actual_time_minutes", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("pendente"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  operatorId: text("operator_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productionAppointmentsTable = pgTable("production_appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  productionOrderId: uuid("production_order_id").notNull().references(() => productionOrdersTable.id),
  productionOrderOperationId: uuid("production_order_operation_id").references(() => productionOrderOperationsTable.id),
  operatorId: text("operator_id"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),
  quantityGood: numeric("quantity_good", { precision: 15, scale: 4 }).notNull().default("0"),
  quantityRejected: numeric("quantity_rejected", { precision: 15, scale: 4 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProductionOrder = typeof productionOrdersTable.$inferSelect;
export type ProductionOrderMaterial = typeof productionOrderMaterialsTable.$inferSelect;
export type ProductionOrderOperation = typeof productionOrderOperationsTable.$inferSelect;
export type ProductionAppointment = typeof productionAppointmentsTable.$inferSelect;
