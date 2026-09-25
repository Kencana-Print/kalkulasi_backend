const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/imageController");

// Sengaja tanpa verifyToken — <img> tidak mengirim header Authorization.
router.get("/mintaharga/:file", ctrl.streamMintaharga);

module.exports = router;
