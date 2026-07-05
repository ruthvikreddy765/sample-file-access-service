"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const crypto_1 = require("crypto");
const store_1 = require("./store");
function createApp() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    // 1. Register a sample
    app.post('/samples', (req, res) => {
        const { owner, files } = req.body;
        if (!owner || typeof owner !== 'string') {
            return res.status(400).json({ error: '`owner` (string) is required' });
        }
        const fileNames = [];
        if (files) {
            if (!Array.isArray(files)) {
                return res.status(400).json({ error: '`files` must be an array' });
            }
            for (const f of files) {
                if (!f.name || typeof f.name !== 'string') {
                    return res.status(400).json({ error: 'Each file must have a `name` string' });
                }
                fileNames.push(f.name);
            }
        }
        const sampleId = (0, crypto_1.randomUUID)();
        const sample = store_1.store.createSample(sampleId, owner, fileNames);
        const fileDetails = sample.fileIds.map((id) => store_1.store.getFile(id));
        return res.status(201).json({ sample: { ...sample, files: fileDetails } });
    });
    // 2. Grant access
    app.post('/samples/:sampleId/access', (req, res) => {
        const sampleId = req.params.sampleId;
        const { userId } = req.body;
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ error: '`userId` (string) is required' });
        }
        const ok = store_1.store.grantAccess(sampleId, userId);
        if (!ok) {
            return res.status(404).json({ error: `Sample '${sampleId}' not found` });
        }
        return res.status(200).json({ message: `Access granted to '${userId}' for sample '${sampleId}'` });
    });
    // 3. QC callback
    app.patch('/files/:fileId/qc', (req, res) => {
        const fileId = req.params.fileId;
        const { status } = req.body;
        if (status !== 'passed' && status !== 'failed') {
            return res.status(400).json({ error: '`status` must be "passed" or "failed"' });
        }
        const file = store_1.store.getFile(fileId);
        if (!file) {
            return res.status(404).json({ error: `File '${fileId}' not found` });
        }
        const updated = store_1.store.updateQcStatus(fileId, status);
        if (!updated) {
            return res.status(409).json({
                error: `File QC status is already '${file.qcStatus}' and cannot be updated`,
            });
        }
        return res.status(200).json({ file: updated });
    });
    // 4. Download request
    app.get('/files/:fileId/download', (req, res) => {
        const fileId = req.params.fileId;
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: '`userId` query param is required' });
        }
        const file = store_1.store.getFile(fileId);
        if (!file) {
            return res.status(404).json({ error: `File '${fileId}' not found` });
        }
        if (!store_1.store.hasAccess(file.sampleId, userId)) {
            return res.status(403).json({ error: 'Access denied: user does not have permission for this sample' });
        }
        if (file.qcStatus === 'pending') {
            return res.status(403).json({ error: 'File QC is still pending' });
        }
        if (file.qcStatus === 'failed') {
            return res.status(403).json({ error: 'File failed QC and cannot be downloaded' });
        }
        const token = (0, crypto_1.randomUUID)();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        const url = `https://files.example.com/download/${fileId}?token=${token}&expires=${encodeURIComponent(expiresAt)}`;
        return res.status(200).json({ url, expiresAt });
    });
    // Global error handler
    app.use((err, _req, res, _next) => {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    });
    return app;
}
