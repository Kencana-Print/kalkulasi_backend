const db = require("../../config/database");

// ── Get Divisi Options ────────────────────────────────────────────────
const getDivisi = async () => {
  const [rows] = await db.query(
    `SELECT kode, divisi FROM kencanaprint.tdivisi ORDER BY kode`
  );
  return rows;
};

// ── Browse Master ─────────────────────────────────────────────────────
const VALID_STATUS = ["BELUM", "MINTA", "NEGO", "WAIT", "CANCEL", "DONE","BELUM DIVERIFIKASI"];

const getBrowse = async (startDate, endDate, divisi, status) => {
  let sql = `
    SELECT 
      h.mh_nomor AS Nomor,
      v.Divisi,
      DATE_FORMAT(h.mh_tanggal, '%d-%m-%Y') AS Tanggal,
      DATE_FORMAT(h.mh_apv, '%d-%m-%Y %T') AS Approved,
      h.mh_cus_nama AS Customer,
      s.sal_nama AS Sales,
      h.mh_nama AS NamaPekerjaan,
      h.mh_jmlorder AS RencanaOrder,
      h.mh_harga AS HargaLama,
      DATE_FORMAT(h.mh_dateorder, '%d-%m-%Y') AS OrderTerakhir,
      h.mh_kain AS Kain,
      h.mh_panjang AS Panjang,
      h.mh_lebar AS Lebar,
      h.mh_ukuran AS Ukuran,
      h.mh_gramasi AS Gramasi,
      h.mh_finishing AS Finishing,
      h.mh_sublim AS Sublim,
      DATE_FORMAT(h.date_create, '%d-%m-%Y %H:%i:%s') AS Created,
      (
        SELECT IFNULL(IF(IFNULL(m.mspk_hargariil, 0) = 0, m.mspk_harga, m.mspk_hargariil), 0)
        FROM kencanaprint.tmemospk m
        WHERE m.mspk_mh_nomor <> '' AND m.mspk_mh_nomor = h.mh_nomor
        ORDER BY m.date_create DESC LIMIT 1
      ) AS HargaMAP,
      h.mh_harga_kalkulasi AS HargaKalkulasi,
      IFNULL(
        (SELECT DATE_FORMAT(k.date_create, '%d-%m-%Y') FROM kalkulasi.tkalkulasi2_hdr k WHERE k.kal_nomor = h.mh_nomor_kalkulasi),
        DATE_FORMAT(h.mh_date_kalkulasi, '%d-%m-%Y')
      ) AS TglKalkulasi,
      h.mh_nomor_kalkulasi AS NomorKalkulasi,
      h.user_kalkulasi AS UsrKalkulasi,
      h.mh_sat AS Satuan,
      h.mh_harga_bahan AS HargaBahan,
      h.mh_babaran AS Babaran,
      h.mh_harga_pen1 AS HargaPenawaran1,
      h.mh_harga_pen2 AS HargaPenawaran2,
      h.mh_nomor_pen1 AS NoPenawaran1,
      h.mh_nomor_pen2 AS NoPenawaran2,
      h.mh_status AS Status,
      h.mh_ket_kalkulasi AS KetKalkulasi,
      h.mh_ket_beli AS KetBeli
    FROM kencanaprint.tmintaharga h
    LEFT JOIN kencanaprint.tdivisi v ON v.kode = h.mh_divisi
    LEFT JOIN kencanaprint.tsales s ON s.sal_kode = h.mh_sal_kode
    WHERE h.mh_tanggal BETWEEN ? AND ?
  `;

  const params = [startDate, endDate];

  if (divisi && divisi !== "0") {
    sql += ` AND h.mh_divisi = ?`;
    params.push(divisi);
  }

  if (status && VALID_STATUS.includes(String(status).toUpperCase())) {
    sql += ` AND h.mh_status = ?`;
    params.push(String(status).toUpperCase());
  }

  sql += ` ORDER BY h.mh_tanggal`;

  const [rows] = await db.query(sql, params);
  return rows;
};

