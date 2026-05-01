import {
  pgTable,
  text,
  uuid,
  boolean,
  numeric,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const itemTypeEnum = pgEnum("item_type", [
  "produto_acabado",
  "semiacabado",
  "fundido_bruto",
  "materia_prima",
  "componente_comprado",
  "produto_em_processo",
  "servico",
]);

export const unitEnum = pgEnum("unit_type", [
  "peca",
  "kg",
  "metro",
  "conjunto",
  "litro",
  "unidade",
]);

export const warehouseTypeEnum = pgEnum("warehouse_type", [
  "almoxarifado",
  "usinagem",
  "montagem",
  "expedicao",
  "qualidade",
  "sucata",
]);

export const operationTypeEnum = pgEnum("operation_type", [
  "corte",
  "torno",
  "fresa",
  "furacao",
  "solda",
  "tratamento",
  "inspecao",
  "montagem",
  "embalagem",
  "outro",
]);

export const productCategoriesTable = pgTable("product_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productsTable = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: uuid("category_id").references(() => productCategoriesTable.id),
  itemType: itemTypeEnum("item_type").notNull(),
  unit: unitEnum("unit").notNull().default("peca"),
  minimumStock: numeric("minimum_stock", { precision: 15, scale: 4 }).notNull().default("0"),
  maximumStock: numeric("maximum_stock", { precision: 15, scale: 4 }),
  safetyStock: numeric("safety_stock", { precision: 15, scale: 4 }),
  leadTimeDays: integer("lead_time_days"),
  salePrice: numeric("sale_price", { precision: 15, scale: 4 }),
  costPrice: numeric("cost_price", { precision: 15, scale: 4 }),
  isSellable: boolean("is_sellable").notNull().default(false),
  isManufactured: boolean("is_manufactured").notNull().default(false),
  isPurchased: boolean("is_purchased").notNull().default(false),
  requiresMachining: boolean("requires_machining").notNull().default(false),
  requiresAssembly: boolean("requires_assembly").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const warehousesTable = pgTable("warehouses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: warehouseTypeEnum("type").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sectorsTable = pgTable("sectors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const machinesTable = pgTable("machines", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  type: text("type"),
  sectorId: uuid("sector_id").references(() => sectorsTable.id),
  capacityPerDay: numeric("capacity_per_day", { precision: 15, scale: 4 }),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const operationsTable = pgTable("operations", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  operationType: operationTypeEnum("operation_type").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
export type Warehouse = typeof warehousesTable.$inferSelect;
export type Sector = typeof sectorsTable.$inferSelect;
export type Machine = typeof machinesTable.$inferSelect;
export type Operation = typeof operationsTable.$inferSelect;
export type ProductCategory = typeof productCategoriesTable.$inferSelect;
