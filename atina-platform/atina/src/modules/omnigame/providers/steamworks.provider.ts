import { config } from '../../../config';

export type SteamworksStatus = {
  status: 'configured' | 'n/a';
  reason: string;
  store_api_url: string;
};

export function getSteamworksStatus(): SteamworksStatus {
  const key = config.steam.webApiKey.trim();
  if (!key) {
    return {
      status: 'n/a',
      reason:
        'STEAM_WEB_API_KEY not configured — Steamworks publish deferred per CEO matrix (use SCRAPER_* for trend validation only)',
      store_api_url: 'https://store.steampowered.com',
    };
  }
  return {
    status: 'configured',
    reason: 'Steam Web API key present; full Steamworks SDK publish still requires partner app credentials',
    store_api_url: 'https://partner.steam-api.com',
  };
}
