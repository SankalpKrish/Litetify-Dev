---
name: Litetify
description: A lightweight, performant, moddable Spotify Premium desktop client.
colors:
  bg-base: "#0d0d0f"
  bg-elevated: "#131316"
  bg-highlight: "#1a1a1e"
  bg-sidebar: "#0a0a0c"
  fg-primary: "#f5f5f7"
  fg-secondary: "#9b9ba3"
  fg-tertiary: "#6b6b73"
  accent: "#1db954"
  accent-hover: "#1ed760"
  accent-subtle: "rgba(29, 185, 84, 0.15)"
  border: "rgba(255, 255, 255, 0.06)"
  border-hover: "rgba(255, 255, 255, 0.12)"
  error: "#e74c3c"
  error-bg: "rgba(231, 76, 60, 0.1)"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(1.8rem, 3vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  xxxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#000"
    rounded: "{rounded.full}"
    padding: "12px 32px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.bg-highlight}"
    textColor: "{colors.fg-primary}"
    rounded: "{rounded.full}"
    padding: "12px 32px"
  button-secondary-hover:
    backgroundColor: "{colors.bg-elevated}"
    borderColor: "{colors.border-hover}"
  input:
    backgroundColor: "{colors.bg-elevated}"
    textColor: "{colors.fg-primary}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  input-focus:
    borderColor: "{colors.accent}"
  sidebar:
    backgroundColor: "{colors.bg-sidebar}"
    width: "240px"
  player-bar:
    backgroundColor: "{colors.bg-elevated}"
    height: "72px"
---

# Design System: Litetify

## 1. Overview

**Creative North Star: "The Listening Lounge"**

Litetify is a dark, refined desktop music player that puts the album art and the music first. The interface recedes into deep charcoal backgrounds, letting vibrant cover art and the signature Spotify green accent command attention. Every surface is purposeful: the sidebar holds navigation, the main area surfaces content, the player bar sits at the bottom as a persistent control layer. Nothing fights the music.

The system rejects the bloat of the official Spotify client (crowded layouts, heavy chrome, inconsistent spacing) and the anonymity of generic Electron apps (bland corporate gray, no character, no soul). It aims for the warmth of a premium listening bar: dim lighting, focused attention, tactile controls that respond to every touch.

**Key Characteristics:**
- Dark-only foundation. Deep charcoal neutrals tinted toward cool blue-black at chroma 0.005.
- One accent voice. Spotify green (oklch(69% 0.18 145)) used on ≤10% of any surface. Its rarity is the point.
- Flat surfaces with responsive shadows. Depth through background layering, not drop shadows at rest. Shadows appear on hover and interaction.
- Inter at every weight. A single sans family doing the full range from label to display. Hierarchy through weight (400/500/600/700) and scale (0.78rem to 2.5rem).
- Tactile feedback. Hover states, subtle lifts, and color transitions are immediate and felt. The UI is alive but never frantic.

## 2. Colors: The Listening Lounge Palette

A restrained palette built around deep charcoal neutrals and a single green accent. The backgrounds read as "dim room" rather than "pitch black", letting album art provide the color.

### Primary
- **Spotify Green** (#1db954 / oklch(69% 0.18 145)): The sole accent. Buttons, active states, links, progress indicators. Never used decoratively. Every green pixel earns its place.

### Neutral
- **Pitch Slate** (#0a0a0c / oklch(10% 0.005 280)): Sidebar background. The darkest surface, anchoring the left edge.
- **Deep Charcoal** (#0d0d0f / oklch(12% 0.005 280)): Base page background. All main content areas sit on this.
- **Slate Black** (#131316 / oklch(15% 0.005 280)): Elevated surfaces: player bar, modals, dropdowns.
- **Iron** (#1a1a1e / oklch(19% 0.008 280)): Highlighted surfaces: hovered cards, selected items, input backgrounds.
- **Warm White** (#f5f5f7 / oklch(95% 0.003 280)): Primary text. High contrast against the dark base.
- **Silver Mist** (#9b9ba3 / oklch(67% 0.01 280)): Secondary text. Metadata, subtitles, descriptions.
- **Ash** (#6b6b73 / oklch(48% 0.01 280)): Tertiary text. Placeholders, timestamps, muted info.

### Utility
- **Ghost White** (rgba(255, 255, 255, 0.06)): Subtle borders at rest. Dividers, card outlines.
- **Dim White** (rgba(255, 255, 255, 0.12)): Borders on hover. Input strokes, interactive edges.
- **Alert Red** (#e74c3c): Errors, destructive actions, warning indicators. Used sparingly.

### Named Rules
**The One Accent Rule.** Spotify green covers ≤10% of any screen. Its rarity gives it weight. If green is everywhere, it means nothing.

**The Room Is Dark Rule.** Text on dark backgrounds must clear WCAG contrast. Primary text at #f5f5f7 on #0d0d0f (contrast ~16:1) ensures readability. Secondary at #9b9ba3 (~7:1) stays legible. Never go below 4.5:1 for body text.

## 3. Typography

**Font:** Inter (with -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif fallback)

**Character:** Inter is the entire system. One family doing every job from 12px labels to 40px display heads. The versatility comes from weight contrast: 400 for reading, 500 for emphasis, 600 for subheads, 700 for headings. The geometric-but-warm personality of Inter suits both the musical and the technical sides of the app.

### Hierarchy
- **Display** (700, clamp(1.8rem, 3vw, 2.5rem), 1.2): Page-level headings. Home view, playlist detail, artist page titles.
- **Headline** (700, 1.5rem, 1.2): Section headers. "New Releases", "Popular Tracks", settings group titles.
- **Title** (600, 1.1rem, 1.3): Card titles, playlist names, track names in lists.
- **Body** (400, 0.9rem, 1.5): Running text, track metadata, descriptions. Max line length 65ch.
- **Label** (500, 0.78rem, 1.4, letter-spacing: 0.01em): Secondary metadata, timestamps, tab labels, button text in dense controls.

### Named Rules
**The One Family Rule.** Inter covers every role. No second font. Hierarchy comes from weight and size, not typeface changes.

## 4. Elevation

Flat by default, shadows on hover. The UI uses background color to convey depth: Pitch Slate (sidebar, backmost layer), Deep Charcoal (main canvas), Slate Black (player bar, popovers). This tonal-layering approach keeps the surface clean and avoids shadow noise.

Shadows appear only as a response to interaction. They are small and warm.

### Shadow Vocabulary
- **Hover Glow** (0 1px 2px rgba(0, 0, 0, 0.3)): Subtle lift on hovered interactive elements (buttons, cards in a grid).
- **Popover Float** (0 4px 12px rgba(0, 0, 0, 0.4)): Dropdowns, device selector, context menus.
- **Modal Depth** (0 8px 24px rgba(0, 0, 0, 0.5)): Large overlays, dialogs.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (hover, open, focus). If your component needs a shadow at rest, rethink the layout.

## 5. Components

### Buttons
- **Shape:** Fully rounded (9999px). Pill-shaped buttons throughout.
- **Primary** (#1db954 bg, #000 text, 12px 32px padding): High-emphasis actions. Play buttons, auth flows. Hover brightens to #1ed760. Transition 0.2s, transform translateY(-1px) on hover.
- **Secondary** (#1a1a1e bg, #f5f5f7 text, 12px 32px padding): Neutral actions. "Add to Playlist", "Follow". Hover shifts border to Dim White.
- **Ghost / Tertiary** (transparent bg, #f5f5f7 text): Low-emphasis actions. Icon buttons, "See All" links. Hover adds #1a1a1e background.

### Navigation (Sidebar)
- **Background:** Pitch Slate (#0a0a0c). Fixed width (240px).
- **Nav items:** Body weight (400) at 0.9rem, Silver Mist (#9b9ba3). Active item uses Spotify Green (#1db954). Hover shifts background to rgba(255, 255, 255, 0.06).
- **Playlist items:** Same style as nav items. Draggable. Context menu on right-click.
- **Bottom section:** Settings link, account info — visually separated by a Ghost White border.

### Cards (Album / Playlist Grid)
- **Corner Style:** Rounded (6px). Covers may be square or round depending on view.
- **Background:** Transparent at rest. Hover lifts with Elevated background (#131316) + Hover Glow shadow.
- **Internal Padding:** 16px (text), cover art edge-to-edge.
- **Transition:** Background 0.2s, transform 0.2s, box-shadow 0.2s.

### Inputs / Fields
- **Style:** Slate Black (#131316) background, no border at rest. Ghost White bottom border.
- **Focus:** Ghost White border shifts to Dim White. Optional Spotify Green accent line at bottom.
- **Placeholder:** Ash (#6b6b73).
- **Error:** Alert Red border + Error BG tint (#e74c3c at 0.1 opacity).

### Player Bar
- **Background:** Slate Black (#131316), full-width. Fixed height (72px).
- **Layout:** Three-column: track info (left), transport + progress (center), volume + devices (right).
- **Progress:** Spotify Green (#1db954) fill on Dim White track. Rounded full. Height 4px at rest, 6px on hover (for easier scrubbing).

### Toast Notifications
- **Background:** Slate Black (#131316) with full opacity.
- **Corner:** 8px.
- **Text:** Warm White (#f5f5f7).
- **Position:** Top-right, below the top edge. Slide in from right.

## 6. Do's and Don'ts

### Do:
- **Do** let album art drive the color on each screen. The UI is deliberately neutral so covers and artist imagery provide the visual energy.
- **Do** use Spotify green as the single accent, and only where action is needed. Play buttons, active nav items, progress bars.
- **Do** use Inter at every weight. 400 for body, 500 for emphasis, 600 for subheads, 700 for headings. The weight contrast IS the hierarchy.
- **Do** keep surfaces flat at rest. Use background color (Pitch Slate, Deep Charcoal, Slate Black, Iron) for depth layering.
- **Do** make interactions felt: immediate color transitions (0.2s ease), subtle hover lifts (1px translateY), visible focus rings.
- **Do** cap body text at 65ch.

### Don't:
- **Don't** imitate the official Spotify client's layout, chrome, or density. Litetify is the lean, intentional alternative.
- **Don't** look like a generic Electron app. Avoid bland corporate gray, unstyled native controls, or the SaaS-cream monoculture.
- **Don't** use gradient text (`background-clip: text` with a gradient). Emphasis comes from weight and size, not decoration.
- **Don't** use glassmorphism or backdrop blur as a decorative default. If a blur is needed, it serves a specific functional purpose.
- **Don't** use side-stripe borders (border-left or border-right >1px as a colored accent). Use full borders, background tints, or nothing.
- **Don't** use em dashes. Use commas, colons, semicolons, or periods.
- **Don't** use #000 or #fff. Every neutral is tinted toward the brand hue.
- **Don't** use identical card grids everywhere. Cards are one tool, not the only tool. Vary layout density and composition across views.
- **Don't** open a modal as the first solution. Exhaust inline and progressive disclosure alternatives first.
