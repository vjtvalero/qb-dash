import { Service } from '@/types';

export const services: Service[] = [
  { id: 'jellyfin',       name: 'Jellyfin',      url: 'http://jellyfin.lan',              category: 'Media',          healthCheck: true  },
  { id: 'jellyseerr',     name: 'Jellyseerr',    url: 'http://jellyseerr.lan',            category: 'Media',          healthCheck: true  },
  { id: 'sonarr',         name: 'Sonarr',        url: 'http://sonarr.lan',                category: 'Media',          healthCheck: true  },
  { id: 'radarr',         name: 'Radarr',        url: 'http://radarr.lan',                category: 'Media',          healthCheck: true  },
  { id: 'bazarr',         name: 'Bazarr',        url: 'http://bazarr.lan',                category: 'Media',          healthCheck: true  },
  { id: 'prowlarr',       name: 'Prowlarr',      url: 'http://prowlarr.lan',              category: 'Media',          healthCheck: true  },
  { id: 'qbittorrent',    name: 'qBittorrent',   url: 'http://qbittorrent.lan',           category: 'Media',          healthCheck: true  },
  { id: 'n8n',            name: 'n8n',           url: 'http://n8n.lan',                   category: 'Automation',     healthCheck: true  },
  { id: 'n8n-ai-flask',   name: 'AI Flask',      url: 'http://192.168.254.253:5054',      category: 'Automation',     healthCheck: false },
  { id: 'n8n-ai-flask-2', name: 'AI Flask 2',    url: 'http://192.168.254.253:5056',      category: 'Automation',     healthCheck: false },
  { id: 'traefik',        name: 'Traefik',       url: 'http://192.168.254.253:8080',      category: 'Infrastructure', healthCheck: true  },
];

export const categories = ['Media', 'Automation', 'Infrastructure'] as const;
