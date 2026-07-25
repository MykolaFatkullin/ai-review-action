import { Config } from "../config/Config.js";
import { GithubContext } from "./GithubContext.js";
import { getOctokit } from "@actions/github";
import { ReviewContext } from "../types/ReviewContext.js";
import { ChangedFile } from "../types/ChangedFile.js";
import { ReviewResponse } from "../types/ReviewResponseSchema.js";
import {
  extractRightSideLineDetailsFromPatch,
  extractRightSideLinesFromPatch
} from "../utils/parseGithubPatch.js";

export class GithubClient {
  private readonly context: GithubContext;
  private readonly octokit: ReturnType<typeof getOctokit>;
  private readonly config: Config;

  constructor(config: Config, context: GithubContext) {
    this.context = context;
    this.config = config;
    this.octokit = getOctokit(config.githubToken);
  }

  async getPullRequest() {
    const response = await this.octokit.rest.pulls.get({
      owner: this.context.owner,
      repo: this.context.repo,
      pull_number: this.context.pullRequestNumber,
    });

    return response.data;
  }

  async getPullRequestReviews() {
    return await this.octokit.rest.pulls.listReviews({
      owner: this.context.owner,
      repo: this.context.repo,
      pull_number: this.context.pullRequestNumber,
    });
  }

  async isReviewRequired(): Promise<boolean> {
    const pullRequest = await this.getPullRequest();
    const reviews = await this.getPullRequestReviews();

    const lastBotReview = reviews.data
      .filter(review => review.user?.login === this.config.githubBotLogin)
      .at(-1);

    if (!lastBotReview) {
      return true;
    }

    return lastBotReview.commit_id !== pullRequest.head.sha;
  }

  async getReviewContext(): Promise<ReviewContext> {
    const pr = await this.getPullRequest();

    return {
      title: pr.title ?? "",
      description: pr.body ?? "",
    };
  }

  async getChangedFiles(): Promise<ChangedFile[]> {
    const response = await this.octokit.rest.pulls.listFiles({
      owner: this.context.owner,
      repo: this.context.repo,
      pull_number: this.context.pullRequestNumber,
    });

    return response.data
      .filter(file => file.status !== "removed" && file.patch)
      .map(file => ({
        path: file.filename,
        patch: file.patch!,
        rightLines: extractRightSideLinesFromPatch(file.patch!),
        rightSideLines: extractRightSideLineDetailsFromPatch(file.patch!),
      }));
  }

  async publishReview(review: ReviewResponse) {
    const pullRequest = await this.getPullRequest();

    await this.octokit.rest.pulls.createReview({
      owner: this.context.owner,
      repo: this.context.repo,
      pull_number: this.context.pullRequestNumber,
      commit_id: pullRequest.head.sha,
      event: review.decision,
      body: review.summary,
      comments: review.comments.map(comment => ({
        path: comment.path,
        line: comment.line,
        side: "RIGHT",
        body: comment.comment,
      })),
    });
  }
}