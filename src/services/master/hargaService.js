const db = require("../../config/database");

// Ambil semua data harga kain
const getAll = async () => {
  const [rows] = await db.query(
    `SELECT h.hk_kode AS kode, 
            h.hk_jeniskain AS jenisKain, 
            h.hk_warna AS warna, 
            h.hk_hargapabrik AS hargaPabrik, 
            h.hk_hargatoko AS hargaToko
     FROM thargakain h
     ORDER BY h.hk_kode, h.hk_jeniskain`
  );
  return rows;
};

// Ambil detail harga berdasarkan kode
const getById = async (kode) => {
  const [[row]] = await db.query(
    `SELECT hk_kode AS kode, 
            hk_jeniskain AS jenisKain, 
            hk_warna AS warna, 
            hk_hargapabrik AS hargaPabrik, 
            hk_hargatoko AS hargaToko
     FROM thargakain 
     WHERE hk_kode = ?`,
    [kode]
  );
  if (!row) throw new Error("Data harga tidak ditemukan.");
  return row;
};

// Ambil list dropdown Warna dan Jenis Kain
const getOptions = async () => {
  const [warnaRows] = await db.query(
    `SELECT warna FROM twarna ORDER BY warna`
  );
  const [jenisKainRows] = await db.query(
    `SELECT JenisKain AS jenisKain FROM tjeniskain ORDER BY JenisKain`
  );

  return {
    warna: warnaRows.map((r) => r.warna),
    jenisKain: jenisKainRows.map((r) => r.jenisKain),
  };
};

// Auto-generate nomor kode (HK-xxxx)
const getNomor = async () => {
  const [[row]] = await db.query(
    `SELECT IFNULL(MAX(RIGHT(hk_kode, 4)), 0) + 1 AS nextNum FROM thargakain`
  );
  const nextNum = row ? row.nextNum : 1;
  const strNum = String(nextNum).padStart(4, "0");
  return `HK-${strNum}`;
};

// Simpan/Update Data
const saveData = async (payload, userId) => {
  const { isEdit, kode, jenisKain, warna, hargaPabrik, hargaToko } = payload;

  if (Number(hargaPabrik) <= 0) {
    throw new Error("Harga pabrik harus diisi.");
  }

  if (isEdit) {
    await db.query(
      `UPDATE thargakain SET
        hk_jeniskain = ?,
        hk_warna = ?,
        hk_hargatoko = ?,
        hk_hargapabrik = ?,
        user_modified = ?,
        date_modified = NOW()
       WHERE hk_kode = ?`,
      [jenisKain, warna, hargaToko || 0, hargaPabrik, userId || "SYSTEM", kode]
    );
    return { kode };
  } else {
    // Cek duplikasi jenis kain & warna
    const [[cek]] = await db.query(
      `SELECT hk_kode FROM thargakain WHERE hk_jeniskain = ? AND hk_warna = ?`,
      [jenisKain, warna]
    );
    if (cek) {
      throw new Error(
        `Jenis kain dengan Warna tersebut sudah diinput dengan kode = ${cek.hk_kode}`
      );
    }

    const newKode = await getNomor();
    await db.query(
      `INSERT INTO thargakain 
        (hk_kode, hk_jeniskain, hk_warna, hk_hargatoko, hk_hargapabrik, user_create, date_create)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [newKode, jenisKain, warna, hargaToko || 0, hargaPabrik, userId || "SYSTEM"]
    );
    return { kode: newKode };
  }
};

// Hapus Data
const deleteData = async (kode) => {
  await db.query(`DELETE FROM thargakain WHERE hk_kode = ?`, [kode]);
};

module.exports = {
  getAll,
  getById,
  getOptions,
  saveData,
  deleteData,
};