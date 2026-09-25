const express = require("express");
const router = express.Router();
const ctrl = require("../../controllers/master/biayaController");
const {
  verifyToken,
  checkPermission,
} = require("../../middleware/authMiddleware");

// men_id 12 = frmBrowBpengerjaan (Master Biaya Pengerjaan) di tmenu
const menuId = 12;

router.get("/", verifyToken, checkPermission(menuId, "view"), ctrl.getAll);
router.get("/options", verifyToken, checkPermission(menuId, "view"), ctrl.getOptions);
router.get("/:kode", verifyToken, checkPermission(menuId, "view"), ctrl.getDetail);
router.post("/save", verifyToken, checkPermission(menuId, "insert"), ctrl.saveData);
router.put("/:kode", verifyToken, checkPermission(menuId, "edit"), ctrl.saveData);
router.delete("/:kode", verifyToken, checkPermission(menuId, "delete"), ctrl.deleteData);

module.exports = router;
