const express = require("express");
const router = express.Router();
const controller = require("../../controllers/transaksi/kalkulasiFormController");
const {
  verifyToken,
  checkPermission,
} = require("../../middleware/authMiddleware");

const MENU_ID = 22; // ID Menu Kalkulasi Harga

// ── Browse Kalkulasi (UBrowsekalkulasi) ──
router.get(
  "/browse",
  verifyToken,
  checkPermission(MENU_ID, "view"),
  controller.getBrowse,
);
router.delete(
  "/:nomor",
  verifyToken,
  checkPermission(MENU_ID, "delete"),
  controller.deleteKalkulasi,
);

// ── Detail & simpan — level record, dikunci checkPermission ──
router.get(
  "/detail",
  verifyToken,
  checkPermission(MENU_ID, "view"),
  controller.getDetail,
);
router.get(
  "/minta-harga",
  verifyToken,
  checkPermission(MENU_ID, "view"),
  controller.getMintaHarga,
);
router.get(
  "/nego",
  verifyToken,
  checkPermission(MENU_ID, "view"),
  controller.getNego,
);

router.post(
  "/save",
  verifyToken,
  checkPermission(MENU_ID, "insert"),
  controller.save,
);
router.put(
  "/save",
  verifyToken,
  checkPermission(MENU_ID, "edit"),
  controller.save,
);

// ── Lookup / referensi — cukup verifyToken, sama pola dengan
// init-sizes/standar-ukuran/mkb-detail/komponen-master di spkFormRoutes ──
router.get("/ppn-default", verifyToken, controller.getPpnGlobal);

router.get("/model-kerja/cari", verifyToken, controller.searchModelKerja);
router.get("/model-kerja", verifyToken, controller.getModelKerja);

router.get("/gramasi", verifyToken, controller.getGramasi);
router.get("/harga-kain", verifyToken, controller.getHargaKain);
router.get("/rib-babaran", verifyToken, controller.getRibBabaran);
router.get("/krah-manset", verifyToken, controller.getKrahManset);
router.get("/komponen-master", verifyToken, controller.getKomponenMaster);

router.get("/biaya-pengerjaan", verifyToken, controller.getBiayaTunggal);
router.get("/biaya-pengerjaan/min", verifyToken, controller.getBiayaMin);
router.get("/biaya-pengerjaan/list", verifyToken, controller.listBiayaPengerjaan);
router.get("/sublim-ket", verifyToken, controller.getKetSublim);
router.get("/sublim-harga", verifyToken, controller.getHargaSublim);

router.get("/margin", verifyToken, controller.getMargin);
router.get("/min-cetak", verifyToken, controller.getMinCetak);

// Proxy gambar desain Minta Harga — SENGAJA tanpa verifyToken karena
// <img> browser tidak bisa membawa header JWT (lihat controller).
router.get("/gambar-mintaharga/:nomor", controller.getGambarMintaharga);

module.exports = router;
