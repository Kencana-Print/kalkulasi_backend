const svc = require("../../services/master/hargaService");

const getAll = async (req, res) => {
  try {
    res.json({ success: true, data: await svc.getAll() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getById = async (req, res) => {
  try {
    res.json({ success: true, data: await svc.getById(req.params.kode) });
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
    const userId = req.user?.kduser || req.user?.id || "SYSTEM";
    const result = await svc.saveData(req.body, userId);
    res.json({
      success: true,
      data: result,
      message: `Berhasil disimpan dengan kode ${result.kode}`,
    });
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

module.exports = { getAll, getById, getOptions, saveData, deleteData };