const express = require("express");
const router = express.Router();
const ctrl = require("../../controllers/master/gramasiController");
const {
  verifyToken,
  checkPermission,
} = require("../../middleware/authMiddleware");

// Sesuaikan menuId dengan ID Menu Master Gramasi di database Anda
const menuId = 8;

router.get("/", verifyToken, checkPermission(menuId, "view"), ctrl.getAll);
router.post(
  "/save",
  verifyToken,
  checkPermission(menuId, "insert"),
  ctrl.saveData
);
router.delete(
  "/:gramasi",
  verifyToken,
  checkPermission(menuId, "delete"),
  ctrl.deleteData
);

module.exports = router;