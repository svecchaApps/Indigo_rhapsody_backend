const express = require("express");
const router = express.Router();
const categoryController = require("./../controllers/categoryContoller");
const multer = require("multer");
const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");
const upload = multer({ storage: multer.memoryStorage() });
router.post("/", authMiddleware, roleMiddleware(["Admin"]), categoryController.createCategory);
router.get("/", categoryController.getCategories);
router.put(
  "/category/:categoryId",
  authMiddleware,
  upload.single("image"),
  roleMiddleware(["Admin"]),
  categoryController.updateCategory
);
router.delete(
  "/category/:categoryId",
  authMiddleware,
  roleMiddleware(["Admin"]),
  categoryController.deleteCategory
);
//testing the deployment

module.exports = router;
