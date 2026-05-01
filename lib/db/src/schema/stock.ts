import {
  pgTable,
  text,
  uuid,
  numeric,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { productsTable, warehousesTable } from "./core";

export const stockStatusEnum = pgEnum("stock_status", [
  "disponivel",
  "reservado",
  "em_processo",
  "aguardando_usinagem",
  "aguardando_montagem",
  "em_inspecao",
  "reprovado",
  "sucata",
]);

export const movementTypeEnum = pgEnum("movement_type", [
  "entrada_compra",
  "entrada_producao",
  "saida_producao",
  "saida_montagem",
  "entrada_produto_acabado",
  "reserva_venda",
  "baixa_venda",
  "ajuste_entrada",
  "ajuste_saida",
  "perda_sucata",
  "transferencia",
  "devolucao",
]);

export const stockBalancesTable = pgTable("stock_balances", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => productsTable.id),
  warehouseId: uuid("warehouse_id").notNull().references(() => warehousesTable.id),
  stockStatus: stockStatusEnum("stock_status").notNull().default("disponivel"),
  batchNumber: text("batch_number"),
  quantity: numeric("quantity", { precision: 15, scale: 4 }).notNull().default("0"),
  reservedQuantity: numeric("reserved_quantity", { precision: 15, scale: 4 }).notNull().default("0"),
  lastMovementAt: timestamp("last_movement_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const stockMovementsTable = pgTable("stock_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => productsTable.id),
  warehouseId: uuid("warehouse_id").notNull().references(() => warehousesTable.id),
  movementType: movementTypeEnum("movement_type").notNull(),
  quantity: numeric("quantity", { precision: 15, scale: 4 }).notNull(),
  originStatus: stockStatusEnum("origin_status"),
  destinationStatus: stockStatusEnum("destination_status"),
  referenceType: text("reference_type"),
  referenceId: uuid("reference_id"),
  notes: text("notes"),
  movementDate: timestamp("movement_date", { withTimezone: true }).notNull().defaultNow(),
  userId: text("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stockReservationsTable = pgTable("stock_reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  salesOrderId: uuid("sales_order_id").notNull(),
  salesOrderItemId: uuid("sales_order_item_id"),
  productId: uuid("product_id").notNull().references(() => productsTable.id),
  warehouseId: uuid("warehouse_id").notNull().references(() => warehousesTable.id),
  quantity: numeric("quantity", { precision: 15, scale: 4 }).notNull(),
  status: text("status").notNull().default("ativa"),
  reservationDate: timestamp("reservation_date", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StockBalance = typeof stockBalancesTable.$inferSelect;
export type StockMovement = typeof stockMovementsTable.$inferSelect;
export type StockReservation = typeof stockReservationsTable.$inferSelect;
