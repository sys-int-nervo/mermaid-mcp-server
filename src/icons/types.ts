/**
 * Core types for the comprehensive icon support system
 */

export interface IconDefinition {
  id: string;
  name: string;
  category: string;
  tags: string[];
  svg: string;
  styles?: string[];
  orientations?: string[];
  source: string;
  license?: string;
  attribution?: string;
}

export interface IconSource {
  name: string;
  type: 'lucidchart' | 'fontawesome' | 'iconify' | 'custom';
  version: string;
  icons: IconDefinition[];
  enabled: boolean;
  config?: Record<string, any>;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  source: 'lucidchart' | 'fontawesome' | 'custom';
  cssProperties: Record<string, string>;
  iconOverrides?: Record<string, Partial<IconDefinition>>;
}

export interface OrientationDefinition {
  id: string;
  name: string;
  transform: string; // SVG transform attribute
  cssTransform?: string; // CSS transform property
}

export interface IconSearchOptions {
  query?: string;
  categories?: string[];
  tags?: string[];
  sources?: string[];
  styles?: string[];
  limit?: number;
  offset?: number;
}

export interface IconSearchResult {
  icons: IconDefinition[];
  total: number;
  hasMore: boolean;
}

export interface IconRegistryConfig {
  iconSources: IconSourceConfig[];
  themes: ThemeConfig[];
  orientations: OrientationConfig[];
  caching: CachingConfig;
  performance: PerformanceConfig;
}

export interface IconSourceConfig {
  name: string;
  type: 'lucidchart' | 'fontawesome' | 'iconify' | 'custom';
  enabled: boolean;
  version?: string;
  styles?: string[];
  categories?: string[];
  endpoint?: string;
  apiKey?: string;
  localPath?: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  source: string;
  enabled: boolean;
  customProperties?: Record<string, string>;
}

export interface OrientationConfig {
  id: string;
  name: string;
  enabled: boolean;
  transform: string;
}

export interface CachingConfig {
  enabled: boolean;
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum cache size in MB
  strategy: 'memory' | 'disk' | 'hybrid';
}

export interface PerformanceConfig {
  lazyLoading: boolean;
  bundleSize: number; // Maximum bundle size in MB
  preloadCategories: string[];
  compressionLevel: number; // 0-9, 0 = no compression
}

export interface IconRegistry {
  sources: Map<string, IconSource>;
  themes: Map<string, ThemeDefinition>;
  orientations: Map<string, OrientationDefinition>;
  iconIndex: Map<string, IconDefinition>;
  categoryIndex: Map<string, string[]>; // category -> icon IDs
  tagIndex: Map<string, string[]>; // tag -> icon IDs
}

export interface IconManagerOptions {
  config: IconRegistryConfig;
  autoLoad?: boolean;
  verbose?: boolean;
}

export interface IconLoadResult {
  success: boolean;
  loaded: number;
  failed: number;
  errors: string[];
  duration: number;
}

export interface MermaidIconExtension {
  iconId: string;
  style?: string;
  theme?: string;
  orientation?: string;
  size?: number;
  color?: string;
}

// FontAwesome specific types
export interface FontAwesomeIcon extends IconDefinition {
  style: 'solid' | 'regular' | 'light' | 'thin' | 'duotone' | 'brands';
  unicode: string;
  free: boolean;
}

// LucidChart specific types
export interface LucidChartIcon extends IconDefinition {
  theme: string;
  orientation: string;
  category: 'shapes' | 'connectors' | 'text' | 'images';
}

// Iconify specific types
export interface IconifyIcon extends IconDefinition {
  collection: string;
  width: number;
  height: number;
  viewBox?: string;
}