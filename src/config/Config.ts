import * as core from "@actions/core";

export class Config {
  readonly githubToken: string;
  readonly openAiApiKey: string;
  readonly model: string;
  readonly promptPath: string;

  private constructor(
    githubToken: string,
    openAiApiKey: string,
    model: string,
    promptPath: string,
  ) {
    this.githubToken = githubToken;
    this.openAiApiKey = openAiApiKey;
    this.model = model;
    this.promptPath = promptPath;
  }

  static load(): Config {
    return new Config(
      core.getInput("github-token", { required: true }),
      core.getInput("openai-api-key", { required: true }),
      core.getInput("model"),
      core.getInput("prompt-path"),
    );
  }
}