import * as github from "@actions/github";

export class GithubContext {
  private static readonly SUPPORTED_EVENTS = new Set([
    "pull_request",
    "pull_request_target",
  ]);


  private constructor(readonly owner: string, readonly repo: string, readonly pullRequestNumber: number) {
  }

  static load(): GithubContext {
    const pullRequest = github.context.payload.pull_request;

    if (!GithubContext.SUPPORTED_EVENTS.has(github.context.eventName) || !pullRequest) {
      throw new Error("This action supports only pull_request and pull_request_target events.");
    }

    return new GithubContext(
      github.context.repo.owner,
      github.context.repo.repo,
      pullRequest.number,
    );
  }
}