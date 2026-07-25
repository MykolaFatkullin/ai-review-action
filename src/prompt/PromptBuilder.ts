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
    `);

    userPrompts.push("# Pull Request");
    userPrompts.push(`Title: ${context.title}`);

    if (context.description) {
      userPrompts.push(context.description);
    }

    userPrompts.push("# Changed files");

    for (const file of files) {
      userPrompts.push(`## ${file.path}`);

      userPrompts.push("```diff");
      userPrompts.push(file.patch);
      userPrompts.push("```");
    }

    return {
      system: systemPrompts.join("\n\n"),
      user: userPrompts.join("\n\n"),
    }
  }
}

