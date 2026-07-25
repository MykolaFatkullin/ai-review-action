import { ReviewContext } from "../types/ReviewContext.js";
import { ChangedFile } from "../types/ChangedFile.js";
import { Prompt } from "../types/Prompt.js";

export class PromptBuilder {
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
      - For each comment, "line" MUST be a line number from the new version of the file.
      - For each comment, "line" MUST be one of the allowed RIGHT-side line numbers listed for that file.
      - Never use line numbers from the old version of the file.
      - Never use line numbers from the markdown diff block itself.
      - Never comment on removed lines.
      - Never comment on a line if you are not sure which allowed RIGHT-side line number it belongs to.
      - If you find an important issue but cannot confidently map it to an allowed RIGHT-side line number, describe it in the summary instead of adding it to comments.
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

      userPrompts.push("```diff");
      userPrompts.push(file.patch);
      userPrompts.push("```");
    }

    return {
      system: systemPrompts.join("\n\n"),
      user: userPrompts.join("\n\n"),
    };
  }
}