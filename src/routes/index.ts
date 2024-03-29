import express from "express";
import account from "./account.js";
import auth from "./auth.js";
import projects from "./projects.js";

const router = express.Router();

router.use("/auth", auth);
router.use("/projects", projects);
router.use("/account", account);

router.get("/", (req, res) => res.send("Sample Node API Version1"));
router.get("/health", (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: "OK",
    timestamp: Date.now(),
  };
  res.send(healthCheck);
});

export default router;
