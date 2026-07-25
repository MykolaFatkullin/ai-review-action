import { GithubClient } from "../github/GithubClient.js";
import { PromptLoader } from "../prompt/PromptLoader.js";
import { PromptBuilder } from "../prompt/PromptBuilder.js";
import { OpenAIClient } from "../openai/OpenAIClient.js";

export class ReviewService {
  constructor(
    private readonly github: GithubClient,
    private readonly promptLoader: PromptLoader,
    private readonly promptBuilder: PromptBuilder,
    private readonly openAi: OpenAIClient,
  ) {}

  async review(): Promise<void> {
    const context = await this.github.getReviewContext();

    const files = await this.github.getChangedFiles();

    if (files.length === 0) {
      return;
    }

    const prompts = await this.promptLoader.load();

    const prompt = this.promptBuilder.build(
      context,
      files,
      prompts,
    );

    const review = await this.openAi.review(prompt);

    await this.github.publishReview(review);
  }
}