import { Config } from "../config/Config.js";
import { GithubContext } from "./GithubContext.js";
import { getOctokit } from "@actions/github";
import { ReviewContext } from "../types/ReviewContext.js";
import { ChangedFile } from "../types/ChangedFile.js";
import { ReviewResponse } from "../types/ReviewResponseSchema.js";

export class GithubClient {
  private readonly context: GithubContext;
  private readonly octokit: ReturnType<typeof getOctokit>;

  constructor(config: Config, context: GithubContext) {
    this.context = context;
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
      }));
  }

  async publishReview(review: ReviewResponse) {
    const pullRequest = await this.getPullRequest();

    await this.octokit.rest.pulls.createReview({
      owner: this.context.owner,
      repo: this.context.repo,
      pull_number: this.context.pullRequestNumber,
      commit_id: pullRequest.head.sha,
      event: "COMMENT",
      body: review.summary,
      comments: review.comments.map(comment => ({
        path: comment.path,
        line: comment.line,
        side: "RIGHT",
        body: comment.comment,
      })),
    });
  }

  createComment() {
  }

  updateComment() {
  }

  findReviewComment() {
  }
}