---
date: 2026-01-27T14:30:00+00:00
researcher: Kieran Patel
git_commit: a6abeeccc03f9e00715de76c4cedf89ef3902119
branch: feature/easter-eggs
repository: TENNO.DAT
topic: "Warframe SSO/OAuth Authentication Options"
tags: [research, authentication, oauth, steam, sso, de-api]
last_updated: 2026-01-27
---

# Research: Warframe SSO/OAuth Authentication Options

**Date**: 2026-01-27T14:30:00+00:00
**Researcher**: Kieran Patel
**Git Commit**: a6abeeccc03f9e00715de76c4cedf89ef3902119
**Branch**: feature/easter-eggs
**Repository**: TENNO.DAT

## Research Question

Research if "Log in with Warframe" SSO is a thing, as that might let me get the User ID for free. Fallback would be Steam OAuth or something.

## Summary

**Digital Extremes/Warframe does NOT provide any official OAuth, SSO, or public API authentication system for third-party applications.** There is no "Login with Warframe" functionality. Steam OpenID 2.0 is the most viable fallback option for authenticating players who use Steam to play Warframe, though it cannot automatically link to a Warframe Account ID.

## Detailed Findings

### 1. Warframe Official Authentication - Does Not Exist

Digital Extremes does not provide official API documentation or OAuth/SSO for third-party developers:

- No official public API with authentication exists
- The only public data is `worldState.php` (game world state) and drop tables
- No developer program or partner API access exists
- DE does not accept unsolicited ideas or provide API keys to third parties

**Key Limitation**: As of Warframe Update 38.0.8, profile endpoints now require authentication. The previous public profile endpoint (`getProfileViewingData.php`) is no longer accessible via username - it requires an internal `accountId` that cannot be obtained through official means.

