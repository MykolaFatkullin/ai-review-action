import * as github from "@actions/github";

export class GithubContext {
  private constructor(readonly owner: string, readonly repo: string, readonly pullRequestNumber: number) {
  }

  static tryLoad(): GithubContext | null {
    switch (github.context.eventName) {
      case "pull_request":
      case "pull_request_target":
        return this.fromPullRequest();

      case "issue_comment":
        return this.fromIssueComment();

      default:
        throw new Error(`Unsupported event: ${github.context.eventName}`);
    }
  }

  private static fromPullRequest(): GithubContext {
    const pr = github.context.payload.pull_request;

    if (!pr) {
      throw new Error("Missing pull_request payload.");
    }

    return new GithubContext(
      github.context.repo.owner,
      github.context.repo.repo,
      pr.number,
    );
  }

  private static fromIssueComment(): GithubContext | null {
    const issue = github.context.payload.issue;

    if (!issue?.pull_request) {
      throw new Error("Comment is not on a pull request.");
    }

    const command = github.context.payload.comment?.body.trim();

    if (command !== "/ai-review") {
      return null;
    }

    return new GithubContext(
      github.context.repo.owner,
      github.context.repo.repo,
      issue.number,
    );
  }
}