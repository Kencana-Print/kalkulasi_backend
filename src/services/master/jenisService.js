const db = require("../../config/database");

const getAll = async () => {
  const [rows] = await db.query(
    `SELECT jeniskain AS nama FROM tjeniskain ORDER BY jeniskain`
  );
  return rows;
};

const saveData = async ({ nama }) => {
  if (!nama?.trim()) throw new Error("Nama jenis kain harus diisi.");

  const [[cek]] = await db.query(
    `SELECT COUNT(*) AS c FROM tjeniskain WHERE jeniskain = ?`,
    [nama.trim()]
  );
  if (cek.c > 0) throw new Error(`Jenis kain "${nama.trim()}" sudah ada.`);

  await db.query(`INSERT INTO tjeniskain (jeniskain) VALUES (?)`, [
    nama.trim(),
  ]);
  return { nama: nama.trim() };
};

const deleteData = async (nama) => {
  // 1. Cek keterkaitan dengan tabel master harga kain (thargakain)
  const [[cekHarga]] = await db.query(
    `SELECT COUNT(*) AS c FROM thargakain WHERE hk_jeniskain = ?`,
    [nama]
  );
  if (cekHarga.c > 0) {
    throw new Error(
      "Jenis kain tersebut masih terpakai di master harga kainnya."
    );
  }

  // 2. Cek keberadaan data
  const [[cekData]] = await db.query(
    `SELECT COUNT(*) AS c FROM tjeniskain WHERE jeniskain = ?`,
    [nama]
  );
  if (cekData.c === 0) throw new Error("Data tidak ditemukan.");

  // 3. Hapus data
  await db.query(`DELETE FROM tjeniskain WHERE jeniskain = ?`, [nama]);
};

module.exports = { getAll, saveData, deleteData };