**Source**: [Warframe Forums - Official API?](https://forums.warframe.com/topic/1391372-official-api/)

### 2. Unofficial Warframe API Methods (Not Recommended)

Unofficial tools exist that extract authentication credentials from game memory:

- [wf-auth-finder](https://github.com/wiktordudek/wf-auth-finder) - Extracts `accountId` and `nonce` from running game process
- [cephalon-sofis/warframe_api](https://github.com/cephalon-sofis/warframe_api) - Python library accessing internal API

**Warning**: Reverse engineering violates Warframe's Terms of Service.

### 3. Community APIs (No User Authentication)

Community-maintained APIs provide game data but NOT user authentication:

- [WarframeStatus API](https://docs.warframestat.us/) - World state, item data, drop tables
- [Warframe Community Developers (WFCD)](https://github.com/WFCD) - Item databases, parsers

These are independent of Digital Extremes with no affiliation.

### 4. Steam OpenID 2.0 (Best Fallback Option)

**How it works**:
1. Redirect users to Steam's OpenID endpoint: `https://steamcommunity.com/openid`
2. User authenticates on Steam's website
3. Steam redirects back with the user's 64-bit SteamID in the Claimed ID format

**Key Points**:
- Does NOT require partnership with Valve
- Uses OpenID 2.0 (deprecated protocol, but still functional)
- Returns only the SteamID - no direct access to game-specific data
- Free to implement with a [Steam Web API key](https://steamcommunity.com/dev/apikey)

**Libraries**:
- [passport-steam (Node.js)](https://www.npmjs.com/package/passport-steam)
- [modern-passport-steam](https://github.com/easton36/modern-passport-steam) - Fork without vulnerabilities

### 5. Getting Warframe Data via Steam API

After authenticating via OpenID, you can call Steam Web API:

| Endpoint | Purpose | Notes |
|----------|---------|-------|
| `IPlayerService/GetOwnedGames` | Get games and playtime | Use `include_played_free_games=1` (Warframe AppID: 230410) |
| `ISteamUser/GetPlayerSummaries` | Get profile info | Public profile data only |

**Critical Limitation**: You cannot get the user's Warframe Account ID from Steam. Steam only provides the Steam ID - the Warframe account is a separate system even when linked.

### 6. Steam OAuth 2.0 (Partners Only)

Full OAuth 2.0 is reserved for Steamworks Partners:
- Requires Client ID from Valve (only for Cloud sync or Workshop support)
- Not available for general third-party apps

## Current Implementation in Codebase

This codebase currently uses a **single-tenant model** with manual user identification:

**Settings Storage**:
- `packages/api/src/domain/entities/player.ts` - `PlayerSettings` interface
- `packages/api/src/infrastructure/persistence/drizzle/player-repository.ts` - Database storage
- `packages/api/src/infrastructure/persistence/drizzle/schema.ts:91-103` - `playerSettings` table

**User Interface**:
- `packages/web/src/routes/settings/+page.svelte` - Users manually enter their `playerId` and select platform

**DE Profile API**:
- `packages/api/src/infrastructure/external/de-profile-api.ts` - Fetches from DE's public profile endpoint
- `packages/shared/src/platform.ts` - Generates platform-specific profile URLs

**What Does NOT Exist**:
- No OAuth configuration
- No login/logout routes
- No JWT/token handling
- No session management

## Code References

- `packages/api/src/domain/entities/player.ts` - PlayerSettings interface
- `packages/api/src/domain/ports/profile-api.ts` - ProfileApi interface
- `packages/api/src/infrastructure/external/de-profile-api.ts` - DE profile fetcher
- `packages/shared/src/platform.ts` - Platform URL generation
- `packages/web/src/routes/settings/+page.svelte` - Settings UI
- `packages/api/src/application/http/sync.ts` - Sync routes (GET/POST /settings, POST /sync)

## Architecture Documentation

### Current Authentication Flow
1. User manually enters Warframe `playerId` in settings page
2. User selects platform (PC, PlayStation, Xbox, Switch)
3. Settings stored in `player_settings` database table
4. Sync fetches from DE's public profile endpoint using stored playerId

### Platform URL Generation
```
PC:          https://api.warframe.com/cdn/getProfileViewingData.php?playerId={playerId}
PlayStation: https://content-ps4.warframe.com/dynamic/getProfileViewingData.php?playerId={playerId}
Xbox:        https://content-xb1.warframe.com/dynamic/getProfileViewingData.php?playerId={playerId}
Switch:      https://content-swi.warframe.com/dynamic/getProfileViewingData.php?playerId={playerId}
```

## Practical Recommendation

For multi-user support, the most viable authentication approach is:

1. **Use Steam OpenID 2.0** to authenticate users and get their SteamID
2. **Call Steam Web API** with `GetOwnedGames` (include_played_free_games=1) to verify they play Warframe
3. **Require users to manually provide** their Warframe username or account ID after Steam authentication
4. **Store the association** between Steam ID and Warframe playerId in the database

The limitation is that there is no way to automatically link a Steam ID to a Warframe Account ID - users will always need to manually provide their Warframe username.

## Additional Resources

### Official Documentation
- [Steam Web API Documentation](https://steamcommunity.com/dev)
- [Steamworks Web API Overview](https://partner.steamgames.com/doc/webapi_overview)
- [Steam OpenID Endpoint](https://steamcommunity.com/openid)
- [Register for Steam API Key](https://steamcommunity.com/dev/apikey)
- [Steamworks - User Authentication and Ownership](https://partner.steamgames.com/doc/features/auth)

### Community Resources
- [WarframeStatus API Docs](https://docs.warframestat.us/)
- [Warframe Community Developers GitHub](https://github.com/WFCD)
- [AlecaFrame API Documentation](https://docs.alecaframe.com/api)
- [browse.wf Profile Viewer](https://browse.wf/profile)

### Libraries
- [passport-steam (Node.js)](https://www.npmjs.com/package/passport-steam)
- [modern-passport-steam (Node.js)](https://github.com/easton36/modern-passport-steam)
- [SteamOpenID.php](https://github.com/xPaw/SteamOpenID.php)

## Open Questions

1. Does the DE profile endpoint still work with just a username, or does it now require an accountId?
2. Would console players (PlayStation, Xbox, Switch) be able to use this at all, since they can't use Steam OAuth?
3. Is there value in reaching out to DE about a potential partner/developer program?
