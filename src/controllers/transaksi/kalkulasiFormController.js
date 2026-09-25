const service = require("../../services/transaksi/kalkulasiFormService");

// Base URL server file gambar desain Minta Harga (static host, tanpa API).
const IMAGE_BASE =
  process.env.MINTAHARGA_IMAGE_BASE ||
  "http://103.94.238.252:8182/images/mintaharga";

// --- Proxy gambar desain Minta Harga (<nomorMH>.jpg) ---
// <img> browser tidak bisa membawa header JWT, jadi endpoint ini publik
// (tanpa verifyToken). Nomor divalidasi ketat agar tak bisa dipakai SSRF,
// dan hanya file .jpg di bawah IMAGE_BASE yang boleh diambil.
const getGambarMintaharga = (req, res) => {
  const nomor = String(req.params.nomor || "");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,60}$/.test(nomor)) {
    return res
      .status(400)
      .json({ success: false, message: "Nomor gambar tidak valid." });
  }
  // Frontend sudah menyertakan ".jpg" di URL (…/MH.2026.3136.jpg) — jangan
  // ditambah lagi. Hanya tambahkan ekstensi bila nomor belum punya.
  const file = /\.(jpe?g|png|gif|webp|bmp)$/i.test(nomor) ? nomor : `${nomor}.jpg`;
  const target = `${IMAGE_BASE}/${file}`;
  const client = target.startsWith("https:") ? require("https") : require("http");
  try {
    const proxy = client.get(target, (upstream) => {
      if (upstream.statusCode !== 200) {
        upstream.resume();
        return res
          .status(404)
          .json({ success: false, message: "Gambar tidak ditemukan." });
      }
      res.setHeader(
        "Content-Type",
        upstream.headers["content-type"] || "image/jpeg",
      );
      res.setHeader("Cache-Control", "public, max-age=86400");
      upstream.pipe(res);
    });
    proxy.on("error", () =>
      res
        .status(502)
        .json({ success: false, message: "Server gambar tidak terjangkau." }),
    );
    proxy.setTimeout(10000, () => proxy.destroy(new Error("timeout")));
  } catch (e) {
    res
      .status(502)
      .json({ success: false, message: "Server gambar tidak terjangkau." });
  }
};

// --- Detail Kalkulasi (mode edit) ---
const getDetail = async (req, res) => {
  try {
    const { nomor } = req.query;
    if (!nomor)
      return res
        .status(400)
        .json({ success: false, message: "Nomor Kalkulasi wajib diisi." });

    const data = await service.getDetail(nomor);
    res.json({ success: true, data });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

// --- Ambil data Minta Harga sebagai dasar create Kalkulasi baru ---
const getMintaHarga = async (req, res) => {
  try {
    const { nomor } = req.query;
    if (!nomor)
      return res
        .status(400)
        .json({ success: false, message: "Nomor Minta Harga wajib diisi." });

    const data = await service.getMintaHarga(nomor);
    res.json({ success: true, data });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

// --- Histori Nego (skema legacy, read-only) ---
const getNego = async (req, res) => {
  try {
    const { nomor } = req.query;
    if (!nomor)
      return res
        .status(400)
        .json({ success: false, message: "Nomor Kalkulasi (nego) wajib diisi." });

    const data = await service.getNego(nomor);
    res.json({ success: true, data });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

// --- Save (create & edit) — satu handler dipakai POST (insert) & PUT (edit) ---
const save = async (req, res) => {
  try {
    if (req.body.isEdit && !req.body.header?.nomor) {
      return res
        .status(400)
        .json({ success: false, message: "No. Kalkulasi wajib diisi." });
    }

    // payload JWT berisi { kode, nama, cabang, level, ... } — TIDAK ada
    // `username`; pakai `kode` agar user_create/user_modified tidak NULL.
    const result = await service.saveData(req.body, req.user?.kode || "SYSTEM");
    res.json({
      success: true,
      data: result,
      message: req.body.isEdit
        ? "Kalkulasi berhasil diubah."
        : "Kalkulasi baru berhasil dibuat.",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getPpnGlobal = async (req, res) => {
  try {
    res.json({ success: true, data: await service.getPpnGlobal() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const searchModelKerja = async (req, res) => {
  try {
    res.json({ success: true, data: await service.searchModelKerja(req.query.q) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getModelKerja = async (req, res) => {
  try {
    const { khKode } = req.query;
    if (!khKode)
      return res
        .status(400)
        .json({ success: false, message: "Kode Model Kerja wajib diisi." });

    const data = await service.getModelKerja(khKode);
    res.json({ success: true, data });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

const getGramasi = async (req, res) => {
  try {
    const { khKode, jenisKain, lengan, bagian } = req.query;
    res.json({ success: true, data: await service.getGramasi({ khKode, jenisKain, lengan, bagian }) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getHargaKain = async (req, res) => {
  try {
    const { jenisKain, warna, pabrik } = req.query;
    res.json({
      success: true,
      data: await service.getHargaKain({ jenisKain, warna, pabrik: pabrik === "true" }),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRibBabaran = async (req, res) => {
  try {
    const { leher, lengan } = req.query;
    res.json({
      success: true,
      data: await service.getRibBabaran({ leher: leher === "true", lengan: lengan === "true" }),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getKrahManset = async (req, res) => {
  try {
    res.json({ success: true, data: await service.getKrahManset() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getKomponenMaster = async (req, res) => {
  try {
    res.json({ success: true, data: await service.getKomponenMaster() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBiayaTunggal = async (req, res) => {
  try {
    const { jenis, ket } = req.query;
    res.json({ success: true, data: await service.getBiayaTunggal({ jenis, ket }) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBiayaMin = async (req, res) => {
  try {
    res.json({ success: true, data: await service.getBiayaMin(req.query.jenis) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const listBiayaPengerjaan = async (req, res) => {
  try {
    const { jenis, grade } = req.query;
    res.json({ success: true, data: await service.listBiayaPengerjaan({ jenis, grade }) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getKetSublim = async (req, res) => {
  try {
    res.json({ success: true, data: await service.getKetSublim() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getHargaSublim = async (req, res) => {
  try {
    const { ket, grade } = req.query;
    res.json({ success: true, data: await service.getHargaSublim({ ket, grade }) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMargin = async (req, res) => {
  try {
    const { qtyOrder, grade } = req.query;
    res.json({ success: true, data: await service.getMargin({ qtyOrder, grade }) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMinCetak = async (req, res) => {
  try {
    const { qtyOrder, grade } = req.query;
    res.json({ success: true, data: await service.getMinCetak({ qtyOrder, grade }) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBrowse = async (req, res) => {
  try {
    const { startDate, endDate, jenis } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ success: false, message: 'startDate dan endDate wajib.' });
    const data = await service.getBrowse({ startDate, endDate, jenis });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteKalkulasi = async (req, res) => {
  try {
    const { nomor } = req.params;
    await service.deleteKalkulasi(decodeURIComponent(nomor));
    res.json({ success: true, message: 'Kalkulasi berhasil dihapus.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDetail,
  getMintaHarga,
  getNego,
  getGambarMintaharga,
  save,
  getPpnGlobal,
  searchModelKerja,
  getModelKerja,
  getGramasi,
  getHargaKain,
  getRibBabaran,
  getKrahManset,
  getKomponenMaster,
  getBiayaTunggal,
  getBiayaMin,
  listBiayaPengerjaan,
  getKetSublim,
  getHargaSublim,
  getMargin,
  getMinCetak,
  getBrowse,
  deleteKalkulasi,
};
