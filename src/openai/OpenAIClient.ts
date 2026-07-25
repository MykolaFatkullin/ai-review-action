import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { Config } from "../config/Config.js";
import { Prompt } from "../types/Prompt.js";
import {
  ReviewResponse,
  reviewResponseSchema
} from "../types/ReviewResponseSchema.js";
import { ResponseInput } from "openai/resources/responses/responses";

export class OpenAIClient {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: Config) {
    this.client = new OpenAI({
      apiKey: config.openAiApiKey,
    });

    this.model = config.model;
  }

  async review(prompt: Prompt): Promise<ReviewResponse> {
    const input: ResponseInput = []

    if (prompt.system) {
      input.push({
        role: "system",
        content: prompt.system,
      });
    }

    input.push({
      role: "user",
      content: prompt.user,
    });

    const response = await this.client.responses.parse({
      model: this.model,
      input: input,
      text: {
        format: zodTextFormat(reviewResponseSchema, "review_response"),
      },
    });

    if (!response.output_parsed) {
      throw new Error("OpenAI returned an empty response.");
    }

    return response.output_parsed;
  }
}