import { db } from "@workspace/db";
import {
  productsTable,
  productCategoriesTable,
  warehousesTable,
  sectorsTable,
  machinesTable,
  operationsTable,
  customersTable,
  suppliersTable,
  stockBalancesTable,
  bomHeadersTable,
  bomItemsTable,
  routingsTable,
  routingOperationsTable,
  salesOrdersTable,
  salesOrderItemsTable,
  productionOrdersTable,
} from "@workspace/db";

async function seed() {
  console.log("Seeding database...");

  await db.delete(routingOperationsTable);
  await db.delete(routingsTable);
  await db.delete(bomItemsTable);
  await db.delete(bomHeadersTable);
  await db.delete(salesOrderItemsTable);
  await db.delete(salesOrdersTable);
  await db.delete(productionOrdersTable);
  await db.delete(stockBalancesTable);
  await db.delete(productsTable);
  await db.delete(productCategoriesTable);
  await db.delete(machinesTable);
  await db.delete(sectorsTable);
  await db.delete(operationsTable);
  await db.delete(warehousesTable);
  await db.delete(customersTable);
  await db.delete(suppliersTable);

  const [catPA] = await db.insert(productCategoriesTable).values({ name: "Produto Acabado" }).returning();
  const [catSemi] = await db.insert(productCategoriesTable).values({ name: "Semiacabado" }).returning();
  const [catMP] = await db.insert(productCategoriesTable).values({ name: "Matéria Prima" }).returning();
  const [catComp] = await db.insert(productCategoriesTable).values({ name: "Componente Comprado" }).returning();

  const products = await db.insert(productsTable).values([
    { code: "PA-ACL60", name: "Acoplamento Luva 60mm", categoryId: catPA.id, itemType: "produto_acabado", unit: "peca", minimumStock: "5", salePrice: "450.00", costPrice: "210.00", isSellable: true, isManufactured: true, requiresMachining: true, requiresAssembly: true },
    { code: "PA-ACL80", name: "Acoplamento Luva 80mm", categoryId: catPA.id, itemType: "produto_acabado", unit: "peca", minimumStock: "3", salePrice: "680.00", costPrice: "320.00", isSellable: true, isManufactured: true, requiresMachining: true, requiresAssembly: true },
    { code: "SA-CUB60", name: "Cubo L60 Usinado", categoryId: catSemi.id, itemType: "semiacabado", unit: "peca", minimumStock: "8", costPrice: "95.00", isManufactured: true, requiresMachining: true },
    { code: "SA-LUV60", name: "Luva L60 Usinada", categoryId: catSemi.id, itemType: "semiacabado", unit: "peca", minimumStock: "8", costPrice: "85.00", isManufactured: true, requiresMachining: true },
    { code: "FB-CUB60", name: "Cubo L60 Fundido Bruto", categoryId: catSemi.id, itemType: "fundido_bruto", unit: "peca", minimumStock: "15", costPrice: "38.00", isPurchased: true, isManufactured: true },
    { code: "FB-LUV60", name: "Luva L60 Fundida Bruta", categoryId: catSemi.id, itemType: "fundido_bruto", unit: "peca", minimumStock: "15", costPrice: "32.00", isPurchased: true, isManufactured: true },
    { code: "MP-ACO1020", name: "Aço SAE 1020 Barra 1\"", categoryId: catMP.id, itemType: "materia_prima", unit: "metro", minimumStock: "20", costPrice: "18.50", isPurchased: true, leadTimeDays: 7 },
    { code: "MP-FERR30", name: "Ferro Fundido FC-30 Barra", categoryId: catMP.id, itemType: "materia_prima", unit: "kg", minimumStock: "100", costPrice: "6.80", isPurchased: true, leadTimeDays: 10 },
    { code: "COMP-PRC-M12", name: "Porca M12 Zincada", categoryId: catComp.id, itemType: "componente_comprado", unit: "peca", minimumStock: "200", costPrice: "0.45", isPurchased: true, leadTimeDays: 3 },
    { code: "COMP-POR-M8", name: "Parafuso M8x30 Zincado", categoryId: catComp.id, itemType: "componente_comprado", unit: "peca", minimumStock: "300", costPrice: "0.25", isPurchased: true, leadTimeDays: 3 },
  ]).returning();

  const [wAlmox, wUsin, wMont, wExpid, wQual] = await db.insert(warehousesTable).values([
    { name: "Almoxarifado Geral", type: "almoxarifado" },
    { name: "Setor de Usinagem", type: "usinagem" },
    { name: "Setor de Montagem", type: "montagem" },
    { name: "Expedição", type: "expedicao" },
    { name: "Controle de Qualidade", type: "qualidade" },
  ]).returning();

  const [sUsin, sMont, sFund] = await db.insert(sectorsTable).values([
    { name: "Usinagem CNC", description: "Torno e Fresamento CNC" },
    { name: "Montagem", description: "Montagem e ajuste de conjuntos" },
    { name: "Fundição", description: "Fundição e moldagem" },
  ]).returning();

  const [mTorno, mFresa, mFuro] = await db.insert(machinesTable).values([
    { code: "TNC-01", name: "Torno CNC Romi", type: "torno_cnc", sectorId: sUsin.id, capacityPerDay: "480" },
    { code: "FRE-01", name: "Fresadora CNC", type: "fresadora_cnc", sectorId: sUsin.id, capacityPerDay: "480" },
    { code: "FUR-01", name: "Furadeira de Coluna", type: "furadeira", sectorId: sUsin.id, capacityPerDay: "480" },
  ]).returning();

  const [opTorno, opFresa, opFuro, opMont, opInsp] = await db.insert(operationsTable).values([
    { code: "OP-TORNO", name: "Torneamento CNC", operationType: "torno" },
    { code: "OP-FRESA", name: "Fresamento CNC", operationType: "fresa" },
    { code: "OP-FURO", name: "Furação", operationType: "furacao" },
    { code: "OP-MONT", name: "Montagem de Conjunto", operationType: "montagem" },
    { code: "OP-INSP", name: "Inspeção Dimensional", operationType: "inspecao" },
  ]).returning();

  const [cust1, cust2] = await db.insert(customersTable).values([
    { name: "Metalúrgica São Paulo Ltda.", document: "12.345.678/0001-90", email: "compras@metalsp.com.br", phone: "(11) 3456-7890", city: "São Paulo", state: "SP" },
    { name: "Indústria Mecânica Norte S/A", document: "98.765.432/0001-10", email: "suprimentos@imn.com.br", phone: "(43) 3321-5678", city: "Londrina", state: "PR" },
  ]).returning();

  const [sup1, sup2] = await db.insert(suppliersTable).values([
    { name: "Fundição Paulista Ltda.", document: "55.444.333/0001-22", email: "vendas@fundicaopaulista.com.br", phone: "(11) 4567-8901", city: "Guarulhos", state: "SP" },
    { name: "Aços Centro-Oeste ME", document: "33.222.111/0001-44", email: "comercial@acosce.com.br", phone: "(64) 3456-7890", city: "Goiânia", state: "GO" },
  ]).returning();

  const [prodACL60, prodACL80, prodCUB60, prodLUV60, prodFBCUB, prodFBLUV, prodACO, prodFERR, prodPRCM12, prodPORTA] = products;

  await db.insert(stockBalancesTable).values([
    { productId: prodACL60.id, warehouseId: wAlmox.id, quantity: "3", stockStatus: "disponivel" },
    { productId: prodACL80.id, warehouseId: wAlmox.id, quantity: "2", stockStatus: "disponivel" },
    { productId: prodCUB60.id, warehouseId: wUsin.id, quantity: "6", stockStatus: "disponivel" },
    { productId: prodLUV60.id, warehouseId: wUsin.id, quantity: "4", stockStatus: "disponivel" },
    { productId: prodFBCUB.id, warehouseId: wAlmox.id, quantity: "20", stockStatus: "disponivel" },
    { productId: prodFBLUV.id, warehouseId: wAlmox.id, quantity: "18", stockStatus: "disponivel" },
    { productId: prodACO.id, warehouseId: wAlmox.id, quantity: "35", stockStatus: "disponivel" },
    { productId: prodFERR.id, warehouseId: wAlmox.id, quantity: "85", stockStatus: "disponivel" },
    { productId: prodPRCM12.id, warehouseId: wAlmox.id, quantity: "450", stockStatus: "disponivel" },
    { productId: prodPORTA.id, warehouseId: wAlmox.id, quantity: "520", stockStatus: "disponivel" },
  ]);

  const [bomACL60] = await db.insert(bomHeadersTable).values({
    parentProductId: prodACL60.id,
    version: 1,
    description: "BOM Acoplamento Luva 60mm Rev.1",
    active: true,
  }).returning();

  await db.insert(bomItemsTable).values([
    { bomHeaderId: bomACL60.id, componentProductId: prodCUB60.id, quantityPerParent: "1", scrapPercentage: "2", isMandatory: true },
    { bomHeaderId: bomACL60.id, componentProductId: prodLUV60.id, quantityPerParent: "1", scrapPercentage: "2", isMandatory: true },
    { bomHeaderId: bomACL60.id, componentProductId: prodPRCM12.id, quantityPerParent: "4", scrapPercentage: "0", isMandatory: true },
    { bomHeaderId: bomACL60.id, componentProductId: prodPORTA.id, quantityPerParent: "4", scrapPercentage: "0", isMandatory: true },
  ]);

  const [rotCUB60] = await db.insert(routingsTable).values({
    productId: prodCUB60.id,
    version: 1,
    description: "Roteiro Cubo L60 - Usinagem",
    active: true,
  }).returning();

  await db.insert(routingOperationsTable).values([
    { routingId: rotCUB60.id, sequenceNumber: 10, operationId: opTorno.id, machineId: mTorno.id, sectorId: sUsin.id, setupTimeMinutes: "15", standardTimeMinutes: "25", notes: "Desbastar e facejar" },
    { routingId: rotCUB60.id, sequenceNumber: 20, operationId: opFuro.id, machineId: mFuro.id, sectorId: sUsin.id, setupTimeMinutes: "10", standardTimeMinutes: "15", notes: "Furar Ø12mm" },
    { routingId: rotCUB60.id, sequenceNumber: 30, operationId: opInsp.id, machineId: null, sectorId: sUsin.id, setupTimeMinutes: "0", standardTimeMinutes: "8", notes: "Verificar cotas" },
  ]);

  const [rotACL60] = await db.insert(routingsTable).values({
    productId: prodACL60.id,
    version: 1,
    description: "Roteiro Acoplamento L60 - Montagem",
    active: true,
  }).returning();

  await db.insert(routingOperationsTable).values([
    { routingId: rotACL60.id, sequenceNumber: 10, operationId: opMont.id, machineId: null, sectorId: sMont.id, setupTimeMinutes: "5", standardTimeMinutes: "20", notes: "Montar cubo + luva + fixadores" },
    { routingId: rotACL60.id, sequenceNumber: 20, operationId: opInsp.id, machineId: null, sectorId: sMont.id, setupTimeMinutes: "0", standardTimeMinutes: "10", notes: "Inspecionar conjunto" },
  ]);

  const [so1] = await db.insert(salesOrdersTable).values({
    orderNumber: "PV-00001",
    customerId: cust1.id,
    orderDate: new Date("2026-04-20"),
    expectedDeliveryDate: new Date("2026-05-20"),
    status: "aprovado",
    totalAmount: "5400.00",
    notes: "Pedido urgente — cliente preferencial",
  }).returning();

  await db.insert(salesOrderItemsTable).values([
    { salesOrderId: so1.id, productId: prodACL60.id, quantity: "10", unitPrice: "450.00", totalPrice: "4500.00", availableAtOrderTime: "3", status: "falta_estoque" },
    { salesOrderId: so1.id, productId: prodACL80.id, quantity: "1", unitPrice: "680.00", totalPrice: "680.00", availableAtOrderTime: "2", status: "reservado" },
  ]);

  const [so2] = await db.insert(salesOrdersTable).values({
    orderNumber: "PV-00002",
    customerId: cust2.id,
    orderDate: new Date("2026-04-28"),
    expectedDeliveryDate: new Date("2026-06-10"),
    status: "rascunho",
    totalAmount: "3600.00",
  }).returning();

  await db.insert(salesOrderItemsTable).values([
    { salesOrderId: so2.id, productId: prodACL60.id, quantity: "8", unitPrice: "450.00", totalPrice: "3600.00", availableAtOrderTime: "3", status: "pendente" },
  ]);

  await db.insert(productionOrdersTable).values([
    {
      orderNumber: "OP-00001",
      productId: prodCUB60.id,
      salesOrderId: so1.id,
      quantityPlanned: "10",
      quantityProduced: "3",
      orderType: "usinagem",
      status: "em_producao",
      priority: "alta",
      plannedStartDate: new Date("2026-04-22"),
      plannedEndDate: new Date("2026-04-28"),
      actualStartDate: new Date("2026-04-22"),
      notes: "Urgente — PV-00001",
    },
    {
      orderNumber: "OP-00002",
      productId: prodLUV60.id,
      salesOrderId: so1.id,
      quantityPlanned: "10",
      quantityProduced: "0",
      orderType: "usinagem",
      status: "liberada",
      priority: "alta",
      plannedStartDate: new Date("2026-04-25"),
      plannedEndDate: new Date("2026-05-02"),
      notes: "Aguarda OP-00001",
    },
    {
      orderNumber: "OP-00003",
      productId: prodACL60.id,
      salesOrderId: so1.id,
      quantityPlanned: "10",
      quantityProduced: "0",
      orderType: "montagem",
      status: "aguardando_material",
      priority: "alta",
      plannedStartDate: new Date("2026-05-05"),
      plannedEndDate: new Date("2026-05-12"),
      notes: "Aguarda componentes usinados",
    },
  ]);

  console.log("Seed completed!");
  process.exit(0);
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
});
