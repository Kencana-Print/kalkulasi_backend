const db = require("../../config/database");

// ── Helper angka & konversi flag Y/N ──
const num = (v) => (v === "" || v === null || v === undefined ? 0 : Number(v) || 0);
const yn = (v) => (v ? "Y" : "N");
const isYes = (v) => v === "Y" || v === 1 || v === true;

const P8 = [1, 2, 3, 4, 5, 6, 7, 8];

// PPN global (zPpn di MAIN.pas: SELECT ppn FROM tversi WHERE
// aplikasi="KALKULASI") — dipakai hitungpabrik & default % PPN dokumen
// baru (refreshdata: edtppn := zPpn).
const getPpnGlobal = async () => {
  try {
    const [[row]] = await db.query(`SELECT ppn FROM tversi WHERE aplikasi = "KALKULASI" LIMIT 1`);
    return { ppn: row ? num(row.ppn) : 11 };
  } catch {
    return { ppn: 11 };
  }
};

// ═══════════════════════════════════════════════════════════════════════
// LOOKUP — Model Kerja (F1 di header, replikasi edtkhkodeKeyDown/Exit)
// ═══════════════════════════════════════════════════════════════════════

const searchModelKerja = async (q) => {
  const like = `%${q || ""}%`;
  const [rows] = await db.query(
    `SELECT kh_kode AS kode, kh_nama AS nama FROM tkerja_hdr
     WHERE kh_kode LIKE ? OR kh_nama LIKE ? ORDER BY kh_kode LIMIT 100`,
    [like, like],
  );
  return rows;
};

const getModelKerja = async (khKode) => {
  const [[model]] = await db.query(
    `SELECT kh_nama AS nama, kh_warna AS warna FROM tkerja_hdr WHERE kh_kode = ?`,
    [khKode],
  );
  if (!model) throw new Error("Model tsb belum ada.");

  const biayaPotong = await getBiayaTunggal({ jenis: "POTONG" });
  const cmBordir = await getBiayaTunggal({ jenis: "BORDIR" });
  const cmPolyflex = await getBiayaTunggal({ jenis: "POLYFLEX" });
  const cmDtf = await getBiayaTunggal({ jenis: "DTF" });
  const jenisKainOptions = await getJenisKainOptions(khKode);

  return {
    nama: model.nama,
    warna: model.warna,
    biayaPotong: biayaPotong.biaya,
    cmBordir: cmBordir.biaya,
    cmPolyflex: cmPolyflex.biaya,
    cmDtf: cmDtf.biaya,
    jenisKainOptions,
  };
};

const getJenisKainOptions = async (khKode) => {
  const [rows] = await db.query(
    `SELECT DISTINCT kd_jeniskain FROM tkerja_dtl WHERE kd_kh_kode = ? ORDER BY kd_jeniskain`,
    [khKode],
  );
  return rows.map((r) => r.kd_jeniskain);
};

// ═══════════════════════════════════════════════════════════════════════
// LOOKUP — Gramasi (Tab Gramasi: komponen BODY/LENGAN) & Harga Kain
// Replikasi gramasibody / gramasilengan / bagian akhir gramasi.
// ═══════════════════════════════════════════════════════════════════════

const getGramasi = async ({ khKode, jenisKain, lengan, bagian }) => {
  const kolLengan = lengan === "PANJANG" ? "PANJANG" : "PENDEK";
  const [[row]] = await db.query(
    `SELECT * FROM tkerja_dtl WHERE kd_kh_kode = ? AND kd_jeniskain = ? AND kd_lengan = ?`,
    [khKode, jenisKain, kolLengan],
  );
  if (!row) return { babaran: 0, babaranXxl: 0, babaran5570: 0, babaran5268: 0 };

  if (bagian === "lengan") {
    return {
      babaran: num(row.kd_babaranlengan),
      babaranXxl: 0, // tidak ada kolom XXL untuk lengan di Delphi (selalu '0')
      babaran5570: num(row.kd_babaranhand5570),
      babaran5268: num(row.kd_babaranhand5268),
    };
  }
  return {
    babaran: num(row.kd_babaran),
    babaranXxl: num(row.kd_babaranxxl),
    babaran5570: num(row.kd_babaranbody5570),
    babaran5268: num(row.kd_babaranbody5268),
  };
};

// Dipakai baik oleh Tab Gramasi (BODY/LENGAN, kolom cbbJeniskain) maupun
// Tab Jenis Kain (RIB, kolom cbbkainRib) — query & tabelnya identik persis,
// cuma sumber nilai jenisKain-nya beda field di form Delphi (gramasi vs hargarib).
const getHargaKain = async ({ jenisKain, warna, pabrik }) => {
  const kolom = isYes(yn(pabrik)) ? "hk_hargapabrik" : "hk_hargatoko";
  const [[row]] = await db.query(
    `SELECT ${kolom} AS harga FROM thargakain WHERE hk_jeniskain = ? AND hk_warna = ?`,
    [jenisKain, warna],
  );
  return { harga: row ? num(row.harga) : 0 };
};

// ═══════════════════════════════════════════════════════════════════════
// LOOKUP — Jenis Kain: RIB (babaran dari tkrah) & KRAH/MANSET (daftar bahan)
// Replikasi procedure jeniskain.
// ═══════════════════════════════════════════════════════════════════════

const getRibBabaran = async ({ leher, lengan }) => {
  let kolom = "rib_lengan";
  if (leher && lengan) kolom = "rib_lenganleher";
  else if (leher && !lengan) kolom = "rib_leher";
  const [[row]] = await db.query(
    `SELECT ${kolom} AS babaran FROM tkrah WHERE rib = 1`,
  );
  return { babaran: row ? num(row.babaran) : 0 };
};

