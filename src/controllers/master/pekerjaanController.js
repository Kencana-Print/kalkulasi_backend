const svc = require("../../services/master/pekerjaanService");

const getAll = async (req, res) => {
  try {
    res.json({ success: true, data: await svc.getAll() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getDetail = async (req, res) => {
  try {
    res.json({ success: true, data: await svc.getDetail(req.params.kode) });
  } catch (e) {
    res.status(404).json({ success: false, message: e.message });
  }
};

const getOptions = async (req, res) => {
  try {
    res.json({ success: true, data: await svc.getOptions() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const saveData = async (req, res) => {
  try {
    // PUT /:kode (ubah) — kunci dari URL agar tidak bisa dibelokkan via body
    const payload = { ...req.body };
    if (req.params.kode) payload.kode = req.params.kode;
    const data = await svc.saveData(payload, req.user?.kode);
    res.json({ success: true, data, message: `Berhasil disimpan dengan kode ${data.kode}.` });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

const deleteData = async (req, res) => {
  try {
    await svc.deleteData(req.params.kode);
    res.json({ success: true, message: "Berhasil dihapus." });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

module.exports = { getAll, getDetail, getOptions, saveData, deleteData };
