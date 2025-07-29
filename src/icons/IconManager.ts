import {
  IconDefinition,
  IconSource,
  IconRegistry,
  IconManagerOptions,
  IconLoadResult,
  IconSearchOptions,
  IconSearchResult,
  ThemeDefinition,
  OrientationDefinition,
  IconRegistryConfig,
} from './types.js';
import { FontAwesomeLoader } from './sources/FontAwesomeLoader.js';
import { IconifyLoader } from './sources/IconifyLoader.js';
import { LucidChartLoader } from './sources/LucidChartLoader.js';
import { CustomIconLoader } from './sources/CustomIconLoader.js';

/**
 * Central icon management system for the MCP server
 * Handles loading, caching, and serving icons from multiple sources
 */
export class IconManager {
  private registry: IconRegistry;
  private options: IconManagerOptions;
  private loadPromise: Promise<IconLoadResult> | null = null;
  private cache: Map<string, any> = new Map();

  constructor(options: IconManagerOptions) {
    this.options = options;
    this.registry = {
      sources: new Map(),
      themes: new Map(),
      orientations: new Map(),
      iconIndex: new Map(),
      categoryIndex: new Map(),
      tagIndex: new Map(),
    };

    if (options.autoLoad) {
      this.loadIcons();
    }
  }

  /**
   * Load all configured icon sources
   */
  async loadIcons(): Promise<IconLoadResult> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this._performLoad();
    return this.loadPromise;
  }

  private async _performLoad(): Promise<IconLoadResult> {
    const startTime = Date.now();
    let totalLoaded = 0;
    let totalFailed = 0;
    const errors: string[] = [];

    this.log('Starting icon loading process...');

    try {
      // Load themes first
      await this.loadThemes();
      
      // Load orientations
      await this.loadOrientations();

      // Load icons from each configured source
      for (const sourceConfig of this.options.config.iconSources) {
        if (!sourceConfig.enabled) {
          this.log(`Skipping disabled source: ${sourceConfig.name}`);
          continue;
        }

        try {
          this.log(`Loading icons from ${sourceConfig.name} (${sourceConfig.type})...`);
          const result = await this.loadFromSource(sourceConfig);
          totalLoaded += result.loaded;
          totalFailed += result.failed;
          errors.push(...result.errors);
        } catch (error) {
          const errorMsg = `Failed to load from ${sourceConfig.name}: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          this.log(errorMsg);
          totalFailed++;
        }
      }

      // Build search indices
      this.buildIndices();

      const duration = Date.now() - startTime;
      const result: IconLoadResult = {
        success: totalFailed === 0,
        loaded: totalLoaded,
        failed: totalFailed,
        errors,
        duration,
      };

      this.log(`Icon loading completed: ${totalLoaded} loaded, ${totalFailed} failed, ${duration}ms`);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = `Critical error during icon loading: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      this.log(errorMsg);

      return {
        success: false,
        loaded: totalLoaded,
        failed: totalFailed + 1,
        errors,
        duration,
      };
    }
  }

  private async loadFromSource(sourceConfig: any): Promise<IconLoadResult> {
    let loader;

    switch (sourceConfig.type) {
      case 'fontawesome':
        loader = new FontAwesomeLoader(sourceConfig);
        break;
      case 'iconify':
        loader = new IconifyLoader(sourceConfig);
        break;
      case 'lucidchart':
        loader = new LucidChartLoader(sourceConfig);
        break;
      case 'custom':
        loader = new CustomIconLoader(sourceConfig);
        break;
      default:
        throw new Error(`Unknown icon source type: ${sourceConfig.type}`);
    }

    const result = await loader.load();
    
    if (result.success && result.source) {
      this.registry.sources.set(sourceConfig.name, result.source);
      
      // Add icons to the main index
      for (const icon of result.source.icons) {
        this.registry.iconIndex.set(icon.id, icon);
      }
    }

    // Convert IconLoaderResult to IconLoadResult by adding duration
    return {
      ...result,
      duration: 0, // Duration is tracked at the higher level
    };
  }

  private async loadThemes(): Promise<void> {
    this.log('Loading themes...');
    
    for (const themeConfig of this.options.config.themes) {
      if (!themeConfig.enabled) continue;

      const theme: ThemeDefinition = {
        id: themeConfig.id,
        name: themeConfig.name,
        description: `Theme from ${themeConfig.source}`,
        source: themeConfig.source as any,
        cssProperties: themeConfig.customProperties || {},
      };

      this.registry.themes.set(theme.id, theme);
    }
  }

  private async loadOrientations(): Promise<void> {
    this.log('Loading orientations...');
    
    for (const orientationConfig of this.options.config.orientations) {
      if (!orientationConfig.enabled) continue;

      const orientation: OrientationDefinition = {
        id: orientationConfig.id,
        name: orientationConfig.name,
        transform: orientationConfig.transform,
      };

      this.registry.orientations.set(orientation.id, orientation);
    }
  }

  private buildIndices(): void {
    this.log('Building search indices...');
    
    // Clear existing indices
    this.registry.categoryIndex.clear();
    this.registry.tagIndex.clear();

    // Build category and tag indices
    for (const [iconId, icon] of this.registry.iconIndex) {
      // Category index
      if (!this.registry.categoryIndex.has(icon.category)) {
        this.registry.categoryIndex.set(icon.category, []);
      }
      this.registry.categoryIndex.get(icon.category)!.push(iconId);

      // Tag index
      for (const tag of icon.tags) {
        if (!this.registry.tagIndex.has(tag)) {
          this.registry.tagIndex.set(tag, []);
        }
        this.registry.tagIndex.get(tag)!.push(iconId);
      }
    }
  }

  /**
   * Search for icons based on various criteria
   */
  async searchIcons(options: IconSearchOptions): Promise<IconSearchResult> {
    const {
      query,
      categories = [],
      tags = [],
      sources = [],
      styles = [],
      limit = 50,
      offset = 0,
    } = options;

    let candidates: Set<string> = new Set();

    // If no filters specified, include all icons
    if (!query && categories.length === 0 && tags.length === 0 && sources.length === 0 && styles.length === 0) {
      candidates = new Set(this.registry.iconIndex.keys());
    } else {
      // Filter by categories
      if (categories.length > 0) {
        for (const category of categories) {
          const categoryIcons = this.registry.categoryIndex.get(category) || [];
          categoryIcons.forEach(id => candidates.add(id));
        }
      }

      // Filter by tags
      if (tags.length > 0) {
        const tagCandidates = new Set<string>();
        for (const tag of tags) {
          const tagIcons = this.registry.tagIndex.get(tag) || [];
          tagIcons.forEach(id => tagCandidates.add(id));
        }
        
        if (candidates.size === 0) {
          candidates = tagCandidates;
        } else {
          candidates = new Set([...candidates].filter(id => tagCandidates.has(id)));
        }
      }

      // Filter by sources
      if (sources.length > 0) {
        const sourceCandidates = new Set<string>();
        for (const sourceName of sources) {
          const source = this.registry.sources.get(sourceName);
          if (source) {
            source.icons.forEach(icon => sourceCandidates.add(icon.id));
          }
        }

        if (candidates.size === 0) {
          candidates = sourceCandidates;
        } else {
          candidates = new Set([...candidates].filter(id => sourceCandidates.has(id)));
        }
      }
    }

    // Apply text search if query provided
    let results: IconDefinition[] = [];
    for (const iconId of candidates) {
      const icon = this.registry.iconIndex.get(iconId);
      if (!icon) continue;

      if (query) {
        const searchText = `${icon.name} ${icon.tags.join(' ')} ${icon.category}`.toLowerCase();
        if (!searchText.includes(query.toLowerCase())) {
          continue;
        }
      }

      // Filter by styles
      if (styles.length > 0 && icon.styles) {
        const hasMatchingStyle = styles.some(style => icon.styles!.includes(style));
        if (!hasMatchingStyle) continue;
      }

      results.push(icon);
    }

    // Sort results by relevance (name match first, then tag matches)
    if (query) {
      results.sort((a, b) => {
        const aNameMatch = a.name.toLowerCase().includes(query.toLowerCase());
        const bNameMatch = b.name.toLowerCase().includes(query.toLowerCase());
        
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        
        return a.name.localeCompare(b.name);
      });
    } else {
      results.sort((a, b) => a.name.localeCompare(b.name));
    }

    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      icons: paginatedResults,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get a specific icon by ID
   */
  getIcon(id: string): IconDefinition | undefined {
    return this.registry.iconIndex.get(id);
  }

  /**
   * Get all available categories
   */
  getCategories(): string[] {
    return Array.from(this.registry.categoryIndex.keys()).sort();
  }

  /**
   * Get all available tags
   */
  getTags(): string[] {
    return Array.from(this.registry.tagIndex.keys()).sort();
  }

  /**
   * Get all available themes
   */
  getThemes(): ThemeDefinition[] {
    return Array.from(this.registry.themes.values());
  }

  /**
   * Get all available orientations
   */
  getOrientations(): OrientationDefinition[] {
    return Array.from(this.registry.orientations.values());
  }

  /**
   * Get statistics about loaded icons
   */
  getStats() {
    return {
      totalIcons: this.registry.iconIndex.size,
      totalSources: this.registry.sources.size,
      totalCategories: this.registry.categoryIndex.size,
      totalTags: this.registry.tagIndex.size,
      totalThemes: this.registry.themes.size,
      totalOrientations: this.registry.orientations.size,
    };
  }

  /**
   * Clear all cached data and reload
   */
  async reload(): Promise<IconLoadResult> {
    this.log('Reloading icon registry...');
    
    // Clear existing data
    this.registry.sources.clear();
    this.registry.themes.clear();
    this.registry.orientations.clear();
    this.registry.iconIndex.clear();
    this.registry.categoryIndex.clear();
    this.registry.tagIndex.clear();
    this.cache.clear();
    
    // Reset load promise to force reload
    this.loadPromise = null;
    
    return this.loadIcons();
  }

  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`[IconManager] ${message}`);
    }
  }
}