const getKrahManset = async () => {
  const [rows] = await db.query(`SELECT Nama AS nama, Harga AS harga FROM tkrah`);
  return rows.map((r) => ({ nama: r.nama, harga: num(r.harga) }));
};

// ═══════════════════════════════════════════════════════════════════════
// LOOKUP — Komponen master (combobox grid komponen bahan)
// ═══════════════════════════════════════════════════════════════════════

const getKomponenMaster = async () => {
  const [rows] = await db.query(`SELECT komponen FROM tkomponen ORDER BY no`);
  return rows.map((r) => r.komponen);
};

// ═══════════════════════════════════════════════════════════════════════
// LOOKUP — Biaya Pengerjaan (tbiayapengerjaan) — dipakai untuk:
//  - nilai tunggal: POTONG / BORDIR / POLYFLEX / DTF (default cm) / FINISHING (by ket) / bp_min per jenis
//  - daftar untuk picker F1: JAHIT / CETAK / SUBLIM (list nama+harga sesuai grade medium/premium)
// ═══════════════════════════════════════════════════════════════════════

const getBiayaTunggal = async ({ jenis, ket }) => {
  let sql = `SELECT bp_biaya AS biaya FROM tbiayapengerjaan WHERE bp_jenis = ?`;
  const params = [jenis];
  if (ket !== undefined) {
    sql += ` AND TRIM(bp_ket) = ?`;
    params.push(ket);
  }
  const [[row]] = await db.query(sql, params);
  return { biaya: row ? num(row.biaya) : 0 };
};

const getBiayaMin = async (jenis) => {
  const [[row]] = await db.query(
    `SELECT bp_min AS biayaMin FROM tbiayapengerjaan WHERE bp_jenis = ? LIMIT 1`,
    [jenis],
  );
  return { min: row ? num(row.biayaMin) : 0 };
};

// grade: 'medium' | 'premium' — menentukan kolom bp_medium/bp_premium yang dipakai
const listBiayaPengerjaan = async ({ jenis, grade }) => {
  const kolomHarga = grade === "medium" ? "bp_medium" : "bp_premium";
  if (jenis === "CETAK") {
    const [rows] = await db.query(
      `SELECT bp_ket AS nama, bp_biaya AS harga FROM tbiayapengerjaan
       WHERE bp_jenis = "CETAK" ORDER BY bp_ket`,
    );
    return rows.map((r) => ({ nama: r.nama, harga: num(r.harga) }));
  }
  if (jenis === "JAHIT") {
    const [rows] = await db.query(
      `SELECT bp_ket AS nama, ${kolomHarga} AS harga,
              bp_raglanMedium AS raglanMedium, bp_raglanpremium AS raglanPremium
       FROM tbiayapengerjaan WHERE bp_jenis = "JAHIT" ORDER BY bp_ket`,
    );
    return rows.map((r) => ({
      nama: r.nama,
      harga: num(r.harga),
      raglanMedium: num(r.raglanMedium),
      raglanPremium: num(r.raglanPremium),
    }));
  }
  // SUBLIM
  const [rows] = await db.query(
    `SELECT bp_ket AS nama, ${kolomHarga} AS harga
     FROM tbiayapengerjaan WHERE bp_jenis = "SUBLIM" ORDER BY bp_ket`,
  );
  return rows.map((r) => ({ nama: r.nama, harga: num(r.harga) }));
};

const getKetSublim = async () => {
  const [rows] = await db.query(
    `SELECT bp_ket AS ket FROM tbiayapengerjaan WHERE bp_jenis = "SUBLIM" ORDER BY bp_ket`,
  );
  return rows.map((r) => r.ket).join(", ");
};

// Harga siap-pakai 1 slot sublim setelah dipilih dari picker (edtsublimNExit)
const getHargaSublim = async ({ ket, grade }) => {
  const kolomHarga = grade === "medium" ? "bp_medium" : "bp_premium";
  const [[row]] = await db.query(
    `SELECT ${kolomHarga} AS biaya FROM tbiayapengerjaan WHERE bp_jenis = "SUBLIM" AND bp_ket = ?`,
    [ket],
  );
  return { biaya: row ? num(row.biaya) : 0 };
};

// ═══════════════════════════════════════════════════════════════════════
// LOOKUP — Margin, Allowance, Biaya Kirim (bertingkat per qty order & grade)
// Replikasi procedure margin.
// ═══════════════════════════════════════════════════════════════════════

const getMargin = async ({ qtyOrder, grade }) => {
  const kolomLaba = grade === "medium" ? "medium" : "premium";
  const [[m]] = await db.query(
    `SELECT ${kolomLaba} AS laba, persen FROM tmargin WHERE ? <= qmax ORDER BY qmin LIMIT 1`,
    [num(qtyOrder)],
  );
  const [[a]] = await db.query(
    `SELECT ${kolomLaba} AS alow FROM tallowance WHERE ? <= qmax ORDER BY qmin LIMIT 1`,
    [num(qtyOrder)],
  );
  const [[k]] = await db.query(
    `SELECT biaya FROM tbiayakirim WHERE ? <= qmax ORDER BY qmin LIMIT 1`,
    [num(qtyOrder)],
  );
  return {
    pakaiPersen: m ? isYes(m.persen) : true,
    labaPersen: m && isYes(m.persen) ? num(m.laba) : 0,
    laba: m && !isYes(m.persen) ? num(m.laba) : 0,
    allowancePersen: a ? num(a.alow) : 0,
    rpKirim: k ? num(k.biaya) : 0,
  };
};

