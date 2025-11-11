/**
 * ElizaOS Runtime-based AgentExecutor for A2A SDK
 * Uses OpenAI API directly for simplicity
 */

import { AgentExecutor, RequestContext, ExecutionEventBus } from '@a2a-js/sdk/server';
import { Message } from '@a2a-js/sdk';
import type { IAgentRuntime, UUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

export class ElizaAgentExecutor implements AgentExecutor {
  private runtime: IAgentRuntime;
  private roomId: UUID;

  constructor(runtime: IAgentRuntime, roomId: UUID) {
    this.runtime = runtime;
    this.roomId = roomId;
  }

  /**
   * Execute agent logic using ElizaOS runtime
   */
  async execute(ctx: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
    try {
      console.log(`🤖 ElizaAgent executing for task: ${ctx.taskId}`);

      // Extract user message
      const textPart = ctx.userMessage.parts.find((p) => p.kind === 'text') as
        | { kind: 'text'; text: string }
        | undefined;
      const userMessage = textPart?.text || '';

      // Get API key from runtime settings
      const apiKey = this.runtime.getSetting('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;

      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not found in runtime settings or environment');
      }

      const openai = new OpenAI({
        apiKey: apiKey,
      });

      const systemPrompt = this.runtime.character.system || 'You are a helpful AI assistant.';
      const model = this.runtime.character.settings?.model || 'gpt-4o-mini';

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 1000,
      });

      const responseContent = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';

      // Send response back through A2A
      const responseMessage: Message = {
        kind: 'message',
        messageId: uuidv4(),
        role: 'agent',
        parts: [
          {
            kind: 'text',
            text: responseContent || 'Message processed',
          },
        ],
      };

      eventBus.publish(responseMessage);
      eventBus.finished();
    } catch (error: any) {
      console.error('❌ Execution error:', error);

      // Publish error message
      const errorMessage: Message = {
        kind: 'message',
        messageId: uuidv4(),
        role: 'agent',
        parts: [
          {
            kind: 'text',
            text: `Error: ${error.message}`,
          },
        ],
      };
      eventBus.publish(errorMessage);
      eventBus.finished();
    }
  }

  /**
   * Cancel a running task
   */
  async cancelTask(taskId: string, eventBus: ExecutionEventBus): Promise<void> {
    console.log(`🚫 Cancelling task: ${taskId}`);

    const response: Message = {
      kind: 'message',
      messageId: uuidv4(),
      role: 'agent',
      parts: [
        {
          kind: 'text',
          text: `Task ${taskId} has been cancelled.`,
        },
      ],
    };
    eventBus.publish(response);
    eventBus.finished();
  }
}
