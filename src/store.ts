import { Sample, SampleFile, QcStatus } from './types';

export class Store {
  private samples = new Map<string, Sample>();
  private files = new Map<string, SampleFile>();

  createSample(id: string, owner: string, fileNames: string[]): Sample {
    const fileIds: string[] = [];

    for (const name of fileNames) {
      const fileId = `file-${id}-${name.replace(/\s+/g, '_')}`;
      const file: SampleFile = { id: fileId, sampleId: id, name, qcStatus: 'pending' };
      this.files.set(fileId, file);
      fileIds.push(fileId);
    }

    const sample: Sample = { id, owner, fileIds, accessList: [owner] };
    this.samples.set(id, sample);
    return sample;
  }

  getSample(id: string): Sample | undefined {
    return this.samples.get(id);
  }

  grantAccess(sampleId: string, userId: string): boolean {
    const sample = this.samples.get(sampleId);
    if (!sample) return false;
    if (!sample.accessList.includes(userId)) {
      sample.accessList.push(userId);
    }
    return true;
  }

  hasAccess(sampleId: string, userId: string): boolean {
    const sample = this.samples.get(sampleId);
    return sample?.accessList.includes(userId) ?? false;
  }

  getFile(fileId: string): SampleFile | undefined {
    return this.files.get(fileId);
  }

  updateQcStatus(fileId: string, status: QcStatus): SampleFile | undefined {
    const file = this.files.get(fileId);
    if (!file) return undefined;
    if (file.qcStatus !== 'pending') return undefined;
    file.qcStatus = status;
    return file;
  }

  clear(): void {
    this.samples.clear();
    this.files.clear();
  }
}

export const store = new Store();