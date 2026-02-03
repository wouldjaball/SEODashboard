# Planning-with-Files Implementation

A persistent markdown-based planning system for Claude Code, inspired by Manus AI's context engineering approach.

## 🎯 Overview

This implementation solves AI agent memory and context management problems by using the filesystem as "disk memory" for persistent planning across conversation sessions.

### Core Concept
- **Filesystem as "Disk Memory"**: Persistent storage for planning state
- **Context Window as "RAM"**: Volatile, session-specific processing
- **Three-File System**: Structured approach to task tracking and recovery

## 📁 File Structure

```
planning-workspace/
├── task_plan.md          # Main project plan with phases and tasks
├── findings.md           # Research discoveries and key insights
├── progress.md           # Session logs and progress tracking
├── planning-workflow.ts  # CLI workflow management script
└── README.md            # Documentation (this file)
```

## 🚀 Quick Start

### 1. Initialize Session
```bash
# Show current planning status
npx tsx planning-workspace/planning-workflow.ts status

# Start new planning session
npx tsx planning-workspace/planning-workflow.ts start "Project Name" "Objective description"
```

### 2. Session Recovery
```bash
# Recover from previous session (reads all planning files)
npx tsx planning-workspace/planning-workflow.ts recover
```

### 3. Progress Management
```bash
# Mark a task as completed
npx tsx planning-workspace/planning-workflow.ts complete "Create directory structure"

# Update current phase and next action
npx tsx planning-workspace/planning-workflow.ts update "Phase 2" "Implement authentication"

# Add research finding
npx tsx planning-workspace/planning-workflow.ts finding "API Discovery" "Found REST endpoint for user data"
```

## 📋 Core Files

### task_plan.md
The main project planning document containing:
- **Project objective** and scope
- **Phase-based breakdown** with checkboxes
- **Current status** tracking
- **Success criteria** definitions
- **Live progress** indicators

### findings.md
Research and discovery log containing:
- **Key discoveries** from investigation
- **Technical insights** and architectural decisions
- **Reference materials** and sources
- **Outstanding questions** for future sessions

### progress.md
Session-by-session progress log containing:
- **Session history** with timestamps
- **Actions taken** in each session
- **Errors and blockers** encountered
- **Recovery checkpoints** for session restoration

## 🔧 Workflow Commands

| Command | Description | Example |
|---------|-------------|---------|
| `status` | Show current planning status | `npx tsx planning-workflow.ts status` |
| `start` | Begin new planning session | `npx tsx planning-workflow.ts start "My Project" "Build feature"` |
| `recover` | Restore from previous session | `npx tsx planning-workflow.ts recover` |
| `complete` | Mark task as done | `npx tsx planning-workflow.ts complete "Setup database"` |
| `update` | Update phase and next action | `npx tsx planning-workflow.ts update "Phase 2" "Add authentication"` |
| `finding` | Add research discovery | `npx tsx planning-workflow.ts finding "Title" "Description"` |

## 🔄 Session Recovery Process

When starting a new Claude Code session:

1. **Read Planning State**: Load all three planning files to understand context
2. **Status Check**: Run `recover` command to get current state summary
3. **Continue Work**: Pick up from last checkpoint in task_plan.md
4. **Log Progress**: Update progress.md with new session activities

## 🎨 Best Practices

### Planning Workflow
- **Always start sessions** with `recover` command
- **Update progress regularly** throughout sessions
- **Mark tasks completed** immediately when done
- **Log key discoveries** in findings.md
- **Use descriptive phases** and action items

### File Management
- **Keep files in sync** - all three files should reflect current reality
- **Use consistent formatting** - follow markdown structure
- **Add timestamps** for all significant updates
- **Be specific** in task descriptions and findings

### Cross-Session Persistence
- **Read before writing** - always check current state first
- **Preserve context** - maintain continuity between sessions
- **Track assumptions** - document decisions and reasoning
- **Plan for recovery** - ensure someone else could continue the work

## 🔍 Example Usage

```bash
# Start new session
npx tsx planning-workspace/planning-workflow.ts recover

# Check current status
npx tsx planning-workspace/planning-workflow.ts status

# Work on tasks...
npx tsx planning-workspace/planning-workflow.ts complete "Create API endpoints"

# Add discoveries
npx tsx planning-workspace/planning-workflow.ts finding "Database Schema" "Users table needs additional OAuth columns"

# Update progress
npx tsx planning-workspace/planning-workflow.ts update "Phase 2 - Authentication" "Implement OAuth callback handling"
```

## 🏗️ Architecture

The system implements three key principles:

1. **Persistent State**: Uses markdown files for cross-session state
2. **Structured Planning**: Phase-based approach with clear checkpoints  
3. **Recovery Mechanisms**: Built-in session restoration capabilities

### Integration with Claude Code
- Uses existing Claude Code tools (Read, Write, Edit)
- No custom CLI extensions required
- Works with standard markdown files
- Compatible with git version control

## 🎯 Success Indicators

- ✅ All planning files exist and are maintained
- ✅ Session recovery works reliably
- ✅ Task progress is clearly tracked
- ✅ Key discoveries are documented
- ✅ Cross-session continuity is maintained

---

*This implementation brings the power of Manus AI's context engineering approach to Claude Code, enabling persistent planning and reliable session recovery.*