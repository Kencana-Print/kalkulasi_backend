const express = require("express");
const router = express.Router();
const ctrl = require("../../controllers/master/hargaController");
const {
  verifyToken,
  checkPermission,
} = require("../../middleware/authMiddleware");

// Sesuaikan menuId dengan ID menu Master Harga di database Anda
const menuId = 8; 

router.get("/", verifyToken, checkPermission(menuId, "view"), ctrl.getAll);
router.get("/options", verifyToken, checkPermission(menuId, "view"), ctrl.getOptions);
router.get("/:kode", verifyToken, checkPermission(menuId, "view"), ctrl.getById);
router.post("/save", verifyToken, checkPermission(menuId, "insert"), ctrl.saveData);
router.delete("/:kode", verifyToken, checkPermission(menuId, "delete"), ctrl.deleteData);

module.exports = router;