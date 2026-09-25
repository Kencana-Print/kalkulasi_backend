const express = require("express");
const cors = require("cors");
const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
require("dotenv").config();
const systemCtrl = require("./controllers/systemController");

// ── Core Routes ──
const authRoutes = require("./routes/authRoutes");
const lookupRoutes = require("./routes/lookupRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const imageRoutes = require("./routes/imageRoutes");
const masterUserRoutes = require("./routes/tools/masterUserRoutes");
const masterUserFormRoutes = require("./routes/tools/masterUserFormRoutes");

// ── Master Routes ──
const jenisRoutes = require("./routes/master/jenisRoutes");
const HargaRoutes = require("./routes/master/hargaRoutes");
const gramasiRoutes = require("./routes/master/gramasiRoutes");
const komponenRoutes = require("./routes/master/komponenRoutes");
const pekerjaanRoutes = require("./routes/master/pekerjaanRoutes");
const biayaRoutes = require("./routes/master/biayaRoutes");
// const costCenterRoutes = require("./routes/master/costCenterRoutes");

// ── Transaksi Routes ──
const mintahargaRoutes = require("./routes/transaksi/mintahargaRoutes"); // Sesuaikan path folder Anda
const kalkulasiFormRoutes = require("./routes/transaksi/kalkulasiFormRoutes");
// const uangMukaRoutes = require("./routes/transaksi/uangMukaRoutes");
// const uangMukaFormRoutes = require("./routes/transaksi/uangMukaFormRoutes");
// const uangMukaPenyelesaianRoutes = require("./routes/transaksi/uangMukaPenyelesaianRoutes");
// const bkmRoutes = require("./routes/transaksi/bkmRoutes");
// const bkmFormRoutes = require("./routes/transaksi/bkmFormRoutes");
// const bkkRoutes = require("./routes/transaksi/bkkRoutes");
// const bkkFormRoutes = require("./routes/transaksi/bkkFormRoutes");
// const bbmRoutes = require("./routes/transaksi/bbmRoutes");
// const bbmFormRoutes = require("./routes/transaksi/bbmFormRoutes");
// const bbkRoutes = require("./routes/transaksi/bbkRoutes");
// const bbkFormRoutes = require("./routes/transaksi/bbkFormRoutes");
// const jurnalUmumRoutes = require("./routes/transaksi/jurnalUmumRoutes");
// const jurnalUmumFormRoutes = require("./routes/transaksi/jurnalUmumFormRoutes");
// const rekonsiliasiBankRoutes = require("./routes/transaksi/rekonsiliasiBankRoutes");
// const pengajuanTransferRoutes = require("./routes/transaksi/pengajuanTransferRoutes");
// const pengajuanTransferFormRoutes = require("./routes/transaksi/pengajuanTransferFormRoutes");
// const terimaSetoranRoutes = require("./routes/transaksi/terimaSetoranRoutes");
// const terimaSetoranFormRoutes = require("./routes/transaksi/terimaSetoranFormRoutes");
// const voucherPembayaranRoutes = require("./routes/transaksi/voucherPembayaranRoutes");
// const voucherPembayaranFormRoutes = require("./routes/transaksi/voucherPembayaranFormRoutes");
// const mutasiOutRoutes = require("./routes/transaksi/mutasiOutRoutes");
// const mutasiOutFormRoutes = require("./routes/transaksi/mutasiOutFormRoutes");

// ── Posting Routes ──
// const pembayaranCustomerRoutes = require("./routes/posting/pembayaranCustomerRoutes");
// const pembayaranCustomerFormRoutes = require("./routes/posting/pembayaranCustomerFormRoutes");
// const pembayaranCustKaosanRoutes = require("./routes/posting/pembayaranCustKaosanRoutes");
// const pembayaranCustKaosanFormRoutes = require("./routes/posting/pembayaranCustKaosanFormRoutes");

// ── Laporan Routes ──
// const listJurnalRoutes = require("./routes/laporan/listJurnalRoutes");
// const bukuBesarRoutes = require("./routes/laporan/bukuBesarRoutes");
// const kasbonBelumSelesaiRoutes = require("./routes/laporan/kasbonBelumSelesaiRoutes");
// const lapRekonsiliasiBankRoutes = require("./routes/laporan/rekonsiliasiBankRoutes");
// const stokFinanceRoutes = require("./routes/laporan/stokFinanceRoutes");
// const daftarHutangRoutes = require("./routes/laporan/daftarHutangRoutes");

const app = express();

// ── CORS ──
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      callback(null, origin); // echo back origin agar credentials bisa jalan
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use("/images", express.static(path.join(process.cwd(), "public/images")));

// Endpoint untuk cek versi backend
app.get("/api/system/info", systemCtrl.getSystemInfo);

// ── Core Routes ──
app.use("/api/auth", authRoutes);
app.use("/api/lookups", lookupRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/tools/master-user", masterUserRoutes);
app.use("/api/tools/master-user/form", masterUserFormRoutes);

// ── Master Routes ──
app.use("/api/master/jenis", jenisRoutes);
app.use("/api/master/harga", HargaRoutes);
app.use("/api/master/gramasi", gramasiRoutes);
app.use("/api/master/komponen", komponenRoutes);
app.use("/api/master/pekerjaan", pekerjaanRoutes);
app.use("/api/master/biaya", biayaRoutes);
// app.use("/api/master/cost-center", costCenterRoutes);

// ── Transaksi Routes ──
app.use("/api/transaksi/minta-harga", mintahargaRoutes);
app.use("/api/transaksi/kalkulasi/form", kalkulasiFormRoutes);
// app.use("/api/transaksi/uang-muka", uangMukaRoutes);
// app.use("/api/transaksi/uang-muka/form", uangMukaFormRoutes);
// app.use("/api/transaksi/uang-muka/selesai", uangMukaPenyelesaianRoutes);
// app.use("/api/transaksi/bkm", bkmRoutes);
// app.use("/api/transaksi/bkm/form", bkmFormRoutes);
// app.use("/api/transaksi/bkk", bkkRoutes);
// app.use("/api/transaksi/bkk/form", bkkFormRoutes);
// app.use("/api/transaksi/bbm", bbmRoutes);
// app.use("/api/transaksi/bbm/form", bbmFormRoutes);
// app.use("/api/transaksi/bbk", bbkRoutes);
// app.use("/api/transaksi/bbk/form", bbkFormRoutes);
// app.use("/api/transaksi/jurnal-umum", jurnalUmumRoutes);
// app.use("/api/transaksi/jurnal-umum/form", jurnalUmumFormRoutes);
// app.use("/api/transaksi/rekonsiliasi-bank", rekonsiliasiBankRoutes);
// app.use("/api/transaksi/pengajuan-transfer", pengajuanTransferRoutes);
// app.use("/api/transaksi/pengajuan-transfer/form", pengajuanTransferFormRoutes);
// app.use("/api/transaksi/terima-setoran", terimaSetoranRoutes);
// app.use("/api/transaksi/terima-setoran/form", terimaSetoranFormRoutes);
// app.use("/api/transaksi/voucher-pembayaran", voucherPembayaranRoutes);
// app.use("/api/transaksi/voucher-pembayaran/form", voucherPembayaranFormRoutes);
// app.use("/api/transaksi/mutasi-out", mutasiOutRoutes);
// app.use("/api/transaksi/mutasi-out/form", mutasiOutFormRoutes);

// ── Posting Routes ──
// app.use("/api/posting/pembayaran-customer", pembayaranCustomerRoutes);
// app.use("/api/posting/pembayaran-customer/form", pembayaranCustomerFormRoutes);
// app.use("/api/posting/pembayaran-cust-kaosan", pembayaranCustKaosanRoutes);
// app.use(
//   "/api/posting/pembayaran-cust-kaosan/form",
//   pembayaranCustKaosanFormRoutes,
// );

// // ── Laporan Routes ──
// app.use("/api/laporan/list-jurnal", listJurnalRoutes);
// app.use("/api/laporan/buku-besar", bukuBesarRoutes);
// app.use("/api/laporan/kasbon-belum-selesai", kasbonBelumSelesaiRoutes);
// app.use("/api/laporan/rekonsiliasi-bank", lapRekonsiliasiBankRoutes);
// app.use("/api/laporan/stok-finance", stokFinanceRoutes);
// app.use("/api/laporan/daftar-hutang", daftarHutangRoutes);

// ── Health check ──
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Kalkulasi Backend is running",
    timestamp: new Date(),
  });
});

