/**
 * ElizaOS Memory-based TaskStore implementation for A2A SDK
 * Stores tasks in agent memory instead of external database
 */

import { TaskStore } from '@a2a-js/sdk/server';
import { Task } from '@a2a-js/sdk';
import type { IAgentRuntime, UUID } from '@elizaos/core';

export class ElizaTaskStore implements TaskStore {
  private runtime: IAgentRuntime;
  private roomId: UUID;

  constructor(runtime: IAgentRuntime, roomId: UUID) {
    this.runtime = runtime;
    this.roomId = roomId;
  }

  /**
   * Save a task to ElizaOS memory
   */
  async save(task: Task): Promise<void> {
    try {
      // Store task in agent memory
      await this.runtime.addMemory({
        content: {
          text: `A2A Task: ${task.id}`,
          taskData: JSON.stringify(task),
          taskId: task.id,
          // Store status as JSON string to preserve structure
          taskStatus: typeof task.status === 'string'
            ? task.status
            : JSON.stringify(task.status),
        },
        type: 'a2a_task',
        roomId: this.roomId,
        unique: true,
      });

      console.log(`✅ Task saved to memory: ${task.id} (status: ${JSON.stringify(task.status)})`);
    } catch (error) {
      console.error('❌ Failed to save task:', error);
      throw error;
    }
  }

  /**
   * Load a task from ElizaOS memory
   */
  async load(taskId: string): Promise<Task | undefined> {
    try {
      // Search for task in memory with increased limit
      // Note: For production, consider implementing pagination or indexed search
      const memories = await this.runtime.getMemories({
        roomId: this.roomId,
        count: 1000, // Increased from 100 to support more tasks
        unique: true,
      });

      // Find task by ID
      const taskMemory = memories.find((memory) => {
        const content = memory.content as {
          taskId?: string;
          taskData?: string;
        };
        return content.taskId === taskId && memory.type === 'a2a_task';
      });

      if (!taskMemory) {
        console.log(`⚠️ Task ${taskId} not found in memory`);
        return undefined;
      }

      // Parse and return task
      const content = taskMemory.content as { taskData: string };
      const task = JSON.parse(content.taskData) as Task;
      return task;
    } catch (error) {
      console.error(`❌ Failed to load task ${taskId}:`, error);
      return undefined;
    }
  }
}
