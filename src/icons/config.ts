import { IconRegistryConfig } from './types.js';

/**
 * Default configuration for the icon system
 */
export const DEFAULT_ICON_CONFIG: IconRegistryConfig = {
  iconSources: [
    {
      name: 'fontawesome',
      type: 'fontawesome',
      enabled: true,
      version: '6.5.0',
      styles: ['solid', 'regular', 'brands'],
      categories: ['interface', 'communication', 'brands'],
    },
    {
      name: 'iconify',
      type: 'iconify',
      enabled: true,
      version: '1.0.0',
      categories: ['material-design-icons', 'heroicons', 'lucide'],
    },
    {
      name: 'lucidchart',
      type: 'lucidchart',
      enabled: true,
      version: '1.0.0',
      categories: ['infrastructure', 'data', 'network'],
    },
    {
      name: 'custom',
      type: 'custom',
      enabled: false, // Disabled by default, enable when custom icons are available
      version: '1.0.0',
      localPath: './custom-icons',
    },
  ],
  themes: [
    {
      id: 'default',
      name: 'Default',
      source: 'system',
      enabled: true,
      customProperties: {
        '--icon-color': 'currentColor',
        '--icon-size': '24px',
      },
    },
    {
      id: 'dark',
      name: 'Dark Theme',
      source: 'system',
      enabled: true,
      customProperties: {
        '--icon-color': '#ffffff',
        '--icon-size': '24px',
        '--icon-background': '#333333',
      },
    },
    {
      id: 'colorful',
      name: 'Colorful Theme',
      source: 'lucidchart',
      enabled: true,
      customProperties: {
        '--icon-color': 'var(--primary-color)',
        '--icon-size': '24px',
        '--icon-shadow': '0 2px 4px rgba(0,0,0,0.1)',
      },
    },
  ],
  orientations: [
    {
      id: 'normal',
      name: 'Normal',
      enabled: true,
      transform: '',
    },
    {
      id: 'rotate-90',
      name: 'Rotate 90°',
      enabled: true,
      transform: 'rotate(90deg)',
    },
    {
      id: 'rotate-180',
      name: 'Rotate 180°',
      enabled: true,
      transform: 'rotate(180deg)',
    },
    {
      id: 'rotate-270',
      name: 'Rotate 270°',
      enabled: true,
      transform: 'rotate(270deg)',
    },
    {
      id: 'flip-horizontal',
      name: 'Flip Horizontal',
      enabled: true,
      transform: 'scaleX(-1)',
    },
    {
      id: 'flip-vertical',
      name: 'Flip Vertical',
      enabled: true,
      transform: 'scaleY(-1)',
    },
  ],
  caching: {
    enabled: true,
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 50, // 50MB
    strategy: 'memory',
  },
  performance: {
    lazyLoading: true,
    bundleSize: 10, // 10MB max bundle size
    preloadCategories: ['interface', 'communication'],
    compressionLevel: 6,
  },
};

/**
 * Environment-specific configuration overrides
 */
export function getIconConfig(): IconRegistryConfig {
  const config = { ...DEFAULT_ICON_CONFIG };

  // Apply environment-specific overrides
  if (process.env.ICON_CACHE_DISABLED === 'true') {
    config.caching.enabled = false;
  }

  if (process.env.ICON_LAZY_LOADING === 'false') {
    config.performance.lazyLoading = false;
  }

  if (process.env.FONTAWESOME_API_KEY) {
    const faSource = config.iconSources.find(s => s.name === 'fontawesome');
    if (faSource) {
      faSource.apiKey = process.env.FONTAWESOME_API_KEY;
      // Enable Pro styles if API key is available
      faSource.styles = ['solid', 'regular', 'light', 'thin', 'duotone', 'brands'];
    }
  }

  if (process.env.CUSTOM_ICONS_PATH) {
    const customSource = config.iconSources.find(s => s.name === 'custom');
    if (customSource) {
      customSource.enabled = true;
      customSource.localPath = process.env.CUSTOM_ICONS_PATH;
    }
  }

  return config;
}