// ── Delete Kalkulasi ──────────────────────────────────────────────────
const deleteKalkulasi = async (nomor, nomorKalkulasi) => {
  const conn = await db.getConnection();
  await conn.beginTransaction();
  try {
    await conn.query(
      `UPDATE kencanaprint.tmintaharga 
       SET mh_nomor_kalkulasi = '', mh_harga_kalkulasi = 0,
           mh_nomor_pen1 = '', mh_harga_pen1 = 0,
           mh_nomor_pen2 = '', mh_harga_pen2 = 0,
           mh_sat = '', mh_date_kalkulasi = NULL,
           user_kalkulasi = '',
           mh_status = if((SELECT COUNT(*) FROM tkalkulasi_hdr WHERE kal_mh_nomor=mh_nomor)=0,'MINTA',
           if((SELECT kal_rpsales<kal_rpsistem FROM tkalkulasi_hdr WHERE kal_mh_nomor=mh_nomor)=1,'NEGO','BELUM DIVERIFIKASI'))
       WHERE mh_nomor = ?`,
      [nomor]
    );

    if (nomorKalkulasi) {
      await conn.query(
        `DELETE FROM kalkulasi.tkalkulasi2_hdr WHERE kal_nomor = ?`,
        [nomorKalkulasi]
      );
    }

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};

// ── Delete Penawaran 1 ────────────────────────────────────────────────
const deletePenawaran1 = async (nomor) => {
  await db.query(
    `UPDATE kencanaprint.tmintaharga 
     SET mh_nomor_pen1 = '', mh_harga_pen1 = 0 
     WHERE mh_nomor = ?`,
    [nomor]
  );
};

// ── Delete Penawaran 2 ────────────────────────────────────────────────
const deletePenawaran2 = async (nomor) => {
  await db.query(
    `UPDATE kencanaprint.tmintaharga 
     SET mh_nomor_pen2 = '', mh_harga_pen2 = 0 
     WHERE mh_nomor = ?`,
    [nomor]
  );
};

// ── Detail Komponen Bahan (Kalkulasi) ─────────────────────────────────
const isYes = (v) => v === "Y" || v === "y" || v === 1 || v === true;
const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

const getDetail = async (nomor) => {
  let noKalkulasi = nomor;
  const [[mh]] = await db.query(
    `SELECT mh_nomor, mh_nomor_kalkulasi FROM kencanaprint.tmintaharga WHERE mh_nomor = ?`,
    [nomor]
  );
  if (mh && mh.mh_nomor_kalkulasi) {
    noKalkulasi = mh.mh_nomor_kalkulasi;
  }

  let rows = [];
  if (noKalkulasi) {
    [rows] = await db.query(
      `SELECT * FROM tkalkulasi2_komponen WHERE kk_nomor = ? ORDER BY kk_nourut`,
      [noKalkulasi]
    );

    if (rows.length === 0) {
      try {
        [rows] = await db.query(
          `SELECT * FROM kalkulasi.tkalkulasi_komponen WHERE kk_nomor = ? ORDER BY kk_nourut`,
          [noKalkulasi]
        );
      } catch (e) {
        // ignore
      }
    }
  }

  if (rows.length === 0 && mh) {
    try {
      const [[hdr]] = await db.query(
        `SELECT kal_nomor FROM kalkulasi.tkalkulasi_hdr WHERE kal_mh_nomor = ? LIMIT 1`,
        [mh.mh_nomor]
      );
      if (hdr?.kal_nomor) {
        [rows] = await db.query(
          `SELECT * FROM kalkulasi.tkalkulasi_komponen WHERE kk_nomor = ? ORDER BY kk_nourut`,
          [hdr.kal_nomor]
        );
      }
    } catch (e) {
      // ignore
    }
  }

  return rows.map((r, idx) => ({
    no: r.kk_nourut || idx + 1,
    komponen: r.kk_komponen || "",
    kg: isYes(r.kk_kg),
    pabrik: isYes(r.kk_pabrik),
    jenisKain: r.kk_jeniskain || "",
    lengan: r.kk_lengan || "",
    warna: r.kk_warna || "",
    harga: num(r.kk_harga),
    babaran: num(r.kk_babaran),
  }));
};

module.exports = {
  getDivisi,
  getBrowse,
  getDetail,
  deleteKalkulasi,
  deletePenawaran1,
  deletePenawaran2,
};