const path = require("path");
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

require("dotenv").config({
  path: path.resolve(__dirname, "..", ".env"),
});

const filesRouter = require("./routes/files");
const foldersRouter = require("./routes/folders");

const {
  createMinioClientFromEnv,
  createStorage,
} = require("./storage/minioStorage");

const app = express();
const port = Number(process.env.PORT) || 3000;

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET .env dosyasında bulunamadı.");
}

const db = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT) || 5432,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
  }),
);

app.options("*", cors());

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.locals.db = db;

try {
  const minioClient = createMinioClientFromEnv();

  const storage = createStorage(
    minioClient,
    process.env.MINIO_BUCKET || "secureshare-files",
  );

  app.locals.storage = storage;

  storage
    .ensureBucket()
    .then(() => {
      console.log("MinIO bucket hazır.");
    })
    .catch((error) => {
      console.error("MinIO bucket hatası:", error.message);
    });
} catch (error) {
  console.warn("MinIO başlatılamadı:", error.message);
}

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    },
  );
}

app.get("/health", (req, res) => {
  res.json({
    status: "Backend çalışıyor!",
  });
});

app.get("/health/db", async (req, res) => {
  try {
    const result = await db.query("SELECT 1 AS sonuc");

    return res.json({
      status: "Bağlantı başarılı!",
      database: result.rows[0].sonuc,
    });
  } catch (error) {
    console.error("Veritabanı bağlantı hatası:", error.message);

    return res.status(500).json({
      error: "Veritabanına bağlanılamadı.",
    });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body || {};

    if (
      typeof fullName !== "string" ||
      !fullName.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        error: "Ad soyad, e-posta ve parola zorunludur.",
      });
    }

    const strongPassword =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

    if (!strongPassword.test(password)) {
      return res.status(400).json({
        error:
          "Parola en az 8 karakter, büyük harf, küçük harf, rakam ve sembol içermelidir.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    const result = await db.query(
      `
        INSERT INTO users (full_name, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, full_name, email, created_at
      `,
      [fullName.trim(), normalizedEmail, passwordHash],
    );

    const user = result.rows[0];

    return res.status(201).json({
      message: "Kayıt başarılı.",
      token: createToken(user),
      user,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Bu e-posta adresi zaten kayıtlı.",
      });
    }

    console.error("Kayıt hatası:", error.message);

    return res.status(500).json({
      error: "Kayıt işlemi başarısız oldu.",
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        error: "E-posta ve parola zorunludur.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await db.query(
      `
        SELECT id, full_name, email, password_hash
        FROM users
        WHERE email = $1
      `,
      [normalizedEmail],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "E-posta veya parola hatalı.",
      });
    }

    const user = result.rows[0];

    const passwordIsValid = await argon2.verify(
      user.password_hash,
      password,
    );

    if (!passwordIsValid) {
      return res.status(401).json({
        error: "E-posta veya parola hatalı.",
      });
    }

    return res.json({
      message: "Giriş başarılı.",
      token: createToken(user),
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Giriş hatası:", error.message);

    return res.status(500).json({
      error: "Giriş işlemi başarısız oldu.",
    });
  }
});

app.use("/api/files", filesRouter);
app.use("/api/folders", foldersRouter);

app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint bulunamadı.",
  });
});

app.use((error, req, res, next) => {
  console.error("Sunucu hatası:", error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    error: "Sunucu hatası oluştu.",
  });
});

const server = app.listen(port, () => {
  console.log(`Backend http://localhost:${port} adresinde çalışıyor.`);
});

async function shutdown(signal) {
  console.log(`${signal} alındı. Backend kapatılıyor...`);

  await db.end();

  server.close(() => {
    console.log("Veritabanı bağlantısı kapatıldı.");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));