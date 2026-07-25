import { GithubClient } from "../github/GithubClient.js";
import { PromptLoader } from "../prompt/PromptLoader.js";
import { PromptBuilder } from "../prompt/PromptBuilder.js";
import { OpenAIClient } from "../openai/OpenAIClient.js";
import * as core from "@actions/core";

export class ReviewService {
  constructor(
    private readonly github: GithubClient,
    private readonly promptLoader: PromptLoader,
    private readonly promptBuilder: PromptBuilder,
    private readonly openAi: OpenAIClient,
  ) {}

  async review(): Promise<void> {
    if (!await this.github.isReviewRequired()) {
      core.info("Skipping AI review: no new commits since the last review.");
      return;
    }

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

    const allowedLinesByPath = new Map(
      files.map(file => [file.path, new Set(file.rightLines)]),
    );

    const validComments = [];
    const unplaceableComments = [];

    for (const comment of review.comments) {
      const allowedLines = allowedLinesByPath.get(comment.path);

      if (!allowedLines) {
        core.warning(`Could not place AI review comment for unknown file: ${comment.path}`);
        unplaceableComments.push(comment);
        continue;
      }

      if (!allowedLines.has(comment.line)) {
        core.warning(
          `Could not place AI review comment for ${comment.path}:${comment.line} because the line is not present on the RIGHT side of the diff.`,
        );
        unplaceableComments.push(comment);
        continue;
      }

      validComments.push(comment);
    }

    review.comments = validComments;

    if (unplaceableComments.length > 0) {
      const unplaceableSummary = [
        "",
        "## Additional AI review comments",
        "",
        "The following comments could not be placed inline because their line numbers are not present on the RIGHT side of the pull request diff:",
        "",
        ...unplaceableComments.map(comment => (
          `- \`${comment.path}:${comment.line}\` — ${comment.comment}`
        )),
      ].join("\n");

      review.summary = `${review.summary}\n${unplaceableSummary}`;
    }

    if (review.comments.length === 0 && review.decision === "REQUEST_CHANGES") {
      review.decision = "COMMENT";
    }

    await this.github.publishReview(review);
  }
}