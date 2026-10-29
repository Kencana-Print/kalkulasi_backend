const authService = require("../services/authService");
const db = require("../config/database");

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res
        .status(400)
        .json({
          success: false,
          message: "Username dan password wajib diisi.",
        });

    const data = await authService.login(username, password);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
};

const me = async (req, res) => {
  try {
    let menus = [];
    if (req.user?.kode) {
      const [menuRows] = await db.query(
        `SELECT hak_men_id AS menu_id,
                IFNULL(hak_men_view,   'N') AS hak_view,
                IFNULL(hak_men_insert, 'N') AS hak_insert,
                IFNULL(hak_men_edit,   'N') AS hak_edit,
                IFNULL(hak_men_delete, 'N') AS hak_delete,
                IFNULL(hak_men_save,   'N') AS hak_save,
                'N' AS hak_print
         FROM thakuser
         WHERE hak_user_kode = ?`,
        [req.user.kode]
      );
      menus = menuRows;
    }
    res.status(200).json({ success: true, data: { ...req.user, menus } });
  } catch (e) {
    res.status(200).json({ success: true, data: req.user });
  }
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword)
      return res
        .status(400)
        .json({ success: false, message: "Password lama wajib diisi." });
    if (!newPassword)
      return res
        .status(400)
        .json({ success: false, message: "Password baru wajib diisi." });
    if (newPassword !== confirmPassword)
      return res
        .status(400)
        .json({ success: false, message: "Konfirmasi password tidak cocok." });

    const userKode = req.user?.kode;
    if (!userKode)
      return res.status(401).json({ success: false, message: "Unauthorized." });

    await authService.changePassword(userKode, oldPassword, newPassword);
    res.json({ success: true, message: "Password berhasil diganti." });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

module.exports = { login, me, changePassword };
