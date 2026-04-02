import { Router, type IRouter } from "express";
import healthRouter from "./health";
import registerRouter from "./register";
import attendanceRouter from "./attendance";

const router: IRouter = Router();

router.use(healthRouter);
router.use(registerRouter);
router.use(attendanceRouter);

export default router;
