CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    api_key_hash VARCHAR(64) NOT NULL UNIQUE,
    tampilan_key VARCHAR(60) NOT NULL,
    ip_pembuat VARCHAR(45) NOT NULL,
    device_pembuat VARCHAR(64) NOT NULL,
    user_agent TEXT,
    terakhir_dipakai_pada TIMESTAMPTZ,
    dicabut_pada TIMESTAMPTZ,
    dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_ip_device_aktif
    ON api_keys (ip_pembuat, device_pembuat)
    WHERE dicabut_pada IS NULL;

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (api_key_hash);
