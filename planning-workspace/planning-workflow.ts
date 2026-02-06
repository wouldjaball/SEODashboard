#!/usr/bin/env tsx

/**
 * Planning-with-Files Workflow Management
 * Inspired by Manus AI context engineering approach
 * 
 * Core concept: Use filesystem as "disk memory" for persistent AI planning
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface PlanningSession {
  sessionId: string;
  timestamp: string;
  claudeVersion: string;
  workingDirectory: string;
  objectives: string[];
  currentPhase: string;
}

interface TaskPlan {
  project: string;
  objective: string;
  phases: Phase[];
  currentStatus: {
    activePhase: string;
    nextAction: string;
    blockers: string[];
    lastUpdated: string;
  };
  successCriteria: string[];
}

interface Phase {
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  tasks: Task[];
}

interface Task {
  description: string;
  completed: boolean;
}

class PlanningWorkflow {
  private workspacePath: string;
  private taskPlanPath: string;
  private findingsPath: string;
  private progressPath: string;

  constructor(workspacePath = './planning-workspace') {
    this.workspacePath = workspacePath;
    this.taskPlanPath = join(workspacePath, 'task_plan.md');
    this.findingsPath = join(workspacePath, 'findings.md');
    this.progressPath = join(workspacePath, 'progress.md');
  }

  /**
   * Initialize a new planning session
   */
  startPlanningSession(projectName: string, objective: string): void {
    console.log(`🚀 Starting planning session for: ${projectName}`);
    
    if (!existsSync(this.workspacePath)) {
      throw new Error(`Planning workspace not found: ${this.workspacePath}`);
    }

    // Read current task plan to understand context
    const currentPlan = this.readTaskPlan();
    console.log(`📋 Current phase: ${currentPlan.currentStatus.activePhase}`);
    console.log(`🎯 Next action: ${currentPlan.currentStatus.nextAction}`);

    // Log session start
    this.logSessionStart();
  }

  /**
   * Read and parse the current task plan
   */
  readTaskPlan(): any {
    if (!existsSync(this.taskPlanPath)) {
      throw new Error('Task plan not found. Initialize planning workspace first.');
    }

    const content = readFileSync(this.taskPlanPath, 'utf-8');
    
    // Extract key information from markdown
    const lines = content.split('\\n');
    const currentStatus = {
      activePhase: this.extractValue(content, 'Active Phase'),
      nextAction: this.extractValue(content, 'Next Action'),
      blockers: this.extractValue(content, 'Blockers'),
      lastUpdated: this.extractValue(content, 'Last Updated')
    };

    return {
      content,
      currentStatus,
      raw: content
    };
  }

  /**
   * Update task plan with new progress
   */
  updateTaskPlan(phase: string, nextAction: string, blockers: string[] = []): void {
    const content = readFileSync(this.taskPlanPath, 'utf-8');
    let updated = content;

    // Update status section
    updated = updated.replace(
      /- \*\*Active Phase\*\*:.*$/m,
      `- **Active Phase**: ${phase}`
    );
    updated = updated.replace(
      /- \*\*Next Action\*\*:.*$/m,
      `- **Next Action**: ${nextAction}`
    );
    updated = updated.replace(
      /- \*\*Blockers\*\*:.*$/m,
      `- **Blockers**: ${blockers.length > 0 ? blockers.join(', ') : 'None currently'}`
    );
    updated = updated.replace(
      /- \*\*Last Updated\*\*:.*$/m,
      `- **Last Updated**: ${new Date().toISOString()}`
    );

    writeFileSync(this.taskPlanPath, updated);
    console.log('✅ Task plan updated');
  }

  /**
   * Add finding to research log
   */
  addFinding(title: string, description: string, category = 'Technical Discovery'): void {
    const content = readFileSync(this.findingsPath, 'utf-8');
    const timestamp = new Date().toISOString();
    
    const newFinding = `
#### ${title}
**Category**: ${category}  
**Date**: ${timestamp}  
${description}

`;

    // Insert before the references section
    const updated = content.replace(
      /### 🔗 References/,
      `${newFinding}### 🔗 References`
    );

    writeFileSync(this.findingsPath, updated);
    console.log(`📝 Finding added: ${title}`);
  }

  /**
   * Log session progress
   */
  logSessionProgress(actions: string[], discoveries: string[] = [], errors: string[] = []): void {
    const content = readFileSync(this.progressPath, 'utf-8');
    const timestamp = new Date().toISOString();

    // Find the current session section and update it
    let updated = content;

    // Update actions taken
    if (actions.length > 0) {
      actions.forEach((action, index) => {
        const actionLine = `${actions.length + index + 1}. ✅ ${action}`;
        // Add to actions taken section
        updated = updated.replace(
          /(\*\*Actions Taken\*\*:[\s\S]*?)(\n\n|\n---)/,
          `$1\n${actionLine}$2`
        );
      });
    }

    // Update discoveries
    if (discoveries.length > 0) {
      discoveries.forEach(discovery => {
        const discoveryLine = `- ${discovery}`;
        updated = updated.replace(
          /(\*\*Key Discoveries\*\*:[\s\S]*?)(\n\n|\n\*\*)/,
          `$1\n${discoveryLine}$2`
        );
      });
    }

    writeFileSync(this.progressPath, updated);
    console.log('📊 Session progress logged');
  }

  /**
   * Session recovery - read all planning files and summarize current state
   */
  recoverSession(): void {
    console.log('🔄 Starting session recovery...');

    if (!existsSync(this.taskPlanPath) || !existsSync(this.findingsPath) || !existsSync(this.progressPath)) {
      throw new Error('Planning files missing. Cannot recover session.');
    }

    const taskPlan = this.readTaskPlan();
    const findings = readFileSync(this.findingsPath, 'utf-8');
    const progress = readFileSync(this.progressPath, 'utf-8');

    console.log('📋 SESSION RECOVERY SUMMARY');
    console.log('=' .repeat(50));
    console.log(`🎯 Current Phase: ${taskPlan.currentStatus.activePhase}`);
    console.log(`⏭️  Next Action: ${taskPlan.currentStatus.nextAction}`);
    console.log(`🚫 Blockers: ${taskPlan.currentStatus.blockers}`);
    console.log(`🕐 Last Updated: ${taskPlan.currentStatus.lastUpdated}`);
    console.log('=' .repeat(50));

    // Log recovery session start
    this.logSessionStart(true);
  }

  /**
   * Mark a task as completed in the task plan
   */
  completeTask(taskDescription: string): void {
    const content = readFileSync(this.taskPlanPath, 'utf-8');
    
    // Find and update the task checkbox
    const updated = content.replace(
      new RegExp(`- \\[ \\] ${taskDescription.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`),
      `- [x] ${taskDescription}`
    );

    if (updated === content) {
      console.warn(`⚠️  Task not found: ${taskDescription}`);
      return;
    }

    writeFileSync(this.taskPlanPath, updated);
    console.log(`✅ Task completed: ${taskDescription}`);
  }

  /**
   * Show current planning status
   */
  showStatus(): void {
    const taskPlan = this.readTaskPlan();
    
    console.log('📊 PLANNING STATUS');
    console.log('=' .repeat(40));
    console.log(`🎯 Active Phase: ${taskPlan.currentStatus.activePhase}`);
    console.log(`⏭️  Next Action: ${taskPlan.currentStatus.nextAction}`);
    console.log(`🚫 Blockers: ${taskPlan.currentStatus.blockers}`);
    console.log(`🕐 Last Updated: ${taskPlan.currentStatus.lastUpdated}`);
    console.log('=' .repeat(40));
  }

  private extractValue(content: string, key: string): string {
    const regex = new RegExp(`\\*\\*${key}\\*\\*:?\\s*(.*)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : 'Not found';
  }

  private logSessionStart(isRecovery = false): void {
    const timestamp = new Date().toISOString();
    const sessionType = isRecovery ? 'Recovery Session' : 'New Session';
    
    console.log(`📅 ${sessionType} started at ${timestamp}`);
    
    // Could update progress.md with new session entry here
    this.logSessionProgress([`Started ${sessionType.toLowerCase()}`]);
  }
}

// CLI interface
if (require.main === module) {
  const workflow = new PlanningWorkflow();
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'start':
        const projectName = args[1] || 'Unnamed Project';
        const objective = args[2] || 'Complete project objectives';
        workflow.startPlanningSession(projectName, objective);
        break;

      case 'status':
        workflow.showStatus();
        break;

      case 'recover':
        workflow.recoverSession();
        break;

      case 'complete':
        const taskDesc = args.slice(1).join(' ');
        workflow.completeTask(taskDesc);
        break;

      case 'finding':
        const title = args[1];
        const description = args.slice(2).join(' ');
        workflow.addFinding(title, description);
        break;

      case 'update':
        const phase = args[1];
        const nextAction = args.slice(2).join(' ');
        workflow.updateTaskPlan(phase, nextAction);
        break;

      default:
        console.log(`
📋 Planning-with-Files Workflow Commands:

  start [project] [objective]  - Start new planning session
  status                       - Show current planning status  
  recover                      - Recover from previous session
  complete <task>             - Mark task as completed
  finding <title> <desc>      - Add research finding
  update <phase> <action>     - Update current phase and next action

Examples:
  npx tsx planning-workflow.ts start "My Project" "Build amazing feature"
  npx tsx planning-workflow.ts status
  npx tsx planning-workflow.ts recover
  npx tsx planning-workflow.ts complete "Create directory structure"
  npx tsx planning-workflow.ts finding "API Discovery" "Found REST endpoint for user data"
  npx tsx planning-workflow.ts update "Phase 2" "Implement user authentication"
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export { PlanningWorkflow };