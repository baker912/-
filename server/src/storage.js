const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const multer = require('multer');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function normalizeRelative(p) {
  const normalized = p.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) return null;
  return normalized;
}

function createStorageRouter() {
  const router = express.Router();
  const baseDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
  ensureDir(baseDir);

  const upload = multer({ storage: multer.memoryStorage() });

  router.post('/:bucket/upload', upload.single('file'), (req, res) => {
    const bucket = normalizeRelative(req.params.bucket);
    const relPath = normalizeRelative(req.body.path);
    if (!bucket || !relPath) return res.status(400).json({ error: { message: 'Invalid path' } });
    if (!req.file) return res.status(400).json({ error: { message: 'Missing file' } });

    const outPath = path.join(baseDir, bucket, relPath);
    ensureDir(path.dirname(outPath));
    fs.writeFileSync(outPath, req.file.buffer);

    return res.json({ path: relPath });
  });

  router.get('/:bucket/public-url', (req, res) => {
    const bucket = normalizeRelative(req.params.bucket);
    const relPath = normalizeRelative(req.query.path || '');
    if (!bucket || !relPath) return res.status(400).json({ error: { message: 'Invalid path' } });
    const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
    const publicUrl = `${base}/storage/${bucket}/${encodeURIComponent(relPath).replace(/%2F/g, '/')}`;
    return res.json({ publicUrl });
  });

  return { router, baseDir };
}

module.exports = { createStorageRouter, normalizeRelative };
