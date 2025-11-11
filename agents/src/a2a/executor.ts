/**
 * ElizaOS Runtime-based AgentExecutor for A2A SDK
 * Uses ElizaOS runtime to process A2A requests
 */

import { AgentExecutor, RequestContext, ExecutionEventBus } from '@a2a-js/sdk/server';
import { Message } from '@a2a-js/sdk';
import type { IAgentRuntime, UUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

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

      // Process message through ElizaOS runtime
      const response = await this.runtime.processActions({
        entityId: this.runtime.agentId,
        roomId: this.roomId,
        message: {
          entityId: uuidv4() as UUID, // User entity ID
          content: { text: userMessage },
        },
      });

      // Send response back through A2A
      const responseMessage: Message = {
        kind: 'message',
        messageId: uuidv4(),
        role: 'agent',
        parts: [
          {
            kind: 'text',
            text: response || 'Message processed',
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