// Minimum biaya cetak, bertingkat per qty order & grade — dipakai saat
// apply tombol OK Cetak (imgokcetakClick).
const getMinCetak = async ({ qtyOrder, grade }) => {
  const kolom = grade === "medium" ? "medium" : "premium";
  const [[row]] = await db.query(
    `SELECT ${kolom} AS biaya, rumus FROM tmincetak WHERE ? <= qmax ORDER BY qmin LIMIT 1`,
    [num(qtyOrder)],
  );
  return { min: row ? num(row.biaya) : 0, rumus: row ? row.rumus : "" };
};

// ═══════════════════════════════════════════════════════════════════════
// DETAIL — Kalkulasi aktif (skema tkalkulasi2_*). Replikasi loaddataall.
// ═══════════════════════════════════════════════════════════════════════

const mapProsesArea = (row, prefix) => ({
  p: P8.map((n) => (row ? num(row[`${prefix}p${n}`]) : 0)),
  l: P8.map((n) => (row ? num(row[`${prefix}l${n}`]) : 0)),
});

const getBordir = async (nomor, table = "tkalkulasi2_bordir") => {
  const [[row]] = await db.query(`SELECT * FROM ${table} WHERE kald_nomor = ?`, [nomor]);
  if (!row) return null;
  return { cmBordir: num(row.kald_cmbordir), ...mapProsesArea(row, "kald_bordir"), rpBordir: num(row.kald_rpbordir) };
};

const getPolyflex = async (nomor, table = "tkalkulasi2_polyflex") => {
  const [[row]] = await db.query(`SELECT * FROM ${table} WHERE kald_nomor = ?`, [nomor]);
  if (!row) return null;
  return { cmPolyflex: num(row.kald_cmpolyflex), ...mapProsesArea(row, "kald_polyflex"), rpPolyflex: num(row.kald_rppolyflex) };
};

const getDtf = async (nomor, table = "tkalkulasi2_dtf") => {
  const [[row]] = await db.query(`SELECT * FROM ${table} WHERE kald_nomor = ?`, [nomor]);
  if (!row) return null;
  return { cmDtf: num(row.kald_cmdtf), ...mapProsesArea(row, "kald_dtf"), rpDtf: num(row.kald_rpdtf) };
};

const getSublim = async (nomor, table = "tkalkulasi2_sublim") => {
  const [[row]] = await db.query(`SELECT * FROM ${table} WHERE kald_nomor = ?`, [nomor]);
  if (!row) return null;
  return {
    jenis: P8.map((n) => row[`kald_sublim${n}`] || ""),
    rp: P8.map((n) => num(row[`kald_sublimrp${n}`])),
    rpSublim: num(row.kald_rpsublim),
  };
};

const getCetak = async (nomor, table = "tkalkulasi2_cetak") => {
  const [[row]] = await db.query(`SELECT * FROM ${table} WHERE kald_nomor = ?`, [nomor]);
  if (!row) return null;
  return {
    jenis: P8.map((n) => row[`kald_cetak${n}`] || ""),
    cm: P8.map((n) => num(row[`kald_cmcetak${n}`])),
    p: P8.map((n) => num(row[`kald_cetakp${n}`])),
    l: P8.map((n) => num(row[`kald_cetakl${n}`])),
    rpCetak: num(row.kald_rpcetak),
  };
};

const getKomponen = async (nomor, table = "tkalkulasi2_komponen") => {
  const [rows] = await db.query(
    `SELECT * FROM ${table} WHERE kk_nomor = ? ORDER BY kk_nourut`,
    [nomor],
  );
  return rows.map((r) => ({
    komponen: r.kk_komponen,
    kg: isYes(r.kk_kg),
    pabrik: isYes(r.kk_pabrik),
    jenisKain: r.kk_jeniskain,
    lengan: r.kk_lengan,
    warna: r.kk_warna,
    harga: num(r.kk_harga),
    babaran: num(r.kk_babaran),
    pcs: num(r.kk_pcs),
    logBody: r.kald_logbody, // ← nama kolom aslinya memang prefix "kald_" walau di tabel komponen
    logLengan: r.kald_loglengan,
  }));
};

const getAksesories = async (nomor, table = "tkalkulasi2_aksesories") => {
  const [rows] = await db.query(
    `SELECT * FROM ${table} WHERE ka_nomor = ? ORDER BY ka_nourut`,
    [nomor],
  );
  return rows.map((r) => ({ aksesories: r.ka_aksesories, biaya: num(r.ka_biaya) }));
};

