# Documentation Update Skill

## Purpose
Automatically update project documentation when new features are implemented. Keeps Claude docs, developer guides, and non-technical overviews in sync with the actual codebase.

## When to Use
- After implementing a new feature
- After major code changes
- When project structure changes
- Before onboarding new team members
- During code reviews

## What This Skill Does

1. **Analyzes the current codebase** to understand what's been implemented
2. **Updates Claude documentation** (.claude/*.md files) with implementation status
3. **Creates/updates START-HERE.md** - Developer-focused codebase guide
4. **Creates/updates SYSTEM-OVERVIEW.md** - Non-technical system explanation
5. **Maintains implementation checklist** showing what's done vs. planned

## How to Invoke

```
/update-docs
```

Or with specific scope:

```
/update-docs --scope=feature-name
/update-docs --scope=all
/update-docs --create-start-here
/update-docs --create-overview
```

## Process

### Step 1: Analyze Codebase

Scan the project to identify:
- Implemented features vs. planned features (from implementation-guide.md)
- New files and their purposes
- API routes that exist
- Database models that are created
- UI components built
- Third-party integrations added

### Step 2: Update Claude Documentation

Update the following files based on findings:

**`.claude/claude.md`:**
- Update "Current Status" section
- Mark implemented features
- Add warnings about implemented vs. planned differences
- Update file structure if changed

**`.claude/implementation-guide.md`:**
- Check off completed tasks
- Add notes about implementation details
- Update timeline if schedule changed
- Add new sections for features not in original plan

**`.claude/project-overview.md`:**
- Update if architecture changed
- Add new features to feature list
- Update technology stack if new tools added

**`.claude/database-schema.md`:**
- Add any new models not in original schema
- Document custom fields added during implementation
- Update relationships if changed

**`.claude/api-reference.md`:**
- Document any new endpoints created
- Update existing endpoints if behavior changed
- Add new error codes
- Document actual vs. planned differences

### Step 3: Create/Update START-HERE.md

Create a developer-focused guide at `/START-HERE.md` with:

**Section 1: Quick Start**
- Prerequisites (Node.js version, etc.)
- Installation steps
- Environment variables needed
- How to run locally
- How to run tests

**Section 2: Project Structure**
- Explanation of folder organization
- Where to find key files
- Naming conventions
- File organization principles

**Section 3: Key Concepts**
- Four-role user system
- Multi-level inventory flow
- Order lifecycle
- Payment processing

**Section 4: Development Workflow**
- How to add a new feature
- How to add a new API route
- How to add a new database model
- How to add a new UI component
- Git workflow

**Section 5: Common Tasks**
- How to add a product
- How to create an order
- How to test M-Pesa (sandbox)
- How to debug issues
- Where logs are

**Section 6: Architecture Decisions**
- Why Next.js App Router
- Why Prisma vs. Supabase Client
- Why M-Pesa for payments
- Key trade-offs made

**Section 7: Resources**
- Links to Claude docs
- Links to external docs
- Team contacts
- Support channels

### Step 4: Create/Update SYSTEM-OVERVIEW.md

Create a non-technical explanation at `/SYSTEM-OVERVIEW.md`:

**Section 1: What This System Does**
- Plain language explanation
- Who uses it
- What problem it solves
- Business value

**Section 2: User Roles**
- Owner: What they see and do
- Manager: What they see and do
- Distributor: What they see and do
- Client: What they see and do

**Section 3: Key Features**
- Product catalog
- Inventory management
- Order processing
- M-Pesa payments
- Analytics and reporting
- Email notifications

**Section 4: How It Works**
- High-level flow diagrams (text-based)
- Order journey (warehouse → distributor → client)
- Payment flow
- Inventory synchronization

**Section 5: System Status**
- What's implemented
- What's in progress
- What's planned
- Known limitations

**Section 6: Getting Help**
- How to contact support
- Documentation links
- Training materials
- FAQ

### Step 5: Create Implementation Status Report

Create `/IMPLEMENTATION-STATUS.md`:
- Features completed vs. planned
- Timeline status (on track, delayed, ahead)
- Known issues
- Next milestones
- Technical debt

## Implementation

When invoked, execute the following:

1. **Scan codebase:**
   ```typescript
   // Check for existence of key files/directories
   - src/app/api/* (API routes)
   - src/app/(owner|manager|distributor|client)/* (Role dashboards)
   - prisma/schema.prisma (Database)
   - src/lib/mpesa/* (M-Pesa integration)
   - src/lib/email/* (Email service)
   ```

2. **Compare against implementation-guide.md:**
   - Week 1-2 tasks: Check project structure exists
   - Week 3-5 tasks: Check API routes exist
   - Week 6-7 tasks: Check client features
   - Week 8 tasks: Check analytics
   - Week 9 tasks: Check email integration

3. **Generate diff:**
   - What's implemented that wasn't planned
   - What's planned but not implemented
   - What's implemented differently than planned

4. **Update all documentation files**

5. **Create summary report**

## Output Format

After running, provide:

```markdown
## Documentation Update Summary

### Files Updated
- ✅ .claude/claude.md (Current Status section)
- ✅ .claude/implementation-guide.md (Marked 23 tasks complete)
- ✅ START-HERE.md (Created new file)
- ✅ SYSTEM-OVERVIEW.md (Updated Features section)
- ✅ IMPLEMENTATION-STATUS.md (Created progress report)

### Implementation Progress
- **Completed:** 23/77 tasks (30%)
- **Current Phase:** Week 3 (Core Features)
- **Status:** On track

### Key Findings
- ✅ Authentication fully implemented
- ✅ Product management complete
- ⚠️  M-Pesa integration in progress
- ❌ Email notifications not started
- 📝 Added custom dashboard widget (not in original plan)

### Recommendations
1. Update TRD.md to reflect custom widgets
2. Document new dashboard component in claude.md
3. Create migration guide for schema changes
```

## Best Practices

**When to run this skill:**
- End of each development sprint
- After completing a major feature
- Before code reviews
- Before team demos
- Weekly as part of maintenance

**What NOT to do:**
- Don't run after every single commit (too frequent)
- Don't manually edit generated sections (will be overwritten)
- Don't skip updating when major changes happen

**Manual sections:**
- Mark sections that should be manually edited with `<!-- MANUAL EDIT -->`
- These won't be overwritten by the skill

## Customization

You can customize the skill by editing:
- `/home/user/muchiri-warehouse/.claude/skills/update-docs.md` (this file)
- Templates in `.claude/templates/` (create if needed)

## Examples

**Example 1: After implementing authentication**
```
/update-docs --scope=authentication
```

Output:
- Updates claude.md with "Authentication: ✅ Implemented"
- Checks off Week 1-2 auth tasks in implementation-guide.md
- Adds "How authentication works" to START-HERE.md
- Updates SYSTEM-OVERVIEW.md with login instructions

**Example 2: After major refactor**
```
/update-docs --scope=all
```

Output:
- Full codebase scan
- Updates all documentation files
- Recreates START-HERE.md with new structure
- Creates comprehensive status report

**Example 3: Before onboarding new dev**
```
/update-docs --create-start-here
```

Output:
- Creates fresh START-HERE.md
- Includes current project state
- Lists what's implemented
- Provides setup instructions

## Automation

To automate this, add to Git hooks:

**`.git/hooks/post-commit`:**
```bash
#!/bin/bash
# Auto-update docs after commits to main features

if git diff-tree --name-only -r HEAD | grep -q "src/app/api"; then
    echo "API changes detected, updating docs..."
    # Trigger doc update
fi
```

**GitHub Actions workflow:**
```yaml
name: Update Docs
on:
  push:
    branches: [main, develop]
jobs:
  update-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Update documentation
        run: |
          # Run update-docs skill
          # Commit changes
          # Create PR if needed
```

## Version History

- **v1.0** (2025-11-18): Initial skill creation
- Next: Add templates, automation hooks

---

**Skill Status:** Ready to use
**Maintainer:** Jason Mbugua
**Last Updated:** 2025-11-18
