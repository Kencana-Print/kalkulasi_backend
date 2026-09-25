const db = require("../config/database");

// Tiap seksi dibungkus agar satu tabel warisan modul finance yang tidak ada
// di DB kalkulasi (mis. tkasbon) tidak menggugurkan seluruh summary —
// seksi yang gagal pakai nilai default aman dan error dicatat di log backend.
const q = async (label, sql, params = [], fallback = { count: 0, total: 0 }) => {
  try {
    const [[row]] = await db.query(sql, params);
    return row || { ...fallback };
  } catch (e) {
    console.error(`[dashboard] ${label} gagal: ${e.message}`);
    return { ...fallback };
  }
};

const qa = async (label, sql, params = []) => {
  try {
    const [rows] = await db.query(sql, params);
    return rows;
  } catch (e) {
    console.error(`[dashboard] ${label} gagal: ${e.message}`);
    return [];
  }
};

const getSummary = async (cabang) => {
   // 4. Server date
  const dateRow = await q(
    "serverDate",
    `SELECT DATE_FORMAT(NOW(),'%Y-%m-%d') AS serverDate`,
    [],
    { serverDate: "" }
  );

  // 10. Permintaan Harga per status (tahun berjalan) — kartu Tugas Menunggu
  // BELUM / MINTA / NEGO / WAIT dari kencanaprint.tmintaharga
  const mhRows = await qa(
    "mintaharga-status",
    `SELECT mh_status AS status, COUNT(*) AS count
     FROM kencanaprint.tmintaharga
     WHERE mh_tanggal >= MAKEDATE(YEAR(CURDATE()), 1)
       AND mh_status IN ('BELUM', 'MINTA', 'NEGO', 'WAIT')
     GROUP BY mh_status`
  );
  const mhCount = (st) =>
    Number((mhRows.find((r) => r.status === st) || {}).count || 0);

  return {

    serverDate: dateRow.serverDate,
        
    belum: { count: mhCount("BELUM") },
    minta: { count: mhCount("MINTA") },
    nego: { count: mhCount("NEGO") },
    wait: { count: mhCount("WAIT") },
  };
};

const getTodayActivity = async () => {
  // Aktivitas Hari Ini — 9 kolom: data kalkulasi (hdr) + permintaan (tmintaharga).
  // Filter tetap basis permintaan user: mh_date_kalkulasi hari ini + nomor
  // kalkulasi terdaftar di tkalkulasi2_hdr.
  const rows = await qa(
    "today-activity",
    `SELECT k.kal_nomor AS NoKalkulasi,
            date_format(IFNULL(k.date_modified, k.date_create),'%d-%m-%Y %T') AS TglKalkulasi,
            h.mh_status AS Status,
            k.user_create AS Created,
            k.user_modified AS Modified,
            h.mh_nomor AS NoPermintaan,
            date_format(h.mh_tanggal,'%d-%m-%Y') AS TglPermintaan,
            h.user_create AS Peminta,
            h.mh_nama AS NamaPermintaan,
            date_format(IFNULL(h.date_modified, h.date_create),'%d-%m-%Y %T') AS DateCreate
     FROM kalkulasi.tkalkulasi2_hdr k
     INNER JOIN kencanaprint.tmintaharga h ON h.mh_nomor_kalkulasi=k.kal_nomor
     WHERE DATE(k.kal_tanggal)=CURDATE()
     ORDER BY IFNULL(k.date_modified, k.date_create)`
  );
  return rows;
};

module.exports = { getSummary, getTodayActivity };
