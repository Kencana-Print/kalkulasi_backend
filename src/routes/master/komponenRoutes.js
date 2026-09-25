const express = require("express");
const router = express.Router();
const ctrl = require("../../controllers/master/komponenController");
const {
  verifyToken,
  checkPermission,
} = require("../../middleware/authMiddleware");

// men_id 9 = frmBrowKomponen (Master Komponen) di tmenu
const menuId = 9;

router.get("/", verifyToken, checkPermission(menuId, "view"), ctrl.getAll);
router.post(
  "/save",
  verifyToken,
  checkPermission(menuId, "insert"),
  ctrl.saveData
);
router.delete(
  "/:nama",
  verifyToken,
  checkPermission(menuId, "delete"),
  ctrl.deleteData
);

module.exports = router;
