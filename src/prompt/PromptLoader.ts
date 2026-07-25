import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

export class PromptLoader {
  constructor(private readonly promptPath: string) {}

  async load(): Promise<Map<string, string>> {
    let files: string[];

    try {
      files = await readdir(this.promptPath);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return new Map();
      }

      throw error;
    }

    const markdownFiles = files
      .filter(file => extname(file) === ".md")
      .sort();

    const prompts = new Map<string, string>();

    for (const file of markdownFiles) {
      const content = await readFile(join(this.promptPath, file), "utf-8");

      prompts.set(basename(file, ".md"), content);
    }

    return prompts;
  }
}