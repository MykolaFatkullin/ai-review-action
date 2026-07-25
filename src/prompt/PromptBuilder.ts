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
      Return ONLY JSON in this format:
      {
        "summary": "...",
        "comments": [
          {
            "path": "...",
            "line": 123,
            "comment": "..."
          }
        ]
      }
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

