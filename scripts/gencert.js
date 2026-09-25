// Regenerasi self-signed cert HTTPS (berlaku 825 hari).
// Jalankan: npm run gencert — lalu restart backend.
// SAN mencakup localhost, hostname, 127.0.0.1 + semua IPv4 LAN mesin ini,
// supaya bisa diakses https://localhost, https://<hostname>, https://<ip-lan>.
const os = require("os");
const fs = require("fs");
const path = require("path");
const { generate } = require("selfsigned");

(async () => {
  const nets = os.networkInterfaces();
  const ips = new Set(["127.0.0.1"]);
  Object.values(nets)
    .flat()
    .forEach((n) => {
      if (n && n.family === "IPv4" && !n.internal) ips.add(n.address);
    });
  const altNames = [
    { type: 2, value: "localhost" },
    { type: 2, value: os.hostname().toLowerCase() },
    ...[...ips].map((ip) => ({ type: 7, ip })),
  ];
  const pems = await generate([{ name: "commonName", value: os.hostname() }], {
    keySize: 2048,
    days: 825,
    algorithm: "sha256",
    extensions: [{ name: "subjectAltName", altNames }],
  });
  const dir = path.join(__dirname, "..", "certs");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "kalkulasi-key.pem"), pems.private);
  fs.writeFileSync(path.join(dir, "kalkulasi-cert.pem"), pems.cert);
  console.log("SAN IPs:", [...ips].join(","), "| host:", os.hostname());
  console.log("OK: certs/kalkulasi-key.pem + certs/kalkulasi-cert.pem");
})().catch((e) => {
  console.error("Gagal generate cert:", e.message);
  process.exit(1);
});
