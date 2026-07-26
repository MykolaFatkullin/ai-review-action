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

      case "workflow_run":
        return this.fromWorkflowRun();

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

  private static fromWorkflowRun(): GithubContext {
    const workflowRun = github.context.payload.workflow_run;

    if (!workflowRun) {
      throw new Error("Missing workflow_run payload.");
    }

    if (!workflowRun.pull_requests?.length) {
      throw new Error("Workflow run is not associated with a pull request.");
    }

    const pr = workflowRun.pull_requests[0];

    return new GithubContext(
      github.context.repo.owner,
      github.context.repo.repo,
      pr.number,
    );
  }
}