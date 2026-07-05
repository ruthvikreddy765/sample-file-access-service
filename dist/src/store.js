"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = exports.Store = void 0;
class Store {
    constructor() {
        this.samples = new Map();
        this.files = new Map();
    }
    createSample(id, owner, fileNames) {
        const fileIds = [];
        for (const name of fileNames) {
            const fileId = `file-${id}-${name.replace(/\s+/g, '_')}`;
            const file = { id: fileId, sampleId: id, name, qcStatus: 'pending' };
            this.files.set(fileId, file);
            fileIds.push(fileId);
        }
        const sample = { id, owner, fileIds, accessList: [owner] };
        this.samples.set(id, sample);
        return sample;
    }
    getSample(id) {
        return this.samples.get(id);
    }
    grantAccess(sampleId, userId) {
        const sample = this.samples.get(sampleId);
        if (!sample)
            return false;
        if (!sample.accessList.includes(userId)) {
            sample.accessList.push(userId);
        }
        return true;
    }
    hasAccess(sampleId, userId) {
        const sample = this.samples.get(sampleId);
        return sample?.accessList.includes(userId) ?? false;
    }
    getFile(fileId) {
        return this.files.get(fileId);
    }
    updateQcStatus(fileId, status) {
        const file = this.files.get(fileId);
        if (!file)
            return undefined;
        if (file.qcStatus !== 'pending')
            return undefined;
        file.qcStatus = status;
        return file;
    }
    clear() {
        this.samples.clear();
        this.files.clear();
    }
}
exports.Store = Store;
exports.store = new Store();
