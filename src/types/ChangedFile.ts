import { RightSideLine } from "../utils/parseGithubPatch.js";

export interface ChangedFile {
  path: string;
  patch: string;
  rightLines: number[];
  rightSideLines: RightSideLine[];
}