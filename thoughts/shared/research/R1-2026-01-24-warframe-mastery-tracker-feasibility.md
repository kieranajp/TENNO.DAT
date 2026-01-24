---
date: 2026-01-24T12:00:00Z
researcher: Kieran Patel
git_commit: N/A (greenfield project)
branch: N/A
repository: warframe
topic: "Warframe Mastery Tracker - Data Sources and Player Sync Methods"
tags: [research, warframe, mastery-tracking, api, feasibility, profile-api, inventory]
last_updated: 2026-01-24
last_updated_note: "Added clarification on mastery data vs inventory data (public vs private)"
---

# Research: Warframe Mastery Tracker - Data Sources and Player Sync Methods

**Date**: 2026-01-24
**Researcher**: Kieran Patel
**Repository**: warframe (greenfield)

## Research Question

What public databases exist for Warframe items, and what methods are available for pulling a player's owned/mastered items to avoid manual entry?

## Summary

There is an excellent ecosystem for **item data** - the Warframe Community Developers (WFCD) maintain comprehensive, regularly-updated databases via npm packages and REST APIs. However, **player-specific data** (inventory, mastery progress) is much more limited - Digital Extremes does not provide a public API for personal account data. The best options for auto-sync are Tenno Tracker's profile API approach, AlecaFrame's Overwolf integration, or WFInfo's OCR-based scanning.

---

## Part 1: Warframe Item Databases

### Recommended: @wfcd/items (npm package)

