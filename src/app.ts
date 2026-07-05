import express, { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { store } from './store';

export function createApp() {
  const app = express();
  app.use(express.json());

  // 1. Register a sample
  app.post('/samples', (req: Request, res: Response) => {
    const { owner, files } = req.body as { owner?: string; files?: { name: string }[] };

    if (!owner || typeof owner !== 'string') {
      return res.status(400).json({ error: '`owner` (string) is required' });
    }

    const fileNames: string[] = [];
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

    const sampleId = randomUUID();
    const sample = store.createSample(sampleId, owner, fileNames);
    const fileDetails = sample.fileIds.map((id: string) => store.getFile(id));

    return res.status(201).json({ sample: { ...sample, files: fileDetails } });
  });

  // 2. Grant access
  app.post('/samples/:sampleId/access', (req: Request, res: Response) => {
    const sampleId = req.params.sampleId as string;
    const { userId } = req.body as { userId?: string };

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: '`userId` (string) is required' });
    }

    const ok = store.grantAccess(sampleId, userId);
    if (!ok) {
      return res.status(404).json({ error: `Sample '${sampleId}' not found` });
    }

    return res.status(200).json({ message: `Access granted to '${userId}' for sample '${sampleId}'` });
  });

  // 3. QC callback
  app.patch('/files/:fileId/qc', (req: Request, res: Response) => {
    const fileId = req.params.fileId as string;
    const { status } = req.body as { status?: string };

    if (status !== 'passed' && status !== 'failed') {
      return res.status(400).json({ error: '`status` must be "passed" or "failed"' });
    }

    const file = store.getFile(fileId);
    if (!file) {
      return res.status(404).json({ error: `File '${fileId}' not found` });
    }

    const updated = store.updateQcStatus(fileId, status);
    if (!updated) {
      return res.status(409).json({
        error: `File QC status is already '${file.qcStatus}' and cannot be updated`,
      });
    }

    return res.status(200).json({ file: updated });
  });

  // 4. Download request
  app.get('/files/:fileId/download', (req: Request, res: Response) => {
    const fileId = req.params.fileId as string;
    const userId = req.query.userId as string | undefined;

    if (!userId) {
      return res.status(400).json({ error: '`userId` query param is required' });
    }

    const file = store.getFile(fileId);
    if (!file) {
      return res.status(404).json({ error: `File '${fileId}' not found` });
    }

    if (!store.hasAccess(file.sampleId, userId)) {
      return res.status(403).json({ error: 'Access denied: user does not have permission for this sample' });
    }

    if (file.qcStatus === 'pending') {
      return res.status(403).json({ error: 'File QC is still pending' });
    }
    if (file.qcStatus === 'failed') {
      return res.status(403).json({ error: 'File failed QC and cannot be downloaded' });
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const url = `https://files.example.com/download/${fileId}?token=${token}&expires=${encodeURIComponent(expiresAt)}`;

    return res.status(200).json({ url, expiresAt });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}