const getDetail = async (nomor) => {
  const [[h]] = await db.query(
    `SELECT h.*, p.kh_nama,
            DATE_FORMAT(IFNULL(h.date_modified, h.date_create), '%d-%m-%Y %H:%i:%s') AS updated
     FROM tkalkulasi2_hdr h
     LEFT JOIN tkerja_hdr p ON p.kh_kode = h.kal_kh_kode
     WHERE h.kal_nomor = ?`,
    [nomor],
  );
  if (!h) throw new Error("Data Kalkulasi tidak ditemukan.");

  const [[d]] = await db.query(`SELECT * FROM tkalkulasi2_dtl WHERE kald_nomor = ?`, [nomor]);

  const bodyRow0 = await getKomponen(nomor);
  const bodyRow = bodyRow0.find((k) => k.lengan === "PENDEK" || k.lengan === "PANJANG");
  const jkBody = (bodyRow?.jenisKain || "").toUpperCase();
  const ckMedium =
    jkBody.startsWith("PE") || jkBody.startsWith("PE DK") || jkBody.startsWith("HYGIT") || jkBody.startsWith("DRYFIT");

  const header = {
    nomor: h.kal_nomor,
    tanggal: h.kal_tanggal,
    project: h.kal_project,
    cus: h.kal_cus,
    khKode: h.kal_kh_kode,
    khNama: h.kh_nama,
    rencanaOrder: num(h.kal_rencanaorder),
    pakaiPersen: isYes(h.kal_persen),
    pakaiObat: isYes(h.kal_pakaiobat),
    ket: h.kal_ket || "",
    ketBeli: h.kal_ketbeli || "",
    labaPersen: num(h.kal_laba),
    rpLaba: num(h.kal_rplaba),
    allowancePersen: num(h.kal_allowance),
    rpAllowance: num(h.kal_rpallowance),
    rpSesuai: num(h.kal_rpsesuai),
    ppn: num(h.kal_ppn),
    rpSesuaiPpn: num(h.kal_rpsesuaippn),
    updated: h.updated,
    ckMedium,
  };

  const dtl = d
    ? {
        rpPotong: num(d.kald_rppotong),
        jahit: d.kald_jahit || "",
        raglan: num(d.kald_raglan) !== 0,
        rpRaglan: num(d.kald_rpraglan),
        rpJahit: num(d.kald_rpjahit),
        rpFinishing: num(d.kald_rpfinishing),
        rpTenagaCetak: num(d.kald_rptenagacetak),
        rpBiayaObat: num(d.kald_rpbiayaobat),
        rpKirim: num(d.kald_rpkirim),
      }
    : {
        rpPotong: 0, jahit: "", raglan: false, rpRaglan: 0, rpJahit: 0,
        rpFinishing: 0, rpTenagaCetak: 0, rpBiayaObat: 0, rpKirim: 0,
      };

  const aksesories = await getAksesories(nomor);
  const jenisKainOptions = h.kal_kh_kode ? await getJenisKainOptions(h.kal_kh_kode) : [];

  // Minta Harga yang terhubung ke nomor kalkulasi ini (kalau ada) — replikasi
  // pencarian "SELECT * FROM tmintaharga WHERE mh_nomor_kalkulasi=akode" di
  // ekor loaddataall (jalur zminta=false).
  const [[linkedMh]] = await db.query(
    `SELECT mh_nomor FROM kencanaprint.tmintaharga WHERE mh_nomor_kalkulasi = ?`,
    [nomor],
  );
  const mintaHarga = linkedMh ? await getMintaHarga(linkedMh.mh_nomor) : null;

  // Status Cancel tidak punya kolom di tkalkulasi2_* — hidup di
  // tmintaharga.mh_status (ditulis saat simpan) → turunkan kembali agar
  // ceklist Cancel tercentang saat form dibuka ulang.
  // (Tambahan di luar Delphi: Delphi tidak pernah mencentang ckUpdate saat
  // buka-ulang — di sini DONE dipakai sebagai penanda "sudah update ke MH".
  // Konsekuensi: simpan berikutnya akan push ulang ke Minta Harga.)
  header.ckCancel = mintaHarga?.header?.status === "CANCEL";
  header.ckUpdate = mintaHarga?.header?.status === "DONE";

  return {
    header,
    dtl,
    komponen: bodyRow0,
    aksesories,
    jenisKainOptions,
    bordir: await getBordir(nomor),
    sublim: await getSublim(nomor),
    polyflex: await getPolyflex(nomor),
    dtf: await getDtf(nomor),
    cetak: await getCetak(nomor),
    mintaHarga,
  };
};

// ═══════════════════════════════════════════════════════════════════════
// DETAIL — Permintaan Harga (kencanaprint.tmintaharga). Replikasi loaddata.
// ═══════════════════════════════════════════════════════════════════════

const getMintaHarga = async (mhNomor) => {
  const [[h]] = await db.query(
    `SELECT h.*, v.divisi, s.sal_nama,
            IFNULL(m.mspk_nomor, '') AS map,
            IFNULL(k.kal_nomor, '') AS nokals
     FROM kencanaprint.tmintaharga h
     LEFT JOIN kencanaprint.tdivisi v ON v.kode = h.mh_divisi
     LEFT JOIN kencanaprint.tsales s ON s.sal_kode = h.mh_sal_kode
     LEFT JOIN kencanaprint.tmemospk m ON m.mspk_mh_nomor = h.mh_nomor
     LEFT JOIN kalkulasi.tkalkulasi_hdr k ON k.kal_mh_nomor = h.mh_nomor
     WHERE h.mh_nomor = ?`,
    [mhNomor],
  );
  if (!h) throw new Error("Data Minta Harga tidak ditemukan.");

  let sublimGrade = null;
  if (h.mh_sublim === "PREMIUM") sublimGrade = "premium";
  else if (h.mh_sublim === "MEDIUM") sublimGrade = "medium";

  const header = {
    nomor: h.mh_nomor,
    divisi: h.divisi || "",
    map: h.map || "",
    tanggal: h.mh_tanggal,
    dateOrder: h.mh_dateorder,
    custKode: h.mh_cus_kode || "",
    custNama: h.mh_cus_nama || "",
    salesKode: h.mh_sal_kode || "",
    salesNama: h.sal_nama || "",
    nama: h.mh_nama || "",
    jmlOrder: num(h.mh_jmlorder),
    hargaJual: num(h.mh_harga),
    budget: num(h.mh_budget),
    kain: h.mh_kain || "",
    panjang: h.mh_panjang || "",
    lebar: h.mh_lebar || "",
    ukuran: h.mh_ukuran || "",
    gramasi: h.mh_gramasi || "",
    finishing: h.mh_finishing || "",
    ket: h.mh_ket || "",
    status: h.mh_status || "",
    sublimGrade,
  };

  // Replikasi: "if (nokals<>'') and (mh_status='NEGO') then loadNego(nokals)"
  const nego = h.nokals && h.mh_status === "NEGO" ? await getNego(h.nokals) : null;

  return { header, nego };
};

