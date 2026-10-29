const express = require("express");
const router = express.Router();
const ctrl = require("../../controllers/master/jenisController");
const {
  verifyToken,
  checkPermission,
} = require("../../middleware/authMiddleware");

// men_id 6 = frmBrowJenis (Master Jenis Kain) di tmenu
const menuId = 6;

router.get("/", verifyToken, checkPermission(menuId, "view"), ctrl.getAll);
router.post(
  "/save",
  verifyToken,
  checkPermission(menuId, "save"),
  ctrl.saveData
);
router.delete(
  "/:nama",
  verifyToken,
  checkPermission(menuId, "delete"),
  ctrl.deleteData
);

module.exports = router;