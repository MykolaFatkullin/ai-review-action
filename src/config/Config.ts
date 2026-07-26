import * as core from "@actions/core";

export class Config {
  readonly githubToken: string;
  readonly openAiApiKey: string;
  readonly model: string;
  readonly promptPath: string;
  readonly githubBotLogin: string;
  readonly excludeFiles: string[];

  private constructor(
    githubToken: string,
    openAiApiKey: string,
    model: string,
    promptPath: string,
    githubBotLogin: string,
    excludeFiles: string[],
  ) {
    this.githubToken = githubToken;
    this.openAiApiKey = openAiApiKey;
    this.model = model;
    this.promptPath = promptPath;
    this.githubBotLogin = githubBotLogin;
    this.excludeFiles = excludeFiles;
  }

  static load(): Config {
    const excludeFiles = core.getInput("exclude-files")
      .split(/[\n,]/)
      .map(pattern => pattern.trim())
      .filter(Boolean);

    return new Config(
      core.getInput("github-token", {required: true}),
      core.getInput("openai-api-key", {required: true}),
      core.getInput("model") || "gpt-5.5",
      core.getInput("prompt-path") || ".github/prompts",
      core.getInput("github-bot-login"),
      excludeFiles,
    );
  }
}
