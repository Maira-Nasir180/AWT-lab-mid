/**
 * VSPARK Registration Portal - Backend
 * Express API + JSON file storage (no database setup needed).
 */
const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { INSTITUTES, PROGRAMS } = require("./options");

const PORT = process.env.PORT || 3000;
const ADMIN_USER = (process.env.ADMIN_USER || "admin").trim();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || "maira1234").trim();
const DB_FILE = path.join(__dirname, "data", "registrations.json");

// ---------- Validation rules ----------
const COMSATS_REG_NO = /^(FA|SP)\d{2}-[A-Z]{2,4}-\d{3}$/; // e.g. FA23-BSE-062
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^03\d{9}$/; // e.g. 03001234567

// ---------- Storage helpers ----------
function readAll() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return [];
  }
}
function writeAll(list) {
  fs.writeFileSync(DB_FILE, JSON.stringify(list, null, 2));
}
const clean = (v) => String(v || "").trim();

// ---------- Registration validation ----------
function readMember(body, n) {
  return {
    name: clean(body[`member${n}Name`]),
    regNo: clean(body[`member${n}RegNo`]).toUpperCase(),
    institute: clean(body[`member${n}Institute`]),
    program: clean(body[`member${n}Program`]),
  };
}

/** Checks one member and writes any problems into `errors`. */
function checkMember(m, n, errors) {
  const institute = INSTITUTES.find((i) => i.name === m.institute);
  if (m.name.length < 3) errors[`member${n}Name`] = "Enter the full name.";
  if (!institute) errors[`member${n}Institute`] = "Choose an institute.";
  if (!PROGRAMS.includes(m.program)) errors[`member${n}Program`] = "Choose a degree program.";

  if (institute?.comsats) {
    if (!COMSATS_REG_NO.test(m.regNo)) errors[`member${n}RegNo`] = "Use the format FA23-BSE-062.";
  } else if (m.regNo.length < 3) {
    errors[`member${n}RegNo`] = "Enter your roll / registration number.";
  }
}

function validate(body, existing) {
  const errors = {};
  const m1 = readMember(body, 1);
  const m2 = readMember(body, 2);
  const hasSecond = Boolean(m2.name || m2.regNo || m2.institute || m2.program);

  const data = {
    teamName: clean(body.teamName),
    email: clean(body.email).toLowerCase(),
    phone: clean(body.phone),
    paymentMethod: clean(body.paymentMethod),
    transactionId: clean(body.transactionId),
    members: hasSecond ? [m1, m2] : [m1],
  };

  checkMember(m1, 1, errors);
  if (hasSecond) checkMember(m2, 2, errors);
  if (!EMAIL.test(data.email)) errors.email = "Enter a valid email address.";
  if (!PHONE.test(data.phone)) errors.phone = "Use the format 03001234567.";
  if (!["Easypaisa", "JazzCash", "Bank transfer"].includes(data.paymentMethod))
    errors.paymentMethod = "Choose a payment method.";
  if (data.transactionId.length < 4) errors.transactionId = "Enter the transaction ID.";

  // A person is identified by institute + registration number
  const idOf = (m) => `${m.institute}|${m.regNo}`;
  if (hasSecond && !errors.member2RegNo && idOf(m1) === idOf(m2))
    errors.member2RegNo = "Teammate must be a different person.";

  const taken = new Set(existing.flatMap((r) => r.members.map(idOf)));
  data.members.forEach((m, i) => {
    const key = `member${i + 1}RegNo`;
    if (!errors[key] && taken.has(idOf(m))) errors[key] = `${m.regNo} is already registered.`;
  });

  return { errors, data };
}

// ---------- App ----------
const app = express();
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

// Lists for the form dropdowns
app.get("/api/options", (req, res) => res.json({ institutes: INSTITUTES, programs: PROGRAMS }));

app.post("/api/register", (req, res) => {
  const list = readAll();
  const { errors, data } = validate(req.body, list);
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const nextNumber = list.reduce((max, r) => Math.max(max, Number(r.id.slice(3))), 0) + 1;
  const record = {
    id: "VS-" + String(nextNumber).padStart(4, "0"),
    ...data,
    paymentVerified: false,
    createdAt: new Date().toISOString(),
  };
  list.push(record);
  writeAll(list);
  res.status(201).json({ id: record.id });
});

// ---------- Admin ----------
const sessions = new Map(); // token -> expiry timestamp
const SESSION_MS = 8 * 60 * 60 * 1000;

app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USER || password !== ADMIN_PASSWORD)
    return res.status(401).json({ error: "Wrong username or password." });
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, Date.now() + SESSION_MS);
  res.json({ token });
});

function requireAdmin(req, res, next) {
  const token = (req.get("authorization") || "").replace("Bearer ", "");
  const expiry = sessions.get(token);
  if (!expiry || expiry < Date.now()) return res.status(401).json({ error: "Please log in again." });
  next();
}

app.get("/api/admin/registrations", requireAdmin, (req, res) => res.json(readAll()));

// Mark a payment as verified / unverified
app.patch("/api/admin/registrations/:id/verify", requireAdmin, (req, res) => {
  const list = readAll();
  const record = list.find((r) => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: "Registration not found." });
  record.paymentVerified = !record.paymentVerified;
  writeAll(list);
  res.json(record);
});

app.delete("/api/admin/registrations/:id", requireAdmin, (req, res) => {
  const list = readAll();
  const remaining = list.filter((r) => r.id !== req.params.id);
  if (remaining.length === list.length) return res.status(404).json({ error: "Registration not found." });
  writeAll(remaining);
  res.json({ ok: true });
});

app.get("/api/admin/export.csv", requireAdmin, (req, res) => {
  const header = [
    "ID", "Team", "Email", "Phone", "Payment", "Transaction ID", "Verified", "Registered at",
    "M1 Name", "M1 Reg No", "M1 Institute", "M1 Program",
    "M2 Name", "M2 Reg No", "M2 Institute", "M2 Program",
  ];
  const rows = readAll().map((r) => {
    const [a, b = {}] = r.members;
    return [
      r.id, r.teamName, r.email, r.phone, r.paymentMethod, r.transactionId,
      r.paymentVerified ? "Yes" : "No", r.createdAt,
      a.name, a.regNo, a.institute, a.program, b.name, b.regNo, b.institute, b.program,
    ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",");
  });
  res.type("text/csv").attachment("vspark-registrations.csv").send([header.join(","), ...rows].join("\n"));
});

app.listen(PORT, () => {
  console.log(`VSPARK portal:  http://localhost:${PORT}`);
  console.log(`Admin panel:    http://localhost:${PORT}/admin`);
});