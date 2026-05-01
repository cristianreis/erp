import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import customersSuppliers from "./customers-suppliers";
import coreRouter from "./core";
import stockRouter from "./stock";
import engineeringRouter from "./engineering";
import salesRouter from "./sales";
import productionRouter from "./production";
import purchasingRouter from "./purchasing";
import qualityRouter from "./quality";
import mrpRouter from "./mrp";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(customersSuppliers);
router.use(coreRouter);
router.use(stockRouter);
router.use(engineeringRouter);
router.use(salesRouter);
router.use(productionRouter);
router.use(purchasingRouter);
router.use(qualityRouter);
router.use(mrpRouter);
router.use(dashboardRouter);

export default router;
