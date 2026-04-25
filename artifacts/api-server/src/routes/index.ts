import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leadsRouter from "./leads";
import geoRouter from "./geo";
import conditionsRouter from "./conditions";
import chatRouter from "./chat";
import adminRouter from "./admin";
import whatsappRouter from "./whatsapp";

const router: IRouter = Router();

router.use(healthRouter);
router.use(leadsRouter);
router.use(geoRouter);
router.use(conditionsRouter);
router.use(chatRouter);
router.use(adminRouter);
router.use(whatsappRouter);

export default router;
