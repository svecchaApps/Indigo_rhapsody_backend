const express = require("express");
const router = express.Router();
const trendWatchController = require("../controllers/trendWatchController");
const { authMiddleware } = require("../middleware/authMiddleware");

// ── PUBLIC ──────────────────────────────────────────────────────────────────
// Must be defined before /:id to avoid route conflicts
router.get("/admin/all", authMiddleware, trendWatchController.getAllTrendGroupsAdmin);
router.get("/", trendWatchController.getActiveTrendGroups);
router.get("/:id", trendWatchController.getTrendGroupById);

// ── ADMIN ────────────────────────────────────────────────────────────────────
router.post("/reorder", authMiddleware, trendWatchController.reorderTrendGroups);
router.post("/", authMiddleware, trendWatchController.createTrendGroup);
router.put("/:id", authMiddleware, trendWatchController.updateTrendGroup);
router.patch("/:id/toggle", authMiddleware, trendWatchController.toggleTrendGroup);
router.delete("/:id", authMiddleware, trendWatchController.deleteTrendGroup);

module.exports = router;
