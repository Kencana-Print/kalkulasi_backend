const db = require("../../config/database");

// Replikasi ufrmKomponen.pas + UBrowseKomponen.pas:
// - Browse: SELECT Komponen FROM tkomponen ORDER BY no
// - Form: 1 field (komponen, uppercase, maks 50), cek duplikat saat insert,
//   tanpa cek referensi saat hapus (nilai tersimpan bebas di detail kalkulasi).
const getAll = async () => {
  const [rows] = await db.query(
    `SELECT komponen AS nama FROM tkomponen ORDER BY no, komponen`
  );
  return rows;
};

const saveData = async ({ nama }) => {
  if (!nama?.trim()) throw new Error("Komponen kosong, tidak dapat disimpan.");

  const [[cek]] = await db.query(
    `SELECT COUNT(*) AS c FROM tkomponen WHERE komponen = ?`,
    [nama.trim()]
  );
  if (cek.c > 0) throw new Error(`Komponen "${nama.trim()}" sudah diinput.`);

  await db.query(`INSERT INTO tkomponen (komponen) VALUES (?)`, [nama.trim()]);
  return { nama: nama.trim() };
};

const deleteData = async (nama) => {
  const [[cekData]] = await db.query(
    `SELECT COUNT(*) AS c FROM tkomponen WHERE komponen = ?`,
    [nama]
  );
  if (cekData.c === 0) throw new Error("Data tidak ditemukan.");

  await db.query(`DELETE FROM tkomponen WHERE komponen = ?`, [nama]);
};

module.exports = { getAll, saveData, deleteData };
