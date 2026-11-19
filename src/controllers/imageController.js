const fs = require("fs");
const path = require("path");

const IMAGE_DIR = "/mnt/image/mintaharga";

const streamMintaharga = (req, res) => {
  const file = String(req.params.file || "");
  if (!/^[A-Za-z0-9._-]+\.jpg$/i.test(file) || file.includes("..")) {
    return res
      .status(400)
      .json({ success: false, message: "Nama file tidak valid." });
  }

  const filePath = path.join(IMAGE_DIR, file);
  if (!fs.existsSync(filePath)) {
    return res
      .status(404)
      .json({ success: false, message: "Gambar tidak ditemukan." });
  }

  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=3600");
  fs.createReadStream(filePath).pipe(res);
};

module.exports = { streamMintaharga };
