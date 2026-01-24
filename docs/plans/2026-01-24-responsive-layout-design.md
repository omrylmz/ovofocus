# Responsive Layout Design

**Date**: 2026-01-24
**Status**: Approved
**Goal**: Consistent UI layouts across all phone sizes - no overlapping views

## Problem

Views (eggs, circles, timers, controls) overlap inconsistently across different phone models. The issue is systemic but worst on the Home/Timer screen. Fixed pixel values and absolute positioning cause elements to misalign when screen dimensions change.

## Solution Overview

A responsive layout system with three principles:

1. **Flex-based layouts** - Replace absolute positioning with Flexbox that adapts naturally
2. **Proportional sizing** - Key elements size relative to screen dimensions, not fixed pixels
3. **Constrained scaling** - Min/max bounds so elements stay usable on all screens

## Home Screen Layout

The Home screen uses a vertical flex layout with fixed header/footer and flexible center:

```
┌─────────────────────────┐
│     Stats Bar           │  ← Fixed height (~60px)
├─────────────────────────┤
│                         │
│     Egg + Timer Area    │  ← flex: 1 (takes remaining space)
│     (centered, scales)  │     Egg sizes to 40-50% of this area
│                         │
├─────────────────────────┤
│     Session Controls    │  ← Fixed height (~120px)
│     (Start/Pause/etc)   │     Safe area padding at bottom
└─────────────────────────┘
```

### Egg Container
- Uses `flex: 1` to fill available vertical space
- Egg scales proportionally within container (max 70% of container width)
- Centered both horizontally and vertically

### Timer Circle
- Sized relative to egg, not fixed pixels
- Positioned around egg, scales together

### Controls
- Anchored to bottom with consistent padding
- Never overlaps egg area due to flex separation
- Respects safe area insets for home indicators

### Scaling Bounds
- Egg diameter: min 150px, max 320px
- Timer text: scales with egg (min 24px, max 48px)

## Collection Screen

### Dynamic Grid
- Column count based on screen width:
  - Small phones (<375px): 2 columns
  - Regular phones (375-428px): 3 columns
  - Large phones/tablets (>428px): 4-5 columns
- Cards size proportionally within columns
- Consistent gap spacing using theme values

## Modals

### General Modal Rules
- Max width constraint (400px) - prevents stretching on tablets
- Content scrollable when screen height is short
- Safe area insets respected for bottom sheets

### Specific Modals
- **HatchModal**: Animal image scales proportionally, text wraps properly
- **AnimalDetailModal**: Image has max-height, stats section scrollable
- **Settings**: List items have consistent touch targets

## Implementation

### New Files

#### `src/hooks/useResponsive.ts`
```typescript
// Provides:
// - screenWidth, screenHeight
// - isSmallScreen, isLargeScreen
// - scale(size) - proportional scaling
// - clamp(size, min, max) - bounded scaling
// - columns - dynamic column count for grids
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/styles/theme.ts` | Add responsive spacing/sizing functions |
| `app/index.tsx` | Refactor to flex-based layout |
| `src/components/Egg.tsx` | Proportional sizing with min/max bounds |
| `src/components/TimerDisplay.tsx` | Scale with egg container |
| `app/collection.tsx` | Dynamic column count, proportional cards |
| `src/components/HatchModal.tsx` | Max-width, scroll support |
| `src/components/AnimalDetailModal.tsx` | Max-width, proportional image |

### Implementation Order

1. **Create `useResponsive` hook** - Foundation for all responsive behavior
2. **Update theme utilities** - Add scaling functions
3. **Fix Home screen layout** - Highest impact, flex-based structure
4. **Fix Collection grid** - Dynamic columns
5. **Fix Modals** - Max-width and scroll support

## Success Criteria

- [ ] Home screen displays correctly on iPhone SE (smallest)
- [ ] Home screen displays correctly on iPhone Pro Max (largest)
- [ ] Home screen displays correctly on various Android sizes
- [ ] No overlapping elements on any tested device
- [ ] Collection grid adapts column count to screen width
- [ ] Modals don't stretch awkwardly on tablets
- [ ] All touch targets remain >= 44px

## Related Jira Issues

- OVOFOCUS-91: Complete UI/UX Overhaul (parent epic)
- OVOFOCUS-94: Audit and fix spacing consistency
- OVOFOCUS-60: Optimize tablet and web layouts
