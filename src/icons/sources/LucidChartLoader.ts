import { BaseLoader, IconLoaderResult } from './BaseLoader.js';
import { IconDefinition, LucidChartIcon, IconSource } from '../types.js';

/**
 * LucidChart icon loader
 * Loads LucidChart-compatible iconpacks, themes, and orientations
 */
export class LucidChartLoader extends BaseLoader {
  async load(): Promise<IconLoaderResult> {
    let loaded = 0;
    let failed = 0;
    const errors: string[] = [];
    const icons: IconDefinition[] = [];

    try {
      this.log('Loading LucidChart-compatible icons...');

      // Load built-in LucidChart icons
      const builtInIcons = this.getBuiltInIcons();
      icons.push(...builtInIcons);
      loaded += builtInIcons.length;

      // TODO: Implement loading from Icons8 plugin format
      // TODO: Implement loading from Iconify integration
      // TODO: Implement theme and orientation support

      const source: IconSource = {
        name: this.config.name,
        type: 'lucidchart',
        version: this.config.version || '1.0.0',
        icons,
        enabled: true,
        config: {
          themes: ['default', 'dark', 'colorful'],
          orientations: ['normal', 'rotated-90', 'rotated-180', 'rotated-270'],
        },
      };

      return {
        success: failed === 0,
        loaded,
        failed,
        errors,
        source,
      };

    } catch (error) {
      const errorMsg = `Critical error in LucidChart loader: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      this.log(errorMsg);

      return {
        success: false,
        loaded,
        failed: failed + 1,
        errors,
      };
    }
  }

  private getBuiltInIcons(): IconDefinition[] {
    // Built-in LucidChart icons as mentioned in research
    const builtInIcons = [
      {
        name: 'cloud',
        category: 'infrastructure',
        tags: ['cloud', 'server', 'hosting'],
        svg: '<svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>',
      },
      {
        name: 'database',
        category: 'data',
        tags: ['database', 'storage', 'data'],
        svg: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
      },
      {
        name: 'disk',
        category: 'storage',
        tags: ['disk', 'storage', 'drive'],
        svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>',
      },
      {
        name: 'internet',
        category: 'network',
        tags: ['internet', 'web', 'global'],
        svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
      },
      {
        name: 'server',
        category: 'infrastructure',
        tags: ['server', 'computer', 'hardware'],
        svg: '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="4" rx="1" ry="1"/><rect x="2" y="9" width="20" height="4" rx="1" ry="1"/><rect x="2" y="15" width="20" height="4" rx="1" ry="1"/><line x1="6" y1="5" x2="6.01" y2="5"/><line x1="6" y1="11" x2="6.01" y2="11"/><line x1="6" y1="17" x2="6.01" y2="17"/></svg>',
      },
    ];

    return builtInIcons.map(icon => ({
      id: this.createIconId(icon.name),
      name: icon.name,
      category: icon.category,
      tags: this.normalizeTags(icon.tags),
      svg: this.sanitizeSvg(icon.svg),
      styles: ['default'],
      orientations: ['normal'],
      source: this.config.name,
      license: 'LucidChart Compatible',
      attribution: 'LucidChart Built-in Icons',
    }));
  }
}