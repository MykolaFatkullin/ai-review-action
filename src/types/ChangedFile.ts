export interface ChangedFile {
  path: string;
  patch: string;
  rightLines: number[];
}