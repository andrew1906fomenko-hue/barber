import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { Pool } from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use("/api", rateLimit({ windowMs: 60 * 1000, max: 300 }));

app.use(express.static("."));

async function initDb() {
  const sql = readFileSync(resolve("db/schema.sql"), "utf8");
  await pool.query(sql);
}

function makeToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

function auth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

async function loadMaster(masterId) {
  const m = await pool.query("SELECT * FROM masters WHERE id = $1", [masterId]);
  if (!m.rows[0]) return null;
  const master = m.rows[0];

  const services = await pool.query("SELECT id, title, price, duration_min AS \"durationMin\", notes FROM services WHERE master_id = $1", [masterId]);
  const offDays = await pool.query("SELECT day::text AS day FROM off_days WHERE master_id = $1 ORDER BY day", [masterId]);
  const appointments = await pool.query(
    "SELECT id, service_id AS \"serviceId\", date::text AS date, start_time AS start, end_time AS end, client_name AS \"clientName\", client_phone AS \"clientPhone\" FROM appointments WHERE master_id = $1",
    [masterId],
  );

  return {
    id: master.id,
    name: master.name,
    slug: master.slug,
    notes: master.notes,
    workStart: master.work_start,
    workEnd: master.work_end,
    slotStepMin: master.slot_step_min,
    bufferMin: master.buffer_min,
    workDays: master.work_days,
    showPrice: master.show_price,
    services: services.rows,
    offDays: offDays.rows.map((i) => i.day),
    appointments: appointments.rows,
    editingServiceId: null,
  };
}

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) return res.status(400).json({ error: "Invalid payload" });

  const emailNorm = String(email).trim().toLowerCase();
  const exists = await pool.query("SELECT id FROM users WHERE email = $1", [emailNorm]);
  if (exists.rows[0]) return res.status(409).json({ error: "Email exists" });

  const userId = randomUUID();
  const masterId = randomUUID();
  const hash = await bcrypt.hash(password, 10);
  const slug = `${name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString().slice(-4)}`;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO users (id, email, password_hash) VALUES ($1,$2,$3)", [userId, emailNorm, hash]);
    await client.query(
      "INSERT INTO masters (id, user_id, name, slug) VALUES ($1,$2,$3,$4)",
      [masterId, userId, name, slug],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  const master = await loadMaster(masterId);
  return res.json({ token: makeToken(userId), master });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const emailNorm = String(email || "").trim().toLowerCase();
  const user = await pool.query("SELECT id, password_hash FROM users WHERE email = $1", [emailNorm]);
  if (!user.rows[0]) return res.status(401).json({ error: "Bad credentials" });
  const ok = await bcrypt.compare(password || "", user.rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: "Bad credentials" });

  const masterRow = await pool.query("SELECT id FROM masters WHERE user_id = $1", [user.rows[0].id]);
  const master = await loadMaster(masterRow.rows[0].id);
  return res.json({ token: makeToken(user.rows[0].id), master });
});

app.get("/api/me", auth, async (req, res) => {
  const masterRow = await pool.query("SELECT id FROM masters WHERE user_id = $1", [req.user.userId]);
  if (!masterRow.rows[0]) return res.status(404).json({ error: "No master" });
  const master = await loadMaster(masterRow.rows[0].id);
  return res.json({ master });
});

app.get("/api/public/masters/:slug", async (req, res) => {
  const row = await pool.query("SELECT id FROM masters WHERE slug = $1", [req.params.slug]);
  if (!row.rows[0]) return res.status(404).json({ error: "Not found" });
  const master = await loadMaster(row.rows[0].id);
  return res.json({ master });
});

app.post("/api/public/masters/:slug/book", async (req, res) => {
  const row = await pool.query("SELECT id FROM masters WHERE slug = $1", [req.params.slug]);
  if (!row.rows[0]) return res.status(404).json({ error: "Not found" });
  const masterId = row.rows[0].id;
  const { serviceId, date, start, end, clientName, clientPhone } = req.body;
  if (!serviceId || !date || !start || !end || !clientName || !clientPhone) return res.status(400).json({ error: "Invalid payload" });
  await pool.query(
    "INSERT INTO appointments (id, master_id, service_id, date, start_time, end_time, client_name, client_phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
    [randomUUID(), masterId, serviceId, date, start, end, clientName, clientPhone],
  );
  return res.json({ ok: true });
});

app.put("/api/masters/:id", auth, async (req, res) => {
  const masterId = req.params.id;
  const owned = await pool.query("SELECT id FROM masters WHERE id = $1 AND user_id = $2", [masterId, req.user.userId]);
  if (!owned.rows[0]) return res.status(403).json({ error: "Forbidden" });

  const m = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE masters SET name=$1, slug=$2, notes=$3, work_start=$4, work_end=$5, slot_step_min=$6, buffer_min=$7, work_days=$8::jsonb, show_price=$9, updated_at=NOW() WHERE id=$10`,
      [m.name, m.slug, m.notes || "", m.workStart, m.workEnd, m.slotStepMin, m.bufferMin, JSON.stringify(m.workDays || []), m.showPrice !== false, masterId],
    );

    await client.query("DELETE FROM services WHERE master_id = $1", [masterId]);
    for (const s of m.services || []) {
      await client.query(
        "INSERT INTO services (id, master_id, title, price, duration_min, notes) VALUES ($1,$2,$3,$4,$5,$6)",
        [s.id || randomUUID(), masterId, s.title, s.price, s.durationMin, s.notes || ""],
      );
    }

    await client.query("DELETE FROM off_days WHERE master_id = $1", [masterId]);
    for (const day of m.offDays || []) {
      await client.query("INSERT INTO off_days (master_id, day) VALUES ($1,$2)", [masterId, day]);
    }

    await client.query("DELETE FROM appointments WHERE master_id = $1", [masterId]);
    for (const a of m.appointments || []) {
      await client.query(
        "INSERT INTO appointments (id, master_id, service_id, date, start_time, end_time, client_name, client_phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
        [a.id || randomUUID(), masterId, a.serviceId, a.date, a.start, a.end, a.clientName, a.clientPhone],
      );
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  const master = await loadMaster(masterId);
  return res.json({ master });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`FastBook API started on :${PORT}`);
    });
  })
  .catch((e) => {
    console.error("DB init failed", e);
    process.exit(1);
  });
