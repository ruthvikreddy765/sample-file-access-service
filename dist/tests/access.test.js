"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../src/app");
const store_1 = require("../src/store");
const app = (0, app_1.createApp)();
beforeEach(() => store_1.store.clear());
async function registerSample(owner, files = []) {
    const res = await (0, supertest_1.default)(app)
        .post('/samples')
        .send({ owner, files });
    expect(res.status).toBe(201);
    return res.body.sample;
}
async function grantAccess(sampleId, userId) {
    const res = await (0, supertest_1.default)(app)
        .post(`/samples/${sampleId}/access`)
        .send({ userId });
    expect(res.status).toBe(200);
}
async function setQc(fileId, status) {
    const res = await (0, supertest_1.default)(app)
        .patch(`/files/${fileId}/qc`)
        .send({ status });
    expect(res.status).toBe(200);
}
describe('POST /samples', () => {
    it('registers a sample with no files', async () => {
        const res = await (0, supertest_1.default)(app).post('/samples').send({ owner: 'alice' });
        expect(res.status).toBe(201);
        expect(res.body.sample.owner).toBe('alice');
        expect(res.body.sample.fileIds).toHaveLength(0);
    });
    it('registers a sample with files, all starting as pending', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/samples')
            .send({ owner: 'alice', files: [{ name: 'data.csv' }, { name: 'report.pdf' }] });
        expect(res.status).toBe(201);
        expect(res.body.sample.files).toHaveLength(2);
        for (const f of res.body.sample.files) {
            expect(f.qcStatus).toBe('pending');
        }
    });
    it('returns 400 when owner is missing', async () => {
        const res = await (0, supertest_1.default)(app).post('/samples').send({});
        expect(res.status).toBe(400);
    });
    it('owner automatically has access to the sample', async () => {
        const sample = await registerSample('alice', [{ name: 'f.csv' }]);
        const fileId = sample.files[0].id;
        await setQc(fileId, 'passed');
        const res = await (0, supertest_1.default)(app).get(`/files/${fileId}/download?userId=alice`);
        expect(res.status).toBe(200);
    });
});
describe('POST /samples/:sampleId/access', () => {
    it('grants a user access to a sample', async () => {
        const sample = await registerSample('alice', [{ name: 'data.csv' }]);
        const res = await (0, supertest_1.default)(app)
            .post(`/samples/${sample.id}/access`)
            .send({ userId: 'bob' });
        expect(res.status).toBe(200);
    });
    it('returns 404 for a non-existent sample', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/samples/does-not-exist/access')
            .send({ userId: 'bob' });
        expect(res.status).toBe(404);
    });
    it('returns 400 when userId is missing', async () => {
        const sample = await registerSample('alice');
        const res = await (0, supertest_1.default)(app)
            .post(`/samples/${sample.id}/access`)
            .send({});
        expect(res.status).toBe(400);
    });
});
describe('PATCH /files/:fileId/qc', () => {
    it('updates a file from pending to passed', async () => {
        const sample = await registerSample('alice', [{ name: 'data.csv' }]);
        const fileId = sample.files[0].id;
        const res = await (0, supertest_1.default)(app).patch(`/files/${fileId}/qc`).send({ status: 'passed' });
        expect(res.status).toBe(200);
        expect(res.body.file.qcStatus).toBe('passed');
    });
    it('updates a file from pending to failed', async () => {
        const sample = await registerSample('alice', [{ name: 'data.csv' }]);
        const fileId = sample.files[0].id;
        const res = await (0, supertest_1.default)(app).patch(`/files/${fileId}/qc`).send({ status: 'failed' });
        expect(res.status).toBe(200);
        expect(res.body.file.qcStatus).toBe('failed');
    });
    it('returns 409 when trying to update an already-terminal QC status', async () => {
        const sample = await registerSample('alice', [{ name: 'data.csv' }]);
        const fileId = sample.files[0].id;
        await setQc(fileId, 'passed');
        const res = await (0, supertest_1.default)(app).patch(`/files/${fileId}/qc`).send({ status: 'failed' });
        expect(res.status).toBe(409);
    });
    it('returns 400 for invalid status value', async () => {
        const sample = await registerSample('alice', [{ name: 'data.csv' }]);
        const fileId = sample.files[0].id;
        const res = await (0, supertest_1.default)(app).patch(`/files/${fileId}/qc`).send({ status: 'unknown' });
        expect(res.status).toBe(400);
    });
    it('returns 404 for a non-existent file', async () => {
        const res = await (0, supertest_1.default)(app).patch('/files/no-such-file/qc').send({ status: 'passed' });
        expect(res.status).toBe(404);
    });
});
describe('GET /files/:fileId/download', () => {
    it('returns a download URL when user has access and QC passed', async () => {
        const sample = await registerSample('alice', [{ name: 'data.csv' }]);
        const fileId = sample.files[0].id;
        await grantAccess(sample.id, 'bob');
        await setQc(fileId, 'passed');
        const res = await (0, supertest_1.default)(app).get(`/files/${fileId}/download?userId=bob`);
        expect(res.status).toBe(200);
        expect(res.body.url).toMatch(/^https:\/\/files\.example\.com\/download\//);
        expect(res.body.expiresAt).toBeDefined();
    });
    it('returns 403 when user has no access', async () => {
        const sample = await registerSample('alice', [{ name: 'data.csv' }]);
        const fileId = sample.files[0].id;
        await setQc(fileId, 'passed');
        const res = await (0, supertest_1.default)(app).get(`/files/${fileId}/download?userId=bob`);
        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/Access denied/);
    });
    it('returns 403 when QC is still pending', async () => {
        const sample = await registerSample('alice', [{ name: 'data.csv' }]);
        const fileId = sample.files[0].id;
        const res = await (0, supertest_1.default)(app).get(`/files/${fileId}/download?userId=alice`);
        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/pending/);
    });
    it('returns 403 when QC failed', async () => {
        const sample = await registerSample('alice', [{ name: 'data.csv' }]);
        const fileId = sample.files[0].id;
        await setQc(fileId, 'failed');
        const res = await (0, supertest_1.default)(app).get(`/files/${fileId}/download?userId=alice`);
        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/failed QC/);
    });
    it('returns 404 when file does not exist', async () => {
        const res = await (0, supertest_1.default)(app).get('/files/ghost-file/download?userId=alice');
        expect(res.status).toBe(404);
    });
    it('returns 400 when userId query param is missing', async () => {
        const sample = await registerSample('alice', [{ name: 'data.csv' }]);
        const fileId = sample.files[0].id;
        const res = await (0, supertest_1.default)(app).get(`/files/${fileId}/download`);
        expect(res.status).toBe(400);
    });
    it('denies access even if QC passed but user was never granted access', async () => {
        const sample = await registerSample('alice', [{ name: 'data.csv' }]);
        const fileId = sample.files[0].id;
        await setQc(fileId, 'passed');
        const res = await (0, supertest_1.default)(app).get(`/files/${fileId}/download?userId=carol`);
        expect(res.status).toBe(403);
    });
});
