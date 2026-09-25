const http = require("http");
const https = require("https");

// Proxy gambar desain Minta Harga agar bisa dimuat same-origin.
// Tanpa ini browser meminta langsung "103.94.238.252:8182/..." (tanpa
// protokol → 404) atau kena blokir mixed-content saat app dibuka via HTTPS.
// Tanpa verifyToken: tag <img> tidak bisa kirim header Authorization Bearer
// (hanya nama file .jpg valid yang boleh lewat — anti path traversal).
const BASE =
  process.env.MINTAHARGA_IMAGE_BASE ||
  "http://103.94.238.252:8182/images/mintaharga";

const streamMintaharga = (req, res) => {
  const file = String(req.params.file || "");
  if (!/^[A-Za-z0-9._-]+\.jpg$/i.test(file) || file.includes("..")) {
    return res
      .status(400)
      .json({ success: false, message: "Nama file tidak valid." });
  }

  const target = `${BASE.replace(/\/$/, "")}/${encodeURIComponent(file)}`;
  const lib = target.startsWith("https") ? https : http;

  const rq = lib.get(target, (up) => {
    if (up.statusCode !== 200) {
      up.resume();
      return res.status(404).json({
        success: false,
        message: "Gambar tidak ditemukan di server gambar.",
      });
    }
    res.setHeader("Content-Type", up.headers["content-type"] || "image/jpeg");
    if (up.headers["content-length"])
      res.setHeader("Content-Length", up.headers["content-length"]);
    res.setHeader("Cache-Control", "public, max-age=3600");
    up.pipe(res);
  });

  rq.setTimeout(15000);
  rq.on("timeout", () => {
    rq.destroy();
    if (!res.headersSent)
      res.status(504).json({ success: false, message: "Server gambar timeout." });
  });
  rq.on("error", () => {
    if (!res.headersSent)
      res.status(502).json({ success: false, message: "Server gambar tidak terjangkau." });
  });
};

module.exports = { streamMintaharga };
