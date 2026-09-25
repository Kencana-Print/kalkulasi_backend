const db = require("../../config/database");

// Replikasi ufrmPekerjaan.pas + UBrowsePekerjaan.pas:
// - Header: tkerja_hdr (kh_kode auto KH-XXXX, kh_nama unik, kh_warna 1=1 Warna / 2=2 Warna, kh_laba default 15)
// - Detail: tkerja_dtl (kd_jeniskain/lengan/gramasi wajib pilih dari master, kd_babaran & kd_babaranlengan angka)
// - Browse master + detail (expand), hapus header beserta detail-nya.

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

const getAll = async () => {
  const [rows] = await db.query(
    `SELECT kh_kode AS kode, kh_nama AS nama, kh_warna AS warna, kh_laba AS laba
     FROM tkerja_hdr ORDER BY kh_kode`
  );
  return rows;
};

const getDetail = async (kode) => {
  const [[hdr]] = await db.query(
    `SELECT kh_kode AS kode, kh_nama AS nama, kh_warna AS warna, kh_laba AS laba
     FROM tkerja_hdr WHERE kh_kode = ?`,
    [kode]
  );
  if (!hdr) throw new Error("Data pekerjaan tidak ditemukan.");
  const [dtl] = await db.query(
    `SELECT kd_jeniskain AS jeniskain, kd_lengan AS lengan, kd_gramasi AS gramasi,
            kd_babaran AS babaran, kd_babaranlengan AS babaranLengan
     FROM tkerja_dtl WHERE kd_kh_kode = ?
     ORDER BY kd_jeniskain, kd_lengan DESC, kd_gramasi`,
    [kode]
  );
  return { ...hdr, detail: dtl.map((r) => ({ ...r, babaran: num(r.babaran), babaranLengan: num(r.babaranLengan) })) };
};

const getOptions = async () => {
  const [jk] = await db.query(`SELECT jeniskain FROM tjeniskain ORDER BY jeniskain`);
  const [lg] = await db.query(`SELECT Lengan FROM tlengan ORDER BY Lengan`);
  const [gr] = await db.query(`SELECT Gramasi FROM tgramasi ORDER BY Gramasi`);
  return {
    jenisKain: jk.map((r) => r.jeniskain),
    lengan: lg.map((r) => r.Lengan),
    gramasi: gr.map((r) => r.Gramasi),
  };
};

// Penomoran KH-XXXX replikasi getnomor (max 4 digit kanan + 10001)
const genKode = async (conn) => {
  const [[r]] = await conn.query(
    `SELECT IFNULL(MAX(RIGHT(kh_kode, 4)), 0) AS jumlah FROM tkerja_hdr`
  );
  return "KH-" + String(Number(r.jumlah) + 10001).slice(-4);
};

const validatePayload = (p) => {
  if (!p.nama?.trim()) throw new Error("Nama Pekerjaan kosong, tidak dapat disimpan.");
  if (![1, 2].includes(Number(p.warna))) throw new Error("Warna harus 1 Warna atau 2 Warna.");
  const isi = (p.detail || []).filter((d) => d.gramasi?.trim());
  if (isi.length === 0) throw new Error("Detail harus diisi.");
  for (const d of isi) {
    if (!d.jeniskain?.trim() || !d.lengan?.trim() || !d.gramasi?.trim())
      throw new Error("Tiap baris detail wajib isi Jenis Kain, Lengan, dan Gramasi.");
  }
  return isi;
};

const saveData = async (payload, userKode) => {
  const isi = validatePayload(payload);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    let kode = payload.kode;

    if (kode) {
      // ── Mode ubah ──
      const [[ada]] = await conn.query(`SELECT COUNT(*) AS c FROM tkerja_hdr WHERE kh_kode = ?`, [kode]);
      if (ada.c === 0) throw new Error("Data pekerjaan tidak ditemukan.");
      await conn.query(
        `UPDATE tkerja_hdr SET kh_nama = ?, kh_warna = ?, kh_laba = ?, user_modified = ?, date_modified = NOW()
         WHERE kh_kode = ?`,
        [payload.nama.trim(), Number(payload.warna), num(payload.laba), userKode || null, kode]
      );
    } else {
      // ── Mode tambah: nama harus unik ──
      const [cek] = await conn.query(`SELECT kh_kode FROM tkerja_hdr WHERE kh_nama = ?`, [payload.nama.trim()]);
      if (cek.length > 0)
        throw new Error(`Nama pekerjaan tersebut sudah diinput dengan kode=${cek[0].kh_kode}`);
      kode = await genKode(conn);
      await conn.query(
        `INSERT INTO tkerja_hdr (kh_kode, kh_nama, kh_warna, kh_laba, user_create, date_create)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [kode, payload.nama.trim(), Number(payload.warna), num(payload.laba), userKode || null]
      );
    }

    // Tulis ulang detail (replikasi simpandata: delete + insert per baris isi)
    await conn.query(`DELETE FROM tkerja_dtl WHERE kd_kh_kode = ?`, [kode]);
    for (const d of isi) {
      await conn.query(
        `INSERT INTO tkerja_dtl (kd_kh_kode, kd_gramasi, kd_jeniskain, kd_lengan, kd_babaran, kd_babaranlengan)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [kode, d.gramasi.trim(), d.jeniskain.trim(), d.lengan.trim(), num(d.babaran), num(d.babaranLengan)]
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
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[ada]] = await conn.query(`SELECT COUNT(*) AS c FROM tkerja_hdr WHERE kh_kode = ?`, [kode]);
    if (ada.c === 0) throw new Error("Data tidak ditemukan.");
    await conn.query(`DELETE FROM tkerja_dtl WHERE kd_kh_kode = ?`, [kode]);
    await conn.query(`DELETE FROM tkerja_hdr WHERE kh_kode = ?`, [kode]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};

module.exports = { getAll, getDetail, getOptions, saveData, deleteData };
