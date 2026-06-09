require('dotenv').config();

const path = require('node:path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { z } = require('zod');

const { getSequelize } = require('./db');
const { defineModels } = require('./models');
const { signToken, authMiddleware } = require('./auth');
const { createRestRouter } = require('./rest');
const { createStorageRouter } = require('./storage');

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  const sequelize = getSequelize();
  const models = defineModels(sequelize);

  app.get('/api/health', async (_req, res) => {
    try {
      await sequelize.authenticate();
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: { message: String(e?.message || e) } });
    }
  });

  app.post('/api/auth/signup', async (req, res) => {
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: { message: 'Missing email or password' } });
    const userName = name || String(email).split('@')[0] || 'User';
    const password_hash = await bcrypt.hash(String(password), 10);
    try {
      const user = await models.User.create({ email: String(email), name: String(userName), role: 'user', password_hash });
      const token = signToken({ sub: user.id, email: user.email, role: user.role });
      return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (e) {
      return res.status(400).json({ error: { message: String(e?.message || e) } });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: { message: 'Missing email or password' } });
    const user = await models.User.findOne({ where: { email: String(email) } });
    if (!user) return res.status(401).json({ error: { message: 'Invalid credentials' } });
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(401).json({ error: { message: 'Invalid credentials' } });
    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, job_title: user.job_title } });
  });

  app.post('/api/auth/logout', (_req, res) => {
    return res.json({ ok: true });
  });

  app.get('/api/auth/me', authMiddleware(), async (req, res) => {
    const id = req.user?.sub;
    const user = await models.User.findByPk(id);
    if (!user) return res.status(401).json({ error: { message: 'Unauthorized' } });
    return res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, job_title: user.job_title, created_at: user.created_at } });
  });

  app.post('/api/admin/users/import', authMiddleware(), async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: { message: 'Forbidden' } });

    const schema = z.object({
      users: z.array(
        z.object({
          email: z.string().min(1),
          name: z.string().min(1),
          role: z.enum(['admin', 'manager', 'user']).optional(),
          job_title: z.string().optional().nullable(),
          password: z.string().optional()
        })
      )
    });

    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: { message: parsed.error.issues?.[0]?.message || 'Invalid payload' } });

    const inputUsers = parsed.data.users.map((u) => ({
      email: String(u.email).trim().toLowerCase(),
      name: String(u.name).trim(),
      role: u.role || 'user',
      job_title: u.job_title === undefined ? null : u.job_title,
      password: u.password ? String(u.password) : ''
    }));

    const errors = [];
    const uniqEmails = Array.from(new Set(inputUsers.map((u) => u.email).filter(Boolean)));
    const existed = uniqEmails.length ? await models.User.findAll({ where: { email: { [Op.in]: uniqEmails } } }) : [];
    const existedMap = new Map(existed.map((u) => [String(u.email).toLowerCase(), u]));

    let inserted = 0;
    let updated = 0;

    for (const u of inputUsers) {
      try {
        if (!u.email || !u.name) throw new Error('缺少 email 或 name');
        const existedUser = existedMap.get(u.email);
        if (existedUser) {
          const patch = { name: u.name, role: u.role, job_title: u.job_title };
          if (u.password) patch.password_hash = await bcrypt.hash(u.password, 10);
          await existedUser.update(patch);
          updated++;
        } else {
          if (!u.password) throw new Error('新用户必须提供 password');
          const password_hash = await bcrypt.hash(u.password, 10);
          const created = await models.User.create({ email: u.email, name: u.name, role: u.role, job_title: u.job_title, password_hash });
          existedMap.set(u.email, created);
          inserted++;
        }
      } catch (e) {
        errors.push({ row: u, message: String(e?.message || e) });
      }
    }

    return res.json({ inserted, updated, failed: errors.length, errors });
  });

  const { router: storageRouter, baseDir } = createStorageRouter();
  app.use('/api/storage', authMiddleware(), storageRouter);
  app.use('/storage', express.static(baseDir));

  app.use('/api/rest', authMiddleware(), createRestRouter(models));

  const autoAlter = String(process.env.DB_AUTO_ALTER || '') === '1';
  await sequelize.sync(autoAlter ? { alter: true } : undefined);

  const port = Number(process.env.PORT || 4000);
  const host = process.env.HOST || '127.0.0.1';
  app.listen(port, host, () => {
    const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${port}`;
    process.stdout.write(`server listening ${baseUrl}\n`);
    process.stdout.write(`storage dir ${path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads')}\n`);
  });
}

main().catch((e) => {
  process.stderr.write(String(e?.stack || e) + '\n');
  process.exit(1);
});