**Source**: [GitHub](https://github.com/WFCD/warframe-items) | [npm](https://www.npmjs.com/package/@wfcd/items)

The most comprehensive, easy-to-use package for item data. Automatically updates with every game release.

```bash
npm install @wfcd/items
```

```javascript
import Items from '@wfcd/items';
import { find } from '@wfcd/items/utilities';

const items = new Items({ category: ['Primary', 'Secondary', 'Melee'] });
const excalPrime = find.findItem('/Lotus/Powersuits/Excalibur/ExcaliburPrime');
```

**Available Categories (24 total)**:
- Warframes, Arcanes, Archwing, Arch-Gun, Arch-Melee
- Primary, Secondary, Melee weapons
- Pets, Sentinels, SentinelWeapons
- Mods, Relics, Resources, Gear
- Fish, Glyphs, Misc, Node, Quests, Sigils, Skins

**Data Per Item**:
- Unique in-game name, mastery requirements, tradability
- Drop rates, patch logs, riven data
- Images via CDN: `https://cdn.warframestat.us/img/${item.imageName}`

**Languages**: de, es, fr, it, ja, ko, pl, pt, ru, th, tr, uk, zh, en

---

### Alternative: warframe-public-export-plus

**Source**: [GitHub](https://github.com/calamity-inc/warframe-public-export-plus) | [Browse](https://browse.wf)

```bash
npm install warframe-public-export-plus
```

Enhanced version of DE's official Public Export with:
- Clean, pre-processed JSON (no LZMA decompression)
- TypeScript definitions
- 50+ export files with additional fields

---

### REST APIs

| API | Base URL | Best For |
|-----|----------|----------|
| **WarframeStat.us** | `https://api.warframestat.us` | Live world state, events |
| **Warframe.market** | `https://api.warframe.market/v1` | Trading prices, orders |
| **Drop Data** | `https://drops.warframestat.us/data/` | Drop tables, farming info |

---

### Official: Digital Extremes Public Export

**Source**: [Wiki Documentation](https://wiki.warframe.com/w/Public_Export)

- Index: `https://origin.warframe.com/PublicExport/index_en.txt.lzma`
- Manifests: `http://content.warframe.com/PublicExport/Manifest/ExportWeapons_en.json!<hash>`

Available exports: ExportWeapons, ExportWarframes, ExportSentinels, ExportUpgrades, ExportRecipes, ExportResources, ExportRelicArcane, ExportRegions, ExportCustoms, ExportGear

**Note**: Hashes change with every update - use the npm packages for convenience.

---

## Part 2: Player Data Sync Methods

### Critical Finding: No Official Player API

Digital Extremes does **not** provide a public API for personal inventory or mastery data. All solutions are workarounds.

---

### Critical Distinction: Mastery Data vs Inventory Data

The public profile API (`getProfileViewingData.php`) exposes **mastery/equipment stats**, but **NOT inventory**.

| Data Type | Public API? | Description |
|-----------|-------------|-------------|
| **Mastered items** | Yes | Items leveled to rank 30/40 - permanent record with XP values |
| **Owned prime parts** | No | Current inventory contents (e.g., "3x Ember Prime Chassis") |
| **Blueprints** | No | Owned blueprints in inventory |
| **Relics** | No | Void relics you own |
| **Resources/credits** | No | Crafting materials, currency |
| **Mods** | No | Your mod collection |

**Key insight**: If you master Ember Prime then sell her, the API still shows her as mastered (XP data persists) - but has no idea whether you currently own her or her parts.

**Endpoint**: `http://content.warframe.com/dynamic/getProfileViewingData.php?playerId=ACCOUNTID`

**What the profile API returns per item**:
- XP/Affinity earned (reveals mastery status: 900k = mastered frame, 450k = mastered weapon)
- Hours used, kills, headshots, assists

**For inventory data** (owned parts, relics, resources), the only options are:
- **AlecaFrame** (Windows/Overwolf) - reads game memory
- **Manual entry** - user checkboxes
- **OCR/screenshot** - parse inventory screenshots with Tesseract
- **EE.log parsing** - may capture some trade/acquisition events (unreliable)

**Useful libraries**:
- [WFCD/profile-parser](https://github.com/WFCD/profile-parser) - JS library to parse profile JSON
- [browse.wf/profile](https://browse.wf/profile) - Web viewer using this API

---

### Method 1: Tenno Tracker (Recommended - Profile Sync)

**Source**: [tennotracker.com](https://www.tennotracker.com/) | [FAQ](https://www.tennotracker.com/faq)

**How it works**: Uses DE's public profile API to read your publicly visible mastery data.

**Pros**:
- Cross-platform (PC, PS4/PS5, Xbox, Switch, Mobile)
- No client installation needed
- Officially-tolerated (uses public data)

**Cons**:
- Only syncs publicly visible profile data
- Requires Account ID (from EE.log since Update 38.0.8)
- Rate limited (free: 6hr, paid: 30min)

**Setup**: Browser extension ([Chrome](https://chromewebstore.google.com/detail/tenno-tracker-gid-fetcher/omjafgfifenecjcpfnjhihfbnekoldin) | [Firefox](https://addons.mozilla.org/en-GB/firefox/addon/tenno-tracker-gid-fetcher/)) retrieves your GID cookie.

---

### Method 2: AlecaFrame (Overwolf - Full Inventory)

**Source**: [alecaframe.com](https://alecaframe.com/) | [API Docs](https://docs.alecaframe.com/api)

**How it works**: Overwolf overlay reads game data while Warframe runs.

**Pros**:
- Full inventory access (items, resources, relics, rivens)
- Real-time sync
- Has API for data export ([Swagger](https://stats.alecaframe.com/api/swagger/index.html))

**Cons**:
- Windows only (Overwolf)
- Warframe cannot run as admin
- Must visit relay 2-3x to force inventory sync

**Safety**: DE has confirmed Overwolf compliance with EULA/ToS.

---

### Method 3: WFInfo (OCR Screen Reading)

**Source**: [wfinfo.warframestat.us](https://wfinfo.warframestat.us/) | [GitHub](https://github.com/WFCD/WFinfo)

**How it works**: Uses Tesseract OCR to read items from your screen.

**Master-It Feature**:
1. Open profile screen in-game
2. Press Right CTRL + Print Screen
3. WFInfo scans and marks items as mastered

**Safety**: Confirmed safe by DE - does not inject into Warframe.

---

### Method 4: Twitch Arsenal Extension API

**Endpoint**: `https://content.warframe.com/dynamic/twitch/getActiveLoadout.php`

**What it exposes**: Current equipped loadout (warframe, weapons, mods, arcanes)

**Limitations**: Only current loadout, not full inventory or mastery progress.

**Requires**: User opt-in via account settings "Share Loadout Information"

---

### Method 5: Manual Tracking (Most Common)

Most existing tools use manual checkbox entry:

| Tool | Storage | Features |
|------|---------|----------|
| [FrameHub](https://framehub.paroxity.net/) | Firebase | Sharing, tooltips, wiki links |
| [Warframe Foundry](https://warframe-foundry.app/) | Browser | Import/export |
| [WFMastery](https://ehwuts.github.io/WFMastery/) | Browser | Simple, MIT license |

---

### Comparison Matrix

| Method | Safety | Automation | Data Completeness | Platform |
|--------|--------|------------|-------------------|----------|
| Tenno Tracker | High | Auto-sync | Profile data only | All |
| AlecaFrame | High | Full auto | Complete inventory | Windows |
| WFInfo OCR | High | Semi-auto | Screen-visible | Windows |
| Twitch API | High | Full auto | Current loadout only | All |
| Manual entry | Safe | None | User-entered | All |

---

## Part 3: Existing Solutions Landscape

### Web Apps
- **[FrameHub](https://framehub.paroxity.net/)** - Firebase, sharing, most feature-complete
- **[Tenno Tracker](https://www.tennotracker.com/)** - Profile sync, roadmap planning
- **[Warframe Foundry](https://warframe-foundry.app/)** - Import/export, browser storage

### Desktop (Overwolf)
- **[AlecaFrame](https://alecaframe.com/)** - 1M+ users, full game integration
- **[Warframe Helper](https://www.overwolf.com/app/azerpug-warframe_helper)** - Mastery checklist

### Open Source
- [Paroxity/FrameHub](https://github.com/Paroxity/FrameHub) - JavaScript, Apache 2.0
- [ehwuts/WFMastery](https://github.com/ehwuts/WFMastery) - JavaScript, MIT
- [WFCD/warframe-items](https://github.com/WFCD/warframe-items) - Item database

---

## Recommendations for Your App

### For Item Data
Use `@wfcd/items` - it's comprehensive, well-maintained, and has TypeScript support.

### For Player Sync (choose based on needs)

1. **Simple approach**: Manual checkboxes with browser localStorage + optional cloud sync
2. **Profile sync**: Integrate with Tenno Tracker's approach (public profile API)
3. **AlecaFrame integration**: If targeting Windows/Overwolf users, could pull from their API
4. **Hybrid**: Manual entry with optional import from AlecaFrame export

### Unique Value Opportunities
- Better UX than existing tools
- Integration with drop data for "where to farm" guidance
- Progress visualization and goal setting
- Cross-platform sync (existing tools are weak here)

---

---

## Part 4: Linux-Specific Considerations

Since AlecaFrame/Overwolf is Windows-only, here are the viable options for Linux:

### Tenno Tracker (Best Option for Linux)

Works entirely in the browser - the [GID Fetcher extension](https://addons.mozilla.org/en-GB/firefox/addon/tenno-tracker-gid-fetcher/) works on Firefox/Chrome on Linux. Syncs public profile data automatically.

### EE.log Location on Linux (Proton)

```
~/.local/share/Steam/steamapps/compatdata/230410/pfx/drive_c/users/steamuser/AppData/Local/Warframe/EE.log
```

The log contains mission events, player data references, and can be monitored with `tail -f` or `inotifywait`. However, **Warframe buffers log writes**, making real-time monitoring inconsistent.

### Linux-Native Tools

| Tool | Type | Link |
|------|------|------|
| **wfinfo-ng** | Rust, X11/Wayland | [GitHub](https://github.com/knoellle/wfinfo-ng) |
| **wfinfo-linux** | Python, Wayland | [GitHub](https://github.com/soramanew/wfinfo-linux) |
| **warframeocr** | Python, EE.log + OCR | [GitHub](https://github.com/Zendelll/warframeocr) |

These are primarily for relic reward pricing, not mastery tracking - but the OCR/log-parsing techniques could be adapted.

### Recommended Approach for Linux

1. **Web app** - platform-agnostic, works everywhere
2. **Manual entry** as primary input method (like FrameHub)
3. **Optional Tenno Tracker-style sync** via public profile API
4. **Optional EE.log parsing** for detecting newly mastered items (when log contains mastery events)

---

## Sources

### Item Data
- [WFCD/warframe-items GitHub](https://github.com/WFCD/warframe-items)
- [@wfcd/items npm](https://www.npmjs.com/package/@wfcd/items)
- [WarframeStat.us API](https://docs.warframestat.us/)
- [Public Export Wiki](https://wiki.warframe.com/w/Public_Export)
- [warframe-public-export-plus](https://github.com/calamity-inc/warframe-public-export-plus)
- [Warframe.market API](https://warframe.market/api_docs)
- [Drop Data](https://drops.warframestat.us/)

### Player Sync
- [Tenno Tracker](https://www.tennotracker.com/)
- [AlecaFrame](https://alecaframe.com/) | [Docs](https://docs.alecaframe.com/)
- [WFInfo](https://wfinfo.warframestat.us/)
- [Third-Party Software Policy](https://support.warframe.com/hc/en-us/articles/360030014351-Third-Party-Software-and-You)
- [WFCD/profile-parser](https://github.com/WFCD/profile-parser) - JS library for parsing profile API
- [browse.wf/profile](https://browse.wf/profile) - Profile viewer using public API

### Existing Tools
- [FrameHub](https://framehub.paroxity.net/)
- [Warframe Foundry](https://warframe-foundry.app/)
- [Warframe Helper (Overwolf)](https://www.overwolf.com/app/azerpug-warframe_helper)

### Community
- [WFCD GitHub Organization](https://github.com/WFCD)
- [Warframe Forums - Account Data API Discussion](https://forums.warframe.com/topic/1368584-warframe-account-data-api/)