// ── Sajikan build frontend (dist) agar API + web satu origin (syarat PWA
// & hindari mixed-content). Matikan dengan FRONTEND_DIST="" bila frontend
// diserve terpisah. ──
const FRONTEND_DIST =
  process.env.FRONTEND_DIST ||
  path.join(process.cwd(), "..", "kalkulasi_frontend", "dist");
if (FRONTEND_DIST && fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  // SPA fallback — jangan telan /api & /images
  app.get(/^\/(?!api(\/|$)|images(\/|$)).*/, (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
  console.log(`📦 Serving frontend from ${FRONTEND_DIST}`);
} else {
  console.log("⚠️  Frontend dist tidak ditemukan, hanya API yang diserve.");
}

const PORT = process.env.PORT || 8086;

// ── HTTPS (self-signed, internal). Aktif bila file cert ada.
// Regenerasi: npm run gencert ──
const SSL_KEY = process.env.SSL_KEY || path.join(process.cwd(), "certs", "kalkulasi-key.pem");
const SSL_CERT = process.env.SSL_CERT || path.join(process.cwd(), "certs", "kalkulasi-cert.pem");
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 8443);
const HTTPS_REDIRECT = (process.env.HTTPS_REDIRECT || "true").toLowerCase() === "true";

if (fs.existsSync(SSL_KEY) && fs.existsSync(SSL_CERT)) {
  const credentials = {
    key: fs.readFileSync(SSL_KEY),
    cert: fs.readFileSync(SSL_CERT),
  };
  https.createServer(credentials, app).listen(HTTPS_PORT, () => {
    console.log(`🔒 HTTPS Kalkulasi running on port ${HTTPS_PORT}`);
  });
  if (HTTPS_REDIRECT) {
    // HTTP lama tetap nyala hanya untuk redirect → HTTPS
    const redirectApp = express();
    redirectApp.use((req, res) => {
      const host = String(req.headers.host || "").split(":")[0];
      res.redirect(301, `https://${host}:${HTTPS_PORT}${req.originalUrl}`);
    });
    http.createServer(redirectApp).listen(PORT, () => {
      console.log(`↪️  HTTP :${PORT} redirect → HTTPS :${HTTPS_PORT}`);
    });
  } else {
    // Mode dev: HTTP tetap serve aplikasi normal (tanpa redirect)
    http.createServer(app).listen(PORT, () => {
      console.log(`🚀 Server Kalkulasi (HTTP dev) running on port ${PORT}`);
    });
  }
} else {
  console.log("⚠️  Cert tidak ditemukan, jalan HTTP saja.");
  app.listen(PORT, () => {
    console.log(`🚀 Server Kalkulasi running on port ${PORT}`);
  });
}
