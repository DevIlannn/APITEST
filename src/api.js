import express from "express";
import bcrypt from "bcryptjs";
import pool from "./db.js";
import { ambilOrBuatApiKeyDenganId, verifikasiApiKey } from "./utils.js";

const router = express.Router();

const KOLOM_AMAN = "id, email, email_terverifikasi_pada, nama_pengguna, nama_lengkap, url_avatar, nomor_telepon, telepon_terverifikasi_pada, peran, status, login_terakhir_pada, dibuat_pada, diperbarui_pada";

router.post("/apitest/apikey/:id", ambilOrBuatApiKeyDenganId);

router.all("/apitest/apikeys", (req, res) => {
    res.status(404).json({
        status: "gagal",
        pesan: "Endpoint tidak ditemukan",
    });
});

router.use("/apitest", verifikasiApiKey);

router.get("/apitest/pengguna", async (req, res) => {
    try {
        const hasil = await pool.query(
            `SELECT ${KOLOM_AMAN}
             FROM pengguna
             WHERE dihapus_pada IS NULL
             ORDER BY dibuat_pada DESC`
        );

        res.json({
            status: "ok",
            total: hasil.rowCount,
            data: hasil.rows,
        });
    } catch (error) {
        res.status(500).json({
            status: "gagal",
            pesan: "Terjadi kesalahan saat mengambil data pengguna",
        });
    }
});

router.get("/apitest/pengguna/:id", async (req, res) => {
    try {
        const hasil = await pool.query(
            `SELECT ${KOLOM_AMAN}
             FROM pengguna
             WHERE id = $1 AND dihapus_pada IS NULL`,
            [req.params.id]
        );

        if (hasil.rowCount === 0) {
            return res.status(404).json({
                status: "gagal",
                pesan: "Pengguna tidak ditemukan",
            });
        }

        res.json({
            status: "ok",
            data: hasil.rows[0],
        });
    } catch (error) {
        res.status(500).json({
            status: "gagal",
            pesan: "Terjadi kesalahan saat mengambil data pengguna",
        });
    }
});

router.post("/apitest/pengguna", async (req, res) => {
    try {
        const {
            email,
            kata_sandi,
            nama_pengguna,
            nama_lengkap,
            url_avatar,
            nomor_telepon,
            peran,
            status,
        } = req.body;

        if (!email || !kata_sandi || !nama_lengkap) {
            return res.status(400).json({
                status: "gagal",
                pesan: "Email, kata sandi, dan nama lengkap wajib diisi",
            });
        }

        const kata_sandi_hash = await bcrypt.hash(kata_sandi, 10);

        const hasil = await pool.query(
            `INSERT INTO pengguna (email, kata_sandi_hash, nama_pengguna, nama_lengkap, url_avatar, nomor_telepon, peran, status)
             VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'pengguna'), COALESCE($8, 'aktif'))
             RETURNING ${KOLOM_AMAN}`,
            [
                email,
                kata_sandi_hash,
                nama_pengguna || null,
                nama_lengkap,
                url_avatar || null,
                nomor_telepon || null,
                peran || null,
                status || null,
            ]
        );

        res.status(201).json({
            status: "ok",
            data: hasil.rows[0],
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                status: "gagal",
                pesan: "Email atau nama pengguna sudah terdaftar",
            });
        }

        res.status(500).json({
            status: "gagal",
            pesan: "Terjadi kesalahan saat membuat pengguna",
        });
    }
});

router.put("/apitest/pengguna/:id", async (req, res) => {
    try {
        const { nama_pengguna, nama_lengkap, url_avatar, peran, status } = req.body;

        const hasil = await pool.query(
            `UPDATE pengguna
             SET nama_pengguna = COALESCE($1, nama_pengguna),
                 nama_lengkap = COALESCE($2, nama_lengkap),
                 url_avatar = COALESCE($3, url_avatar),
                 peran = COALESCE($4, peran),
                 status = COALESCE($5, status)
             WHERE id = $6 AND dihapus_pada IS NULL
             RETURNING ${KOLOM_AMAN}`,
            [nama_pengguna, nama_lengkap, url_avatar, peran, status, req.params.id]
        );

        if (hasil.rowCount === 0) {
            return res.status(404).json({
                status: "gagal",
                pesan: "Pengguna tidak ditemukan",
            });
        }

        res.json({
            status: "ok",
            data: hasil.rows[0],
        });
    } catch (error) {
        res.status(500).json({
            status: "gagal",
            pesan: "Terjadi kesalahan saat memperbarui pengguna",
        });
    }
});

router.delete("/apitest/pengguna/:id", async (req, res) => {
    try {
        const hasil = await pool.query(
            `UPDATE pengguna
             SET dihapus_pada = now()
             WHERE id = $1 AND dihapus_pada IS NULL
             RETURNING id`,
            [req.params.id]
        );

        if (hasil.rowCount === 0) {
            return res.status(404).json({
                status: "gagal",
                pesan: "Pengguna tidak ditemukan",
            });
        }

        res.json({
            status: "ok",
            pesan: "Pengguna berhasil dihapus",
        });
    } catch (error) {
        res.status(500).json({
            status: "gagal",
            pesan: "Terjadi kesalahan saat menghapus pengguna",
        });
    }
});

export default router;
