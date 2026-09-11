import express from "express";
import cors from "cors";
import session from "express-session";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { cekKoneksiDatabase } from "./db.js";
import apiRouter from "./api.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT;

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 8,
        },
    })
);

app.use("/api", apiRouter);

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (req, res) => {
    res.redirect("/docs");
});

app.get("/docs", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

const MODE = process.env.NODE_ENV === "production" ? "production" : "development";

async function mulaiServer() {
    await cekKoneksiDatabase();
    console.log("Koneksi database berhasil");

    if (MODE === "development") {
        app.listen(PORT, () => {
            console.log(`Server berjalan di port ${PORT} (development)`);
        });
    } else {
        console.log("Server berjalan dalam mode production (serverless)");
    }
}

mulaiServer().catch((error) => {
    console.error("Gagal koneksi ke database:", error.message);
    if (MODE === "development") process.exit(1);
});

export default app;
