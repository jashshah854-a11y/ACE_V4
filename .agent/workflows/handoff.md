---
description: Safely wrap up a coding session by verifying the build, syncing to git, and updating status.
---

# Session Handoff Protocol

This workflow ensures that all work is verified and safely persisted before closing a chat session.

1. **Verify System Integrity**
   - Run the build command to ensure no syntax errors were left behind.
   // turbo
   $ npm run build

2. **Sync to Repository**
   - Check for any uncommitted changes.
   // turbo
   $ git status
   - Stage, commit, and push all changes to the current branch.
   // turbo
   $ git add .
   $ git commit -m "chore(session): safe handoff - sync latest changes"
   $ git push

3. **Finalize Documentation**
   - Update `task.md` to reflect current state (mark completed items).
   - Update `walkthrough.md` if new features were added.

4. **Session Summary**
   - Provide a concise summary of:
     - What was accomplished.
     - The commit hash/branch pushed.
     - Any open threads or next steps for the future.

5. **Ready for Departure**
   - Confirm that it is safe to delete/close the chat history.