// ═══════════════════════════════════════════════════════════════════════
// DETAIL — Histori Nego (skema LEGACY, database terpisah "kalkulasi").
// Replikasi loadnego. Read-only — tidak ada endpoint simpan untuk skema ini.
//
// CATATAN: di source Delphi, loadnego query "tkalkulasi_hdr" TANPA prefix
// schema, sedangkan loaddata men-JOIN eksplisit ke "kalkulasi.tkalkulasi_hdr".
// Kami asumsikan keduanya merujuk tabel yang sama di schema "kalkulasi" dan
// selalu meng-qualify eksplisit di sini — mohon diverifikasi terhadap DB
// yang sebenarnya, karena unprefixed reference di source aslinya ambigu.
// ═══════════════════════════════════════════════════════════════════════

const getNego = async (nomor) => {
  const [[h]] = await db.query(
    `SELECT h.*, p.kh_nama
     FROM kalkulasi.tkalkulasi_hdr h
     LEFT JOIN tkerja_hdr p ON p.kh_kode = h.kal_kh_kode
     WHERE h.kal_nomor = ?`,
    [nomor],
  );
  if (!h) return null;

  const [[d]] = await db.query(
    `SELECT * FROM kalkulasi.tkalkulasi_dtl WHERE kald_nomor = ?`,
    [nomor],
  );

  const header = {
    nomor: h.kal_nomor, // catatan: nomor histori nego, BUKAN dipakai menimpa nomor dokumen baru
    project: h.kal_project,
    cus: h.kal_cus,
    khKode: h.kal_kh_kode,
    khNama: h.kh_nama,
    rencanaOrder: num(h.kal_rencanaorder),
    pakaiPersen: isYes(h.kal_persen),
    pakaiObat: isYes(h.kal_pakaiobat),
    ket: h.kal_ket || "",
    ketBeli: h.kal_ketbeli || "",
    labaPersen: num(h.kal_laba),
    rpLaba: num(h.kal_rplaba),
    allowancePersen: num(h.kal_allowance),
    rpAllowance: num(h.kal_rpallowance),
    rpSesuai: num(h.kal_rpsesuai),
    ppn: num(h.kal_ppn),
    rpSesuaiPpn: num(h.kal_rpsesuaippn),
  };

  const dtl = d
    ? {
        rpPotong: num(d.kald_rppotong),
        jahit: d.kald_jahit || "",
        raglan: num(d.kald_raglan) !== 0,
        rpRaglan: num(d.kald_rpraglan),
        rpJahit: num(d.kald_rpjahit),
        rpFinishing: num(d.kald_rpfinishing),
        rpTenagaCetak: num(d.kald_rptenagacetak),
        rpBiayaObat: num(d.kald_rpbiayaobat),
        rpKirim: num(d.kald_rpkirim),
      }
    : null;

  return {
    header,
    dtl,
    komponen: await getKomponen(nomor, "kalkulasi.tkalkulasi_komponen"),
    aksesories: await getAksesories(nomor, "kalkulasi.tkalkulasi_aksesories"),
    bordir: await getBordir(nomor, "kalkulasi.tkalkulasi_bordir"),
    sublim: await getSublim(nomor, "kalkulasi.tkalkulasi_sublim"),
    polyflex: await getPolyflex(nomor, "kalkulasi.tkalkulasi_polyflex"),
    dtf: await getDtf(nomor, "kalkulasi.tkalkulasi_dtf"),
    cetak: await getCetak(nomor, "kalkulasi.tkalkulasi_cetak"),
  };
};

// ═══════════════════════════════════════════════════════════════════════
// SIMPAN — replikasi getnomor + simpandata + simpanharga, dibungkus 1
// transaksi (perbaikan dari original: Delphi tidak transaksional sama
// sekali, lihat catatan analisis). generateNomor pakai FOR UPDATE supaya
// aman dari race condition nomor dobel saat 2 user simpan bersamaan
// (pola sama persis dengan generateNomor di spkFormService.js).
// ═══════════════════════════════════════════════════════════════════════

const PREFIX_BY_JUDUL = {
  "KALKULASI HARGA": "KAL",
  "PENAWARAN 1": "KA1",
  "PENAWARAN 2": "KA2",
};

const generateNomor = async (conn, lblJudul) => {
  const prefix = PREFIX_BY_JUDUL[lblJudul] || "KAL";
  const bulan = String(new Date().getMonth() + 1).padStart(2, "0");
  const tahun = String(new Date().getFullYear()).slice(-2);
  const [rows] = await conn.query(
    `SELECT IFNULL(MAX(RIGHT(kal_nomor, 4)), 0) AS jumlah FROM tkalkulasi2_hdr
     WHERE kal_nomor LIKE ? AND LEFT(kal_nomor, 3) = ?
     FOR UPDATE`,
    [`%${tahun}${bulan}%`, prefix],
  );
  const jumlah = String(Number(String(rows[0].jumlah).slice(0, 4)) + 1 || 1).padStart(4, "0");
  return `${prefix}-${tahun}${bulan}${jumlah}`;
};

const validateSave = (payload) => {
  const { header, dtl, komponen, divisi } = payload;
  if (dtl.ckCancel && !header.ket?.trim()) {
    throw new Error("Status dicancel. Note Marketing harus diisi.");
  }
  if (divisi === "GARMEN" || divisi === "KAOSAN") {
    if (header.pakaiObat && num(dtl.rpBiayaObat) === 0) {
      throw new Error("Jika Biaya Obat dicentang. Maka Biaya Obat harus diisi.");
    }
    const isi = komponen.filter((k) => k.komponen?.trim());
    if (isi.length === 0) {
      throw new Error("Divisi Garmen/Kaosan. Komponen harus diisi.");
    }
    const warnaValid = ["MUDA", "SEDANG", "TUA", "SUPERTUA"];
    for (const k of komponen) {
      const w = (k.warna || "").trim();
      if (w && !warnaValid.includes(w)) {
        throw new Error("Isi Warna dengan: MUDA, SEDANG, TUA, SUPERTUA");
      }
    }
  }
};

