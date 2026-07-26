import { ReviewContext } from "../types/ReviewContext.js";
import { ChangedFile } from "../types/ChangedFile.js";
import { Prompt } from "../types/Prompt.js";

export class PromptBuilder {
  filterFiles(files: ChangedFile[], excludedPatterns: string[]): ChangedFile[] {
    if (excludedPatterns.length === 0) {
      return files;
    }

    return files.filter(file => (
      !excludedPatterns.some(pattern => this.matchesPattern(file.path, pattern))
    ));
  }

  build(
    context: ReviewContext,
    files: ChangedFile[],
    prompts: Map<string, string>,
  ): Prompt {
    const systemPrompts: string[] = [];
    const userPrompts: string[] = [];

    if (prompts.size > 0) {
      systemPrompts.push("# Instructions");

      for (const [name, prompt] of prompts) {
        systemPrompts.push(`## ${name}`);
        systemPrompts.push(prompt.trim());
      }
    }

    systemPrompts.push(`
      Return ONLY valid JSON.
      
      {
        "decision": "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
        "summary": "...",
        "comments": [
          {
            "path": "...",
            "line": 123,
            "comment": "..."
          }
        ]
      }
      
      Rules:
      - Return ONLY JSON.
      - Do not wrap JSON in markdown.
      - Do not add explanations before or after JSON.
      - If there are no review comments, return an empty comments array.
      - Use APPROVE only when no issues requiring changes were found.
      - Use REQUEST_CHANGES when the pull request contains issues that should be fixed before merging.
      - Use COMMENT when only optional improvements or suggestions are found.
      - For each comment, "path" MUST exactly match one of the changed file paths.
      - For each comment, "line" MUST be a line number from the RIGHT-side line-numbered view of that file.
      - Prefer commenting on added lines marked with "+" in the RIGHT-side line-numbered view.
      - If an issue is located on an added RIGHT-side line, you SHOULD add it to comments using that exact line number.
      - Never use line numbers from the old version of the file.
      - Never use line numbers from the markdown diff block itself.
      - Never comment on removed lines.
      - Only put an issue in the summary without an inline comment when it cannot be mapped to any RIGHT-side line from the provided line-numbered view.
    `);

    userPrompts.push("# Pull Request");
    userPrompts.push(`Title: ${context.title}`);

    if (context.description) {
      userPrompts.push(context.description);
    }

    userPrompts.push("# Changed files");

    for (const file of files) {
      userPrompts.push(`## ${file.path}`);

      userPrompts.push("Allowed RIGHT-side line numbers for review comments:");
      userPrompts.push(file.rightLines.length > 0 ? file.rightLines.join(", ") : "none");

      userPrompts.push("RIGHT-side line-numbered view:");
      userPrompts.push("```text");
      userPrompts.push(
        file.rightSideLines
          .map(line => `${line.line}${line.isAdded ? " +" : "  "}: ${line.content}`)
          .join("\n"),
      );
      userPrompts.push("```");

      userPrompts.push("Original diff:");
      userPrompts.push("```diff");
      userPrompts.push(file.patch);
      userPrompts.push("```");
    }

    return {
      system: systemPrompts.join("\n\n"),
      user: userPrompts.join("\n\n"),
    };
  }

  private matchesPattern(path: string, pattern: string): boolean {
    const normalizedPath = path.replaceAll("\\", "/");
    const normalizedPattern = pattern.replaceAll("\\", "/");

    return this.patternToRegExp(normalizedPattern).test(normalizedPath)
      || (!normalizedPattern.includes("/") && this.patternToRegExp(normalizedPattern).test(normalizedPath.split("/").at(-1) ?? ""));
  }

  private patternToRegExp(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replaceAll("**", "\u0000")
      .replaceAll("*", "[^/]*")
      .replaceAll("?", "[^/]")
      .replaceAll("\u0000", ".*");

    return new RegExp(`^${escaped}$`);
  }
}
