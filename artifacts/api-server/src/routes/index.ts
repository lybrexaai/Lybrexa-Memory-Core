import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import chatRouter from "./chat";
import notesRouter from "./notes";
import tasksRouter from "./tasks";
import journalRouter from "./journal";
import projectsRouter from "./projects";
import goalsRouter from "./goals";
import memoryRouter from "./memory";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/chat", chatRouter);
router.use("/notes", notesRouter);
router.use("/tasks", tasksRouter);
router.use("/journal", journalRouter);
router.use("/projects", projectsRouter);
router.use("/goals", goalsRouter);
router.use("/memory", memoryRouter);
router.use("/dashboard", dashboardRouter);

export default router;
