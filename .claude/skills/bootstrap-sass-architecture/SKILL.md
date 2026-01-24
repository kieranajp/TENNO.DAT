---
name: bootstrap-sass-architecture
description: |
  Architecture pattern for using Bootstrap with SASS in web projects. Applies a clean, modular CSS structure with selective Bootstrap imports and variable overrides. Use when: (1) Setting up CSS/styling for a new web project, (2) User mentions Bootstrap or SASS, (3) Configuring styles in Svelte, React, Vue, or other frontend frameworks, (4) User asks about CSS architecture or organization.
---

# Bootstrap SASS Architecture

A clean, modular approach to using Bootstrap SASS with selective imports and proper variable override ordering.

## Directory Structure

```
src/
└── styles/
    ├── _variables.sass      # Bootstrap variable overrides (loaded FIRST)
    ├── _styles.sass         # Main entry point - import order matters
    └── custom/              # Project-specific global styles
        └── _layout.sass
```

## File Patterns

### _variables.sass

Override Bootstrap's default variables BEFORE importing Bootstrap. This file contains only variable definitions.

```sass
// _variables.sass
// Override Bootstrap defaults - these MUST be defined before Bootstrap imports

$primary: #7c3aed
$secondary: #64748b
$border-radius: 6px
$font-family-sans-serif: 'Inter', system-ui, sans-serif

// Spacing, colors, typography overrides as needed
```

### _styles.sass

Main entry point. Import order is critical:
1. Variables (overrides)
2. Bootstrap functions
3. Bootstrap variables (picks up overrides)
4. Bootstrap mixins
5. Selective Bootstrap component imports
6. Custom global styles

```sass
// _styles.sass

// 1. Our overrides first
@import "variables"

// 2. Bootstrap core (order matters)
@import "bootstrap/scss/functions"
@import "bootstrap/scss/variables"
@import "bootstrap/scss/mixins"

// 3. Bootstrap components - ONLY what we need
@import "bootstrap/scss/root"
@import "bootstrap/scss/reboot"
@import "bootstrap/scss/type"
@import "bootstrap/scss/grid"
@import "bootstrap/scss/utilities"
@import "bootstrap/scss/buttons"
@import "bootstrap/scss/forms"
@import "bootstrap/scss/card"
@import "bootstrap/scss/modal"
@import "bootstrap/scss/nav"
@import "bootstrap/scss/navbar"
// Add others as needed, but be selective

// 4. Custom global styles
@import "custom/layout"
```

### Component-Level Styles

Global styles go in `_styles.sass` or `custom/` directory. Component-specific styles belong in the component file itself (Svelte's `<style>`, Vue's `<style scoped>`, CSS modules, etc.).

```svelte
<!-- ItemCard.svelte -->
<div class="item-card">
  <img src={item.image} alt={item.name} />
  <h3>{item.name}</h3>
</div>

<style>
  .item-card {
    /* Component-specific styles only */
    display: flex;
    gap: 1rem;
  }

  .item-card img {
    width: 64px;
    height: 64px;
    object-fit: contain;
  }
</style>
```

## Vite Configuration (Svelte Example)

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  css: {
    preprocessorOptions: {
      sass: {
        additionalData: `@import "./src/styles/_variables.sass"\n`
      }
    }
  }
})
```

## Common Bootstrap Imports

Reference for selective imports:

| Component | Import | Use Case |
|-----------|--------|----------|
| `grid` | Layout columns | Almost always needed |
| `utilities` | Spacing, display, flex | Almost always needed |
| `reboot` | CSS reset | Almost always needed |
| `type` | Typography | Text styling |
| `buttons` | `.btn` classes | Forms, CTAs |
| `forms` | Form controls | User input |
| `card` | Card component | Content containers |
| `modal` | Modal dialogs | Overlays |
| `nav`, `navbar` | Navigation | Site navigation |
| `tables` | Table styling | Data display |
| `alert` | Alert boxes | Notifications |
| `badge` | Badges/pills | Status indicators |
| `dropdown` | Dropdowns | Menus |

## Key Principles

1. **Selective imports only** - Never import all of Bootstrap. Import only what you use.
2. **Variables first** - Override variables before Bootstrap loads so they cascade correctly.
3. **Global vs component** - If a style applies across the app, it's global. If it's specific to one component, it's scoped.
4. **No utility-first** - Use Bootstrap utilities sparingly. Prefer semantic class names with scoped styles.