const saveData = async (payload, user) => {
  const { isEdit, lblJudul, header, dtl, komponen, aksesories, bordir, sublim, polyflex, cetak, dtf, mintaHarga, divisi } = payload;

  validateSave(payload);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    let nomor = header.nomor;
    if (isEdit) {
      if (!nomor) throw new Error("No. Kalkulasi wajib diisi.");
      await conn.query(
        `UPDATE tkalkulasi2_hdr SET
           kal_project = ?, kal_tanggal = ?, kal_cus = ?, kal_kh_kode = ?, kal_rencanaorder = ?,
           kal_persen = ?, kal_laba = ?, kal_rplaba = ?, kal_allowance = ?, kal_rpallowance = ?,
           kal_rpsesuai = ?, kal_ppn = ?, kal_rpsesuaippn = ?, kal_ket = ?, kal_pakaiobat = ?,
           kal_ketbeli = ?, user_modified = ?, date_modified = NOW()
         WHERE kal_nomor = ?`,
        [
          header.project, header.tanggal, header.cus, header.khKode, num(header.rencanaOrder),
          yn(header.pakaiPersen), num(header.labaPersen), num(header.rpLaba), num(header.allowancePersen), num(header.rpAllowance),
          num(header.rpSesuai), num(header.ppn), num(header.rpSesuaiPpn), header.ket || "", yn(header.pakaiObat),
          header.ketBeli || "", user, nomor,
        ],
      );
    } else {
      nomor = await generateNomor(conn, lblJudul);
      await conn.query(
        `INSERT INTO tkalkulasi2_hdr
           (kal_nomor, kal_project, kal_tanggal, kal_cus, kal_kh_kode, kal_rpallowance, kal_allowance,
            kal_rpsesuai, kal_ppn, kal_rpsesuaippn, kal_rencanaorder, kal_rplaba, kal_laba, kal_persen,
            kal_ket, kal_pakaiobat, kal_ketbeli, user_create, date_create)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          nomor, header.project, header.tanggal, header.cus, header.khKode, num(header.rpAllowance), num(header.allowancePersen),
          num(header.rpSesuai), num(header.ppn), num(header.rpSesuaiPpn), num(header.rencanaOrder), num(header.rpLaba), num(header.labaPersen), yn(header.pakaiPersen),
          header.ket || "", yn(header.pakaiObat), header.ketBeli || "", user,
        ],
      );
    }

    // ── detail ──
    await conn.query(`DELETE FROM tkalkulasi2_dtl WHERE kald_nomor = ?`, [nomor]);
    await conn.query(
      `INSERT INTO tkalkulasi2_dtl
         (kald_nomor, kald_rppotong, kald_jahit, kald_raglan, kald_rpraglan, kald_rpjahit,
          kald_rpfinishing, kald_rptenagacetak, kald_rpbiayaobat, kald_rpkirim)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nomor, num(dtl.rpPotong), dtl.jahit || "", dtl.raglan ? 1 : 0, num(dtl.rpRaglan), num(dtl.rpJahit),
        num(dtl.rpFinishing), num(dtl.rpTenagaCetak), num(dtl.rpBiayaObat), num(dtl.rpKirim),
      ],
    );

    // ── grid komponen ──
    await conn.query(`DELETE FROM tkalkulasi2_komponen WHERE kk_nomor = ?`, [nomor]);
    let i = 0;
    for (const k of komponen) {
      if (!k.komponen?.trim()) continue;
      i += 1;
      await conn.query(
        `INSERT INTO tkalkulasi2_komponen
           (kk_nomor, kk_komponen, kk_kg, kk_pabrik, kk_jeniskain, kk_lengan, kk_warna, kk_harga,
            kk_babaran, kk_pcs, kald_logbody, kald_loglengan, kk_nourut)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nomor, k.komponen.trim(), yn(k.kg), yn(k.pabrik), k.jenisKain || "", k.lengan || "", (k.warna || "").trim(),
          num(k.harga), num(k.babaran), num(k.pcs), k.logBody || 0, k.logLengan || 0, i,
        ],
      );
    }

    // ── grid aksesories ──
    await conn.query(`DELETE FROM tkalkulasi2_aksesories WHERE ka_nomor = ?`, [nomor]);
    i = 0;
    for (const a of aksesories) {
      if (!a.aksesories?.trim()) continue;
      i += 1;
      await conn.query(
        `INSERT INTO tkalkulasi2_aksesories (ka_nomor, ka_aksesories, ka_biaya, ka_nourut) VALUES (?, ?, ?, ?)`,
        [nomor, a.aksesories, num(a.biaya), i],
      );
    }

    // ── bordir ──
    await conn.query(`DELETE FROM tkalkulasi2_bordir WHERE kald_nomor = ?`, [nomor]);
    await conn.query(
      `INSERT INTO tkalkulasi2_bordir
         (kald_nomor, kald_cmbordir, kald_bordirp1, kald_bordirp2, kald_bordirp3, kald_bordirp4,
          kald_bordirp5, kald_bordirp6, kald_bordirp7, kald_bordirp8,
          kald_bordirl1, kald_bordirl2, kald_bordirl3, kald_bordirl4,
          kald_bordirl5, kald_bordirl6, kald_bordirl7, kald_bordirl8, kald_rpbordir)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nomor, num(bordir.cmBordir), ...P8.map((n) => num(bordir.p[n - 1])), ...P8.map((n) => num(bordir.l[n - 1])), num(bordir.rpBordir)],
    );

    // ── sublim ──
    await conn.query(`DELETE FROM tkalkulasi2_sublim WHERE kald_nomor = ?`, [nomor]);
    await conn.query(
      `INSERT INTO tkalkulasi2_sublim
         (kald_nomor, kald_sublimrp1, kald_sublimrp2, kald_sublimrp3, kald_sublimrp4,
          kald_sublimrp5, kald_sublimrp6, kald_sublimrp7, kald_sublimrp8,
          kald_sublim1, kald_sublim2, kald_sublim3, kald_sublim4,
          kald_sublim5, kald_sublim6, kald_sublim7, kald_sublim8, kald_rpsublim)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nomor, ...P8.map((n) => num(sublim.rp[n - 1])), ...P8.map((n) => sublim.jenis[n - 1] || ""), num(sublim.rpSublim)],
    );

    // ── polyflex ──
    await conn.query(`DELETE FROM tkalkulasi2_polyflex WHERE kald_nomor = ?`, [nomor]);
    await conn.query(
      `INSERT INTO tkalkulasi2_polyflex
         (kald_nomor, kald_cmpolyflex, kald_polyflexp1, kald_polyflexp2, kald_polyflexp3, kald_polyflexp4,
          kald_polyflexp5, kald_polyflexp6, kald_polyflexp7, kald_polyflexp8,
          kald_polyflexl1, kald_polyflexl2, kald_polyflexl3, kald_polyflexl4,
          kald_polyflexl5, kald_polyflexl6, kald_polyflexl7, kald_polyflexl8, kald_rppolyflex)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nomor, num(polyflex.cmPolyflex), ...P8.map((n) => num(polyflex.p[n - 1])), ...P8.map((n) => num(polyflex.l[n - 1])), num(polyflex.rpPolyflex)],
    );

    // ── dtf ──
    await conn.query(`DELETE FROM tkalkulasi2_dtf WHERE kald_nomor = ?`, [nomor]);
    await conn.query(
      `INSERT INTO tkalkulasi2_dtf
         (kald_nomor, kald_cmdtf, kald_dtfp1, kald_dtfp2, kald_dtfp3, kald_dtfp4,
          kald_dtfp5, kald_dtfp6, kald_dtfp7, kald_dtfp8,
          kald_dtfl1, kald_dtfl2, kald_dtfl3, kald_dtfl4,
          kald_dtfl5, kald_dtfl6, kald_dtfl7, kald_dtfl8, kald_rpdtf)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nomor, num(dtf.cmDtf), ...P8.map((n) => num(dtf.p[n - 1])), ...P8.map((n) => num(dtf.l[n - 1])), num(dtf.rpDtf)],
    );

    // ── cetak ──
    await conn.query(`DELETE FROM tkalkulasi2_cetak WHERE kald_nomor = ?`, [nomor]);
    await conn.query(
      `INSERT INTO tkalkulasi2_cetak
         (kald_nomor, kald_cetak1, kald_cetak2, kald_cetak3, kald_cetak4, kald_cetak5, kald_cetak6, kald_cetak7, kald_cetak8,
          kald_cmcetak1, kald_cmcetak2, kald_cmcetak3, kald_cmcetak4, kald_cmcetak5, kald_cmcetak6, kald_cmcetak7, kald_cmcetak8,
          kald_cetakp1, kald_cetakp2, kald_cetakp3, kald_cetakp4, kald_cetakp5, kald_cetakp6, kald_cetakp7, kald_cetakp8,
          kald_cetakl1, kald_cetakl2, kald_cetakl3, kald_cetakl4, kald_cetakl5, kald_cetakl6, kald_cetakl7, kald_cetakl8,
          kald_rpcetak)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nomor,
        ...P8.map((n) => cetak.jenis[n - 1] || ""),
        ...P8.map((n) => num(cetak.cm[n - 1])),
        ...P8.map((n) => num(cetak.p[n - 1])),
        ...P8.map((n) => num(cetak.l[n - 1])),
        num(cetak.rpCetak),
      ],
    );

    // ── update balik ke Minta Harga (kalau kalkulasi ini terhubung ke satu
    // permintaan harga) — replikasi simpanharga. Sinkron ke instance form
    // BrowMintaHarga yang terbuka TIDAK direplikasi (state UI Delphi, tidak
    // relevan di arsitektur stateless web). ──
    if (mintaHarga?.nomor) {
      const cStatus = dtl.ckCancel ? "CANCEL" : "";
      if (lblJudul === "KALKULASI HARGA") {
        const setStatus = cStatus || (mintaHarga.updateStatus ? "DONE" : "WAIT");
        if (mintaHarga.updateStatus) {
          await conn.query(
            `UPDATE kencanaprint.tmintaharga SET
               mh_nomor_kalkulasi = ?, user_kalkulasi = ?, mh_status = ?,
               mh_ket_kalkulasi = ?, mh_ket_beli = ?, mh_harga_kalkulasi = ?, mh_date_kalkulasi = NOW()
             WHERE mh_nomor = ?`,
            [nomor, user, setStatus, header.ket || "", header.ketBeli || "", num(header.rpSesuaiPpn), mintaHarga.nomor],
          );
        } else {
          await conn.query(
            `UPDATE kencanaprint.tmintaharga SET mh_nomor_kalkulasi = ?, user_kalkulasi = ?, mh_status = ? WHERE mh_nomor = ?`,
            [nomor, user, setStatus, mintaHarga.nomor],
          );
        }
      } else if (lblJudul === "PENAWARAN 1") {
        if (mintaHarga.updateStatus) {
          await conn.query(
            `UPDATE kencanaprint.tmintaharga SET mh_nomor_pen1 = ?, mh_harga_pen1 = ? WHERE mh_nomor = ?`,
            [nomor, num(header.rpSesuaiPpn), mintaHarga.nomor],
          );
        } else {
          await conn.query(`UPDATE kencanaprint.tmintaharga SET mh_nomor_pen1 = ? WHERE mh_nomor = ?`, [nomor, mintaHarga.nomor]);
        }
      } else if (lblJudul === "PENAWARAN 2") {
        if (mintaHarga.updateStatus) {
          await conn.query(
            `UPDATE kencanaprint.tmintaharga SET mh_nomor_pen2 = ?, mh_harga_pen2 = ? WHERE mh_nomor = ?`,
            [nomor, num(header.rpSesuaiPpn), mintaHarga.nomor],
          );
        } else {
          await conn.query(`UPDATE kencanaprint.tmintaharga SET mh_nomor_pen2 = ? WHERE mh_nomor = ?`, [nomor, mintaHarga.nomor]);
        }
      }
    }

    // ── Sinkronisasi ke MAP (tkesesuaianmap_*) SENGAJA DIABAIKAN di versi
    // ini atas permintaan — modul MAP sepertinya sudah tidak dipakai, dan
    // logic aslinya mengandung bug (kondisi pembanding selalu False, lihat
    // laporan analisis). Kalau nanti ternyata masih dipakai, replikasi
    // bagian "update ke bast map" dari simpandata (baris ~1733-1813
    // ufrmKalkulasi.pas) di sini, di dalam transaksi yang sama. ──

    await conn.commit();
    return { nomor };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};

