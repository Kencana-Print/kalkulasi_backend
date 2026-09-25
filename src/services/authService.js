const db = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/**
 * Login user
 * Sesuaikan nama tabel & kolom dengan DB Kalkulasi Anda.
 * Contoh menggunakan tabel tuser yang sama seperti garmen.
 */
const login = async (username, password) => {
  const [rows] = await db.query(
    `SELECT user_kode, user_nama, user_password, user_cabang, user_cabang_list, user_aktif
      FROM tuser
    WHERE UPPER(user_kode) = UPPER(?) LIMIT 1`,
    [username],
  );

  if (rows.length === 0) throw new Error("Username atau password salah.");

  const user = rows[0];

  if (user.user_aktif !== 0 && user.user_aktif !== "0")
    throw new Error("User sudah pasif.");

  const valid = password === user.user_password;
  if (!valid) throw new Error("Username atau password salah.");

  // Cabang list: kalau ada isinya di DB, split jadi array; kalau tidak, cuma cabang sendiri
  const cabangList = user.user_cabang_list
    ? user.user_cabang_list
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
    : [user.user_cabang || ""];

  const payload = {
    kode: user.user_kode,
    nama: user.user_nama,
    level: "USER",
    cabang: user.user_cabang || "",
    cabangList, // ← baru
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });

  let menus = [];
  try {
    const [menuRows] = await db.query(
      `SELECT hak_men_id AS menu_id,
              IFNULL(hak_men_view,   'N') AS hak_view,
              IFNULL(hak_men_insert, 'N') AS hak_insert,
              IFNULL(hak_men_edit,   'N') AS hak_edit,
              IFNULL(hak_men_delete, 'N') AS hak_delete,
              'N' AS hak_print
       FROM thakuser
       WHERE hak_user_kode = ?`,
      [user.user_kode],
    );
    menus = menuRows;
  } catch {
    menus = [];
  }

  return { token, user: { ...payload, menus } };
};

const changePassword = async (userKode, oldPassword, newPassword) => {
  // Cek password lama
  const [[user]] = await db.query(
    `SELECT user_kode, user_password
     FROM tuser
     WHERE UPPER(user_kode) = UPPER(?)`,
    [userKode],
  );

  if (!user) throw new Error("User tidak ditemukan.");
  if (user.user_password !== oldPassword)
    throw new Error("Password lama salah.");

  // Update password baru
  await db.query(
    `UPDATE tuser SET user_password = ?, date_modify = NOW()
     WHERE user_kode = ?`,
    [newPassword, user.user_kode],
  );

  return { success: true };
};

module.exports = { login, changePassword };
