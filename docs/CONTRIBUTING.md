# Contributing to Ovo Focus

Thank you for your interest in contributing to Ovo Focus! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Review Process](#review-process)

## Getting Started

### Prerequisites

1. Ensure you have the development environment set up (see [DEVELOPMENT.md](./DEVELOPMENT.md))
2. Familiarize yourself with the project architecture (see [ARCHITECTURE.md](./ARCHITECTURE.md))
3. Review open issues and discussions

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ovofocus.git
   cd ovofocus
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/ovofocus.git
   ```
4. Install dependencies:
   ```bash
   npm install
   ```

## Development Workflow

### Branch Naming Convention

Create descriptive branch names using the following format:

```
<type>/<issue-number>-<short-description>
```

**Types:**
- `feature/` - New features or enhancements
- `bugfix/` - Bug fixes
- `hotfix/` - Critical fixes for production
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or modifications
- `chore/` - Maintenance tasks

**Examples:**
```bash
git checkout -b feature/OVOFOCUS-42-add-sound-settings
git checkout -b bugfix/OVOFOCUS-123-fix-timer-pause
git checkout -b docs/OVOFOCUS-54-update-readme
```

### Keeping Your Fork Updated

```bash
# Fetch upstream changes
git fetch upstream

# Rebase your branch on top of main
git checkout main
git rebase upstream/main

# Update your feature branch
git checkout feature/your-feature
git rebase main
```

## Code Style Guidelines

### TypeScript

- Enable strict mode (already configured in `tsconfig.json`)
- Define explicit types for function parameters and return values
- Avoid `any` type; use `unknown` when type is truly unknown
- Use interface over type for object shapes when possible

```typescript
// Good
interface Animal {
  id: string;
  name: string;
  rarity: Rarity;
}

function getAnimal(id: string): Animal | null {
  // implementation
}

// Avoid
function getAnimal(id): any {
  // implementation
}
```

### React/React Native

- Use functional components with hooks
- Extract reusable logic into custom hooks
- Keep components focused and single-purpose
- Use the theme system for styling

```typescript
// Good - Use theme tokens
const { theme } = useTheme();
<View style={{ backgroundColor: theme.colors.background }}>

// Avoid - Hardcoded values
<View style={{ backgroundColor: '#1A1A2E' }}>
```

### Component Structure

```typescript
// 1. Imports (external, internal, relative)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { useGame } from '../context/GameContext';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../styles/theme';

// 2. Types/Interfaces
interface ComponentProps {
  title: string;
  onPress?: () => void;
}

// 3. Component
export function MyComponent({ title, onPress }: ComponentProps) {
  // State and hooks
  const { state } = useGame();
  const { theme: currentTheme } = useTheme();

  // Callbacks
  const handlePress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  // Render
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: currentTheme.colors.text }]}>
        {title}
      </Text>
    </View>
  );
}

// 4. Styles
const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.h2,
    fontWeight: theme.fontWeight.bold,
  },
});
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `AnimalCard.tsx` |
| Hooks | camelCase with `use` prefix | `useTimer.ts` |
| Utilities | camelCase | `storage.ts` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_PAUSES` |
| Types/Interfaces | PascalCase | `SessionState` |
| Event handlers | camelCase with `handle` prefix | `handlePress` |

### File Organization

- One component per file
- Co-locate tests in `__tests__` directories
- Keep related files close together
- Use index files for cleaner imports when appropriate

### Accessibility

- All colors must meet WCAG AA contrast requirements (4.5:1 for normal text)
- Provide non-color visual indicators (icons, shapes) for rarity
- Support reduced motion preferences
- Include accessibility labels on interactive elements

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) for clear, consistent commit messages.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, whitespace) |
| `refactor` | Code refactoring without feature changes |
| `perf` | Performance improvements |
| `test` | Adding or modifying tests |
| `chore` | Maintenance tasks, dependencies |
| `ci` | CI/CD configuration changes |

### Scope (Optional)

Use the component or area affected:
- `timer`, `collection`, `settings`, `stats`
- `GameContext`, `storage`, `theme`
- `i18n`, `a11y`, `animations`

### Examples

```bash
# Feature
feat(collection): add animal favorites feature

# Bug fix
fix(timer): correct pause time calculation

# Documentation
docs: update development setup instructions

# Refactor
refactor(GameContext): simplify session state transitions

# Test
test(storage): add unit tests for streak calculation

# With body and footer
feat(OVOFOCUS-42): implement ambient sounds during sessions

Add background audio playback with multiple sound options:
- Rain
- Forest
- Ocean
- White noise
- Cafe

Closes #42
```

### Breaking Changes

For breaking changes, add `!` after the type or include `BREAKING CHANGE:` in the footer:

```bash
feat(storage)!: change stats data structure

BREAKING CHANGE: Stats now stored with new schema.
Migration required for existing users.
```

## Pull Request Process

### Before Submitting

1. **Update your branch** with the latest main:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests** and ensure they pass:
   ```bash
   npm test
   ```

3. **Run linting** and fix issues:
   ```bash
   npm run lint
   ```

4. **Test on devices** - verify on both iOS and Android if applicable

5. **Check for console warnings** during development

### PR Title

Follow the commit message format:
```
feat(OVOFOCUS-42): Add ambient sounds feature
fix(OVOFOCUS-123): Correct timer calculation during pause
```

### PR Description Template

```markdown
## Summary
Brief description of changes and motivation.

## Changes
- List key changes
- Include any breaking changes
- Note any dependencies added/removed

## Testing
- [ ] Unit tests added/updated
- [ ] Tested on iOS Simulator
- [ ] Tested on Android Emulator
- [ ] Tested with debug mode
- [ ] No console warnings

## Screenshots/Videos
(if applicable - especially for UI changes)

## Related Issues
Closes #<issue-number>
```

### Checklist

Before requesting review:
- [ ] Code follows the style guidelines
- [ ] Self-review completed
- [ ] Tests pass locally
- [ ] Documentation updated if needed
- [ ] No merge conflicts
- [ ] Commit messages follow convention

## Review Process

### For Reviewers

1. **Timeliness**: Aim to review within 2 business days
2. **Constructive feedback**: Be specific and suggest solutions
3. **Approve/Request Changes**: Use GitHub review features
4. **Test locally**: For significant changes, pull and test

### Review Criteria

- [ ] Code follows project conventions
- [ ] Changes align with issue requirements
- [ ] No obvious bugs or edge cases missed
- [ ] Tests are adequate
- [ ] Performance implications considered
- [ ] Accessibility maintained
- [ ] No hardcoded values that should use theme

### Addressing Feedback

1. Make requested changes in new commits (don't force-push during review)
2. Reply to comments explaining changes or discussing alternatives
3. Re-request review when ready

### Merging

- Squash and merge for clean history
- Ensure PR title follows convention (becomes commit message)
- Delete branch after merge

## Questions?

- Check existing issues and discussions
- Open a new discussion for questions
- Reach out to maintainers

Thank you for contributing to Ovo Focus!
