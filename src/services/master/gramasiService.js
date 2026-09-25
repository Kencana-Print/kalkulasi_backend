const db = require("../../config/database");

// Ambil semua data gramasi
const getAll = async () => {
  const [rows] = await db.query(
    `SELECT gramasi FROM tgramasi ORDER BY gramasi`
  );
  return rows;
};

// Simpan data gramasi baru
const saveData = async ({ gramasi }) => {
  const value = gramasi?.trim();
  if (!value) throw new Error("Gramasi harus diisi.");

  // Cek jika gramasi sudah pernah diinput
  const [[cek]] = await db.query(
    `SELECT COUNT(*) AS c FROM tgramasi WHERE gramasi = ?`,
    [value]
  );
  if (cek.c > 0) throw new Error(`Gramasi "${value}" sudah diinput.`);

  await db.query(`INSERT INTO tgramasi (gramasi) VALUES (?)`, [value]);
  return { gramasi: value };
};

// Hapus data gramasi
const deleteData = async (gramasi) => {
  const [[cek]] = await db.query(
    `SELECT COUNT(*) AS c FROM tgramasi WHERE gramasi = ?`,
    [gramasi]
  );
  if (cek.c === 0) throw new Error("Data tidak ditemukan.");

  await db.query(`DELETE FROM tgramasi WHERE gramasi = ?`, [gramasi]);
};

module.exports = { getAll, saveData, deleteData };