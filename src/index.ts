import { Config } from "./config/Config.js";
import { GithubContext } from "./github/GithubContext.js";
import { ReviewService } from "./review/ReviewService.js";
import { GithubClient } from "./github/GithubClient.js";
import { PromptLoader } from "./prompt/PromptLoader.js";
import { PromptBuilder } from "./prompt/PromptBuilder.js";
import { OpenAIClient } from "./openai/OpenAIClient.js";

const config = Config.load();
const githubContext = GithubContext.load();

const reviewService = new ReviewService(
  new GithubClient(config, githubContext),
  new PromptLoader(config.promptPath),
  new PromptBuilder(),
  new OpenAIClient(config),
);

await reviewService.review();