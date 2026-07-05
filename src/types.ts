export type QcStatus = 'pending' | 'passed' | 'failed';

export interface SampleFile {
  id: string;
  sampleId: string;
  name: string;
  qcStatus: QcStatus;
}

export interface Sample {
  id: string;
  owner: string;
  fileIds: string[];
  accessList: string[];
}