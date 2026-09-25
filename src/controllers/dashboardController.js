const svc = require("../services/dashboardService");

const getSummary = async (req, res) => {
  try {
    const cabang = req.query.cabang || req.user.cabang;
    const data = await svc.getSummary(cabang);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getTodayActivity = async (req, res) => {
  try {
    const data = await svc.getTodayActivity();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { getSummary, getTodayActivity };
