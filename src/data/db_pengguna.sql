CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE peran_pengguna AS ENUM ('admin', 'pengguna');
CREATE TYPE status_pengguna AS ENUM ('aktif', 'ditangguhkan', 'diblokir', 'menunggu');

CREATE TABLE pengguna (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    email_terverifikasi_pada TIMESTAMPTZ,
    kata_sandi_hash TEXT NOT NULL,
    nama_pengguna VARCHAR(50) UNIQUE,
    nama_lengkap VARCHAR(100) NOT NULL,
    url_avatar TEXT,
    nomor_telepon VARCHAR(20),
    telepon_terverifikasi_pada TIMESTAMPTZ,
    peran peran_pengguna NOT NULL DEFAULT 'pengguna',
    status status_pengguna NOT NULL DEFAULT 'menunggu',
    percobaan_login_gagal SMALLINT NOT NULL DEFAULT 0,
    terkunci_hingga TIMESTAMPTZ,
    login_terakhir_pada TIMESTAMPTZ,
    ip_login_terakhir INET,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
    diperbarui_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
    dihapus_pada TIMESTAMPTZ
);

CREATE INDEX idx_pengguna_email ON pengguna (email) WHERE dihapus_pada IS NULL;
CREATE INDEX idx_pengguna_status ON pengguna (status) WHERE dihapus_pada IS NULL;

CREATE OR REPLACE FUNCTION perbarui_kolom_diperbarui_pada()
RETURNS TRIGGER AS $$
BEGIN
    NEW.diperbarui_pada = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pengguna_diperbarui_pada
BEFORE UPDATE ON pengguna
FOR EACH ROW
EXECUTE FUNCTION perbarui_kolom_diperbarui_pada();