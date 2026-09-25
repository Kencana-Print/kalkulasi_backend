const svc = require("../../services/transaksi/mintahargaService");

const getDivisi = async (req, res) => {
  try {
    const data = await svc.getDivisi();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getBrowse = async (req, res) => {
  try {
    const { startDate, endDate, divisi, status } = req.query;
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ success: false, message: "startDate dan endDate wajib." });
    }
    const data = await svc.getBrowse(startDate, endDate, divisi, status);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const deleteKalkulasi = async (req, res) => {
  try {
    const { nomor } = req.params;
    const { nomorKalkulasi } = req.body;
    await svc.deleteKalkulasi(nomor, nomorKalkulasi);
    res.json({ success: true, message: "Kalkulasi berhasil dihapus." });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

const deletePenawaran1 = async (req, res) => {
  try {
    const { nomor } = req.params;
    await svc.deletePenawaran1(nomor);
    res.json({ success: true, message: "Penawaran 1 berhasil dihapus." });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

const deletePenawaran2 = async (req, res) => {
  try {
    const { nomor } = req.params;
    await svc.deletePenawaran2(nomor);
    res.json({ success: true, message: "Penawaran 2 berhasil dihapus." });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

module.exports = {
  getDivisi,
  getBrowse,
  deleteKalkulasi,
  deletePenawaran1,
  deletePenawaran2,
};