// ═══════════════════════════════════════════════════════════════════════
// BROWSE — replikasi UBrowsekalkulasi.btnRefreshClick (tkalkulasi2_hdr)
// ═══════════════════════════════════════════════════════════════════════

const getBrowse = async ({ startDate, endDate, jenis }) => {
  // jenis: 'KALKULASI HARGA' | 'PENAWARAN 1' | 'PENAWARAN 2' | '' (semua)
  const prefixMap = {
    'KALKULASI HARGA': 'KAL',
    'PENAWARAN 1': 'KA1',
    'PENAWARAN 2': 'KA2',
  };
  let sql = `
    SELECT h.kal_nomor AS Nomor,
           DATE_FORMAT(h.kal_tanggal, '%d-%m-%Y') AS Tanggal,
           h.kal_project AS Project,
           h.kal_cus AS Customer,
           k.kh_nama AS Model,
           h.kal_rencanaorder AS RencanaOrder,
           h.kal_ket AS Keterangan,
           h.kal_rpsesuai AS HargaPenyesuaian,
           DATE_FORMAT(IFNULL(h.date_modified, h.date_create), '%d-%m-%Y %H:%i') AS Updated,
           h.kal_nomor AS _rawNomor
    FROM tkalkulasi2_hdr h
    LEFT JOIN tkerja_hdr k ON k.kh_kode = h.kal_kh_kode
    WHERE h.kal_tanggal BETWEEN ? AND ?
  `;
  const params = [startDate, endDate];
  const prefix = prefixMap[jenis];
  if (prefix) {
    sql += ` AND LEFT(h.kal_nomor, 3) = ?`;
    params.push(prefix);
  }
  sql += ` ORDER BY h.kal_nomor DESC`;
  const [rows] = await db.query(sql, params);
  return rows;
};

const deleteKalkulasi = async (nomor) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // hapus header — detail akan terhapus via FK / manual
    // replikasi UBrowsekalkulasi.cxButton4Click : delete FROM tkalkulasi2_hdr
    // (Delphi hanya hapus header, child orphan — kita hapus child juga biar bersih)
    await conn.query(`DELETE FROM tkalkulasi2_bordir WHERE kald_nomor = ?`, [nomor]);
    await conn.query(`DELETE FROM tkalkulasi2_cetak WHERE kald_nomor = ?`, [nomor]);
    await conn.query(`DELETE FROM tkalkulasi2_sublim WHERE kald_nomor = ?`, [nomor]);
    await conn.query(`DELETE FROM tkalkulasi2_polyflex WHERE kald_nomor = ?`, [nomor]);
    await conn.query(`DELETE FROM tkalkulasi2_dtf WHERE kald_nomor = ?`, [nomor]);
    await conn.query(`DELETE FROM tkalkulasi2_komponen WHERE kk_nomor = ?`, [nomor]);
    await conn.query(`DELETE FROM tkalkulasi2_aksesories WHERE ka_nomor = ?`, [nomor]);
    await conn.query(`DELETE FROM tkalkulasi2_dtl WHERE kald_nomor = ?`, [nomor]);
    const [res] = await conn.query(`DELETE FROM tkalkulasi2_hdr WHERE kal_nomor = ?`, [nomor]);
    if (res.affectedRows === 0) throw new Error('Data tidak ditemukan.');
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};

module.exports = {
  getPpnGlobal,
  searchModelKerja,
  getModelKerja,
  getJenisKainOptions,
  getGramasi,
  getHargaKain,
  getRibBabaran,
  getKrahManset,
  getKomponenMaster,
  getBiayaTunggal,
  getBiayaMin,
  listBiayaPengerjaan,
  getKetSublim,
  getHargaSublim,
  getMargin,
  getMinCetak,
  getDetail,
  getMintaHarga,
  getNego,
  saveData,
  getBrowse,
  deleteKalkulasi,
};
