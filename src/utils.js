import crypto from "crypto";
import pool from "./db.js";

const PREFIX_API_KEY = "sk_live_";
const PANJANG_SECRET = 32;

function buatFingerprintDevice(req) {
    const userAgent = req.headers["user-agent"] || "";
    const acceptLanguage = req.headers["accept-language"] || "";
    return crypto
        .createHash("sha256")
        .update(`${userAgent}|${acceptLanguage}`)
        .digest("hex");
}

function ambilIpPengguna(req) {
    const ipHeader = req.headers["x-forwarded-for"];
    if (ipHeader) return ipHeader.split(",")[0].trim();
    return req.socket?.remoteAddress || req.ip || "";
}

function buatApiKeyBaru() {
    const secret = crypto.randomBytes(PANJANG_SECRET).toString("hex");
    return `${PREFIX_API_KEY}${secret}`;
}

function hashApiKey(apiKey) {
    return crypto.createHash("sha256").update(apiKey).digest("hex");
}

function ambilTampilanKey(apiKey) {
    return `${apiKey.slice(0, PREFIX_API_KEY.length + 6)}${"*".repeat(20)}${apiKey.slice(-4)}`;
}

async function ambilOrBuatApiKeyDenganId(req, res) {
    const idParam = req.params.id;

    if (!idParam || !/^\d+$/.test(idParam)) {
        return res.status(400).json({
            status: "gagal",
            pesan: "Id record api key tidak valid",
        });
    }

    const ipPeminta = ambilIpPengguna(req);
    const devicePeminta = buatFingerprintDevice(req);

    try {
        const record = await pool.query(
            `SELECT id, ip_pembuat, device_pembuat, tampilan_key, dibuat_pada
             FROM api_keys
             WHERE id = $1 AND dicabut_pada IS NULL`,
            [idParam]
        );

        if (record.rowCount > 0) {
            const cocok =
                record.rows[0].ip_pembuat === ipPeminta &&
                record.rows[0].device_pembuat === devicePeminta;

            if (!cocok) {
                return res.status(403).json({
                    status: "gagal",
                    pesan: "IP atau device tidak cocok dengan pemilik record ini",
                });
            }

            return res.status(200).json({
                status: "ok",
                pesan: "Api key sudah pernah dibuat untuk IP / device ini",
                data: {
                    tampilan_key: record.rows[0].tampilan_key,
                    dibuat_pada: record.rows[0].dibuat_pada,
                },
            });
        }

        const sudahPunyaKeyLain = await pool.query(
            `SELECT id FROM api_keys
             WHERE ip_pembuat = $1 AND device_pembuat = $2 AND dicabut_pada IS NULL
             LIMIT 1`,
            [ipPeminta, devicePeminta]
        );

        if (sudahPunyaKeyLain.rowCount > 0) {
            return res.status(409).json({
                status: "gagal",
                pesan: "IP / device ini sudah memiliki api key lain, gunakan id record tersebut",
            });
        }

        const apiKeyBaru = buatApiKeyBaru();
        const apiKeyHash = hashApiKey(apiKeyBaru);
        const tampilanKey = ambilTampilanKey(apiKeyBaru);

        const hasilInsert = await pool.query(
            `INSERT INTO api_keys (id, nama, api_key_hash, tampilan_key, ip_pembuat, device_pembuat, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, dibuat_pada`,
            [
                idParam,
                `key-${ipPeminta}`,
                apiKeyHash,
                tampilanKey,
                ipPeminta,
                devicePeminta,
                req.headers["user-agent"] || null,
            ]
        );

        res.status(201).json({
            status: "ok",
            pesan: "Api key baru berhasil dibuat, simpan sekarang karena tidak akan ditampilkan lagi",
            data: {
                api_key: apiKeyBaru,
                dibuat_pada: hasilInsert.rows[0].dibuat_pada,
            },
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                status: "gagal",
                pesan: "Id record sudah dipakai atau IP / device sudah memiliki api key",
            });
        }

        res.status(500).json({
            status: "gagal",
            pesan: "Terjadi kesalahan saat memproses api key",
        });
    }
}

async function verifikasiApiKey(req, res, next) {
    const apiKeyHeader = req.headers["x-api-key"];

    if (!apiKeyHeader) {
        return res.status(401).json({
            status: "gagal",
            pesan: "Api key wajib disertakan pada header x-api-key",
        });
    }

    try {
        const hash = hashApiKey(apiKeyHeader);
        const hasil = await pool.query(
            `SELECT id FROM api_keys WHERE api_key_hash = $1 AND dicabut_pada IS NULL`,
            [hash]
        );

        if (hasil.rowCount === 0) {
            return res.status(403).json({
                status: "gagal",
                pesan: "Api key tidak valid atau sudah dicabut",
            });
        }

        pool.query(
            `UPDATE api_keys SET terakhir_dipakai_pada = now() WHERE id = $1`,
            [hasil.rows[0].id]
        ).catch(() => {});

        req.apiKeyId = hasil.rows[0].id;
        next();
    } catch (error) {
        res.status(500).json({
            status: "gagal",
            pesan: "Terjadi kesalahan saat memverifikasi api key",
        });
    }
}

export { ambilOrBuatApiKeyDenganId, verifikasiApiKey, ambilIpPengguna, buatFingerprintDevice };
