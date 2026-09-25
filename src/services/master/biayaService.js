const db = require("../../config/database");

// Replikasi ufrmBpengerjaan.pas + UBrowseBpengerjaan.pas:
// - Kode otomatis BP-XXX (replikasi getnomor: max 3 digit kanan + 1001)
// - Jenis wajib pilih dari tjenispekerjaan; satuan dari tsatuan
//   (JAHIT → PCS, selainnya → CM2)
// - Keterangan wajib; kombinasi jenis+keterangan unik saat tambah
// - Tarif medium & premium wajib > 0; biaya minimal opsional (default 0)

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

const getAll = async () => {
  const [rows] = await db.query(
    `SELECT bp_kode AS kode, bp_jenis AS jenis, bp_ket AS keterangan,
            bp_satuan AS satuan, bp_medium AS medium, bp_premium AS premium,
            bp_min AS biayaMinimal
     FROM tbiayapengerjaan ORDER BY bp_jenis, bp_ket`
  );
  return rows.map((r) => ({ ...r, medium: num(r.medium), premium: num(r.premium), biayaMinimal: num(r.biayaMinimal) }));
};

const getDetail = async (kode) => {
  const [rows] = await db.query(
    `SELECT bp_kode AS kode, bp_jenis AS jenis, bp_ket AS keterangan,
            bp_satuan AS satuan, bp_medium AS medium, bp_premium AS premium,
            bp_min AS biayaMinimal
     FROM tbiayapengerjaan WHERE bp_kode = ?`,
    [kode]
  );
  if (!rows.length) throw new Error("Data biaya pengerjaan tidak ditemukan.");
  const r = rows[0];
  return { ...r, medium: num(r.medium), premium: num(r.premium), biayaMinimal: num(r.biayaMinimal) };
};

const getOptions = async () => {
  const [jj] = await db.query(`SELECT pekerjaan FROM tjenispekerjaan ORDER BY pekerjaan`);
  const [st] = await db.query(`SELECT satuan FROM tsatuan ORDER BY satuan`);
  return {
    jenis: jj.map((r) => r.pekerjaan),
    satuan: st.map((r) => r.satuan),
  };
};

const genKode = async (conn) => {
  const [[r]] = await conn.query(
    `SELECT IFNULL(MAX(RIGHT(bp_kode, 3)), 0) AS jumlah FROM tbiayapengerjaan`
  );
  return "BP-" + String(Number(r.jumlah) + 1001).slice(-3);
};

const saveData = async (payload, userKode) => {
  const jenis = payload.jenis?.trim();
  const keterangan = payload.keterangan?.trim();
  const medium = num(payload.medium);
  const premium = num(payload.premium);
  const biayaMinimal = num(payload.biayaMinimal);
  // Satuan mengikuti aturan cbbJenisChange: JAHIT → PCS, selainnya → CM2
  const satuan = jenis === "JAHIT" ? "PCS" : "CM2";

  if (!jenis) throw new Error("Jenis pengerjaan kosong, tidak dapat disimpan");
  if (!keterangan) throw new Error("Keterangan harus di isi.");
  if (medium <= 0) throw new Error("Tarif Medium harus diisi.");
  if (premium <= 0) throw new Error("Tarif Premium harus diisi.");

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    let kode = payload.kode;

    if (kode) {
      // ── Mode ubah ──
      const [[ada]] = await conn.query(`SELECT COUNT(*) AS c FROM tbiayapengerjaan WHERE bp_kode = ?`, [kode]);
      if (ada.c === 0) throw new Error("Data biaya pengerjaan tidak ditemukan.");
      await conn.query(
        `UPDATE tbiayapengerjaan SET bp_ket = ?, bp_jenis = ?, bp_medium = ?, bp_premium = ?,
                bp_min = ?, bp_satuan = ?, user_modified = ?, date_modified = NOW()
         WHERE bp_kode = ?`,
        [keterangan, jenis, medium, premium, biayaMinimal, satuan, userKode || null, kode]
      );
    } else {
      // ── Mode tambah: kombinasi jenis+keterangan harus unik ──
      const [cek] = await conn.query(
        `SELECT bp_kode FROM tbiayapengerjaan WHERE bp_jenis = ? AND bp_ket = ?`,
        [jenis, keterangan]
      );
      if (cek.length > 0)
        throw new Error(`Jenis pengerjaan dengan keterangan tersebut sudah diinput dengan kode=${cek[0].bp_kode}`);
      kode = await genKode(conn);
      await conn.query(
        `INSERT INTO tbiayapengerjaan
           (bp_kode, bp_ket, bp_jenis, bp_medium, bp_premium, bp_min, bp_satuan, user_create, date_create)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [kode, keterangan, jenis, medium, premium, biayaMinimal, satuan, userKode || null]
      );
    }

    await conn.commit();
    return { kode };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};

const deleteData = async (kode) => {
  const [[ada]] = await db.query(`SELECT COUNT(*) AS c FROM tbiayapengerjaan WHERE bp_kode = ?`, [kode]);
  if (ada.c === 0) throw new Error("Data tidak ditemukan.");
  await db.query(`DELETE FROM tbiayapengerjaan WHERE bp_kode = ?`, [kode]);
};

module.exports = { getAll, getDetail, getOptions, saveData, deleteData };
