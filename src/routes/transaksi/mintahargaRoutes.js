const express = require("express");
const router = express.Router();
const ctrl = require("../../controllers/transaksi/mintahargaController");
const {
  verifyToken,
  checkPermission,
} = require("../../middleware/authMiddleware");

// Samakan ID Menu sesuai database permission sistem Anda (misal ID = 22)
const menuId = 22; 

// Di mintahargaRoutes.js
router.get("/divisi", verifyToken, ctrl.getDivisi);
router.get("/", verifyToken, checkPermission(menuId, "view"), ctrl.getBrowse);

router.post(
  "/delete-kalkulasi/:nomor",
  verifyToken,
  checkPermission(menuId, "delete"),
  ctrl.deleteKalkulasi
);

router.post(
  "/delete-penawaran1/:nomor",
  verifyToken,
  checkPermission(menuId, "delete"),
  ctrl.deletePenawaran1
);

router.post(
  "/delete-penawaran2/:nomor",
  verifyToken,
  checkPermission(menuId, "delete"),
  ctrl.deletePenawaran2
);

module.exports = router;