
import { createRequire } from 'module';
const require = createRequire(import.meta.url);


// src/config/Config.ts
import * as core from "@actions/core";
var Config = class _Config {
  githubToken;
  openAiApiKey;
  model;
  promptPath;
  constructor(githubToken, openAiApiKey, model, promptPath) {
    this.githubToken = githubToken;
    this.openAiApiKey = openAiApiKey;
    this.model = model;
    this.promptPath = promptPath;
  }
  static load() {
    return new _Config(
      core.getInput("github-token", { required: true }),
      core.getInput("openai-api-key", { required: true }),
      core.getInput("model"),
      core.getInput("prompt-path")
    );
  }
};

// src/github/GithubContext.ts
import * as github from "@actions/github";
var GithubContext = class _GithubContext {
  constructor(owner, repo, pullRequestNumber) {
    this.owner = owner;
    this.repo = repo;
    this.pullRequestNumber = pullRequestNumber;
  }
  owner;
  repo;
  pullRequestNumber;
  static SUPPORTED_EVENTS = /* @__PURE__ */ new Set([
    "pull_request",
    "pull_request_target"
  ]);
  static load() {
    const pullRequest = github.context.payload.pull_request;
    if (!_GithubContext.SUPPORTED_EVENTS.has(github.context.eventName) || !pullRequest) {
      throw new Error("This action supports only pull_request and pull_request_target events.");
    }
    return new _GithubContext(
      github.context.repo.owner,
      github.context.repo.repo,
      pullRequest.number
    );
  }
};

// src/review/ReviewService.ts
var ReviewService = class {
  constructor(github2, promptLoader, promptBuilder, openAi) {
    this.github = github2;
    this.promptLoader = promptLoader;
    this.promptBuilder = promptBuilder;
    this.openAi = openAi;
  }
  github;
  promptLoader;
  promptBuilder;
  openAi;
  async review() {
    const context2 = await this.github.getReviewContext();
    const files = await this.github.getChangedFiles();
    if (files.length === 0) {
      return;
    }
    const prompts = await this.promptLoader.load();
    const prompt = this.promptBuilder.build(
      context2,
      files,
      prompts
    );
    const review = await this.openAi.review(prompt);
    await this.github.publishReview(review);
  }
};

// src/github/GithubClient.ts
import { getOctokit } from "@actions/github";
var GithubClient = class {
  context;
  octokit;
  constructor(config2, context2) {
    this.context = context2;
    this.octokit = getOctokit(config2.githubToken);
  }
  async getPullRequest() {
    const response = await this.octokit.rest.pulls.get({
      owner: this.context.owner,
      repo: this.context.repo,
      pull_number: this.context.pullRequestNumber
    });
    return response.data;
  }
  async getReviewContext() {
    const pr = await this.getPullRequest();
    return {
      title: pr.title ?? "",
      description: pr.body ?? ""
    };
  }
  async getChangedFiles() {
    const response = await this.octokit.rest.pulls.listFiles({
      owner: this.context.owner,
      repo: this.context.repo,
      pull_number: this.context.pullRequestNumber
    });
    return response.data.filter((file) => file.status !== "removed" && file.patch).map((file) => ({
      path: file.filename,
      patch: file.patch
    }));
  }
  async publishReview(review) {
    const pullRequest = await this.getPullRequest();
    await this.octokit.rest.pulls.createReview({
      owner: this.context.owner,
      repo: this.context.repo,
      pull_number: this.context.pullRequestNumber,
      commit_id: pullRequest.head.sha,
      event: "COMMENT",
      body: review.summary,
      comments: review.comments.map((comment) => ({
        path: comment.path,
        line: comment.line,
        side: "RIGHT",
        body: comment.comment
      }))
    });
  }
  createComment() {
  }
  updateComment() {
  }
  findReviewComment() {
  }
};

// src/prompt/PromptLoader.ts
import { readdir, readFile } from "fs/promises";
import { basename, extname, join } from "path";
var PromptLoader = class {
  constructor(promptPath) {
    this.promptPath = promptPath;
  }
  promptPath;
  async load() {
    let files;
    try {
      files = await readdir(this.promptPath);
    } catch (error) {
      if (error.code === "ENOENT") {
        return /* @__PURE__ */ new Map();
      }
      throw error;
    }
    const markdownFiles = files.filter((file) => extname(file) === ".md").sort();
    const prompts = /* @__PURE__ */ new Map();
    for (const file of markdownFiles) {
      const content = await readFile(join(this.promptPath, file), "utf-8");
      prompts.set(basename(file, ".md"), content);
    }
    return prompts;
  }
};

// src/prompt/PromptBuilder.ts
var PromptBuilder = class {
  build(context2, files, prompts) {
    const systemPrompts = [];
    const userPrompts = [];
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
    userPrompts.push(`Title: ${context2.title}`);
    if (context2.description) {
      userPrompts.push(context2.description);
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
      user: userPrompts.join("\n\n")
    };
  }
};

// src/openai/OpenAIClient.ts
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

// src/types/ReviewResponseSchema.ts
import { z } from "zod";
var reviewCommentSchema = z.object({
  path: z.string().min(1),
  line: z.number().int().positive(),
  comment: z.string().min(1)
});
var reviewResponseSchema = z.object({
  summary: z.string(),
  comments: z.array(reviewCommentSchema)
});

// src/openai/OpenAIClient.ts
var OpenAIClient = class {
  client;
  model;
  constructor(config2) {
    this.client = new OpenAI({
      apiKey: config2.openAiApiKey
    });
    this.model = config2.model;
  }
  async review(prompt) {
    const input = [];
    if (prompt.system) {
      input.push({
        role: "system",
        content: prompt.system
      });
    }
    input.push({
      role: "user",
      content: prompt.user
    });
    const response = await this.client.responses.parse({
      model: this.model,
      input,
      text: {
        format: zodTextFormat(reviewResponseSchema, "review_response")
      }
    });
    if (!response.output_parsed) {
      throw new Error("OpenAI returned an empty response.");
    }
    return response.output_parsed;
  }
};

// src/index.ts
var config = Config.load();
var githubContext = GithubContext.load();
var reviewService = new ReviewService(
  new GithubClient(config, githubContext),
  new PromptLoader(config.promptPath),
  new PromptBuilder(),
  new OpenAIClient(config)
);
await reviewService.review();
//# sourceMappingURL=index.js.map