import { BaseLoader, IconLoaderResult } from './BaseLoader.js';
import { IconDefinition, IconifyIcon, IconSource } from '../types.js';

/**
 * Iconify icon loader
 * Loads icons from the Iconify API or local collections
 */
export class IconifyLoader extends BaseLoader {
  private readonly ICONIFY_API = 'https://api.iconify.design';

  async load(): Promise<IconLoaderResult> {
    let loaded = 0;
    let failed = 0;
    const errors: string[] = [];
    const icons: IconDefinition[] = [];

    try {
      this.log(`Loading Iconify icons from collections: ${this.config.categories?.join(', ') || 'all'}`);

      // Get collections to load
      const collections = this.config.categories || ['material-design-icons', 'heroicons', 'lucide'];

      for (const collection of collections) {
        try {
          this.log(`Loading collection: ${collection}`);
          const collectionIcons = await this.loadCollection(collection);
          icons.push(...collectionIcons);
          loaded += collectionIcons.length;
        } catch (error) {
          const errorMsg = `Failed to load collection ${collection}: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          this.log(errorMsg);
          failed++;
        }
      }

      const source: IconSource = {
        name: this.config.name,
        type: 'iconify',
        version: this.config.version || '1.0.0',
        icons,
        enabled: true,
        config: {
          collections,
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
      const errorMsg = `Critical error in Iconify loader: ${error instanceof Error ? error.message : String(error)}`;
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

  private async loadCollection(collection: string): Promise<IconDefinition[]> {
    const url = `${this.ICONIFY_API}/collection?prefix=${collection}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseCollectionData(data, collection);
    } catch (error) {
      // Fallback to built-in icon list
      this.log(`API failed for ${collection}, using fallback icons`);
      return this.getFallbackIcons(collection);
    }
  }

  private parseCollectionData(data: any, collection: string): IconDefinition[] {
    const icons: IconDefinition[] = [];

    if (data.icons) {
      for (const [iconName, iconData] of Object.entries(data.icons)) {
        try {
          const icon = this.createIconFromIconifyData(iconName, iconData as any, collection, data);
          icons.push(icon);
        } catch (error) {
          this.log(`Failed to parse icon ${iconName}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    return icons;
  }

  private createIconFromIconifyData(name: string, iconData: any, collection: string, collectionData: any): IconDefinition {
    const { body, width = 24, height = 24, viewBox } = iconData;
    
    const svg = `<svg viewBox="${viewBox || `0 0 ${width} ${height}`}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
    const sanitizedSvg = this.sanitizeSvg(svg);

    return {
      id: this.createIconId(`${collection}-${name}`),
      name,
      category: this.getCategoryForCollection(collection),
      tags: this.generateTags(name, collection),
      svg: sanitizedSvg,
      source: this.config.name,
      license: collectionData.license || 'Various',
      attribution: collectionData.author || 'Iconify Community',
    };
  }

  private getCategoryForCollection(collection: string): string {
    const categoryMap: Record<string, string> = {
      'material-design-icons': 'material',
      'heroicons': 'interface',
      'lucide': 'interface',
      'feather': 'interface',
      'tabler': 'interface',
      'carbon': 'interface',
      'phosphor': 'interface',
      'ant-design': 'interface',
      'bootstrap': 'interface',
      'dashicons': 'interface',
      'octicon': 'interface',
    };

    return categoryMap[collection] || 'general';
  }

  private generateTags(name: string, collection: string): string[] {
    const baseTags = [
      'iconify',
      collection,
      ...name.split('-'),
    ];

    return this.normalizeTags(baseTags);
  }

  private getFallbackIcons(collection: string): IconDefinition[] {
    // Fallback icons for when API is unavailable
    const fallbackIcons: Record<string, any[]> = {
      'material-design-icons': [
        { name: 'home', body: '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>' },
        { name: 'search', body: '<path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>' },
        { name: 'menu', body: '<path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>' },
      ],
      'heroicons': [
        { name: 'home', body: '<path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>' },
        { name: 'user', body: '<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/>' },
        { name: 'envelope', body: '<path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/>' },
      ],
      'lucide': [
        { name: 'home', body: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>' },
        { name: 'search', body: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>' },
        { name: 'user', body: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
      ],
    };

    const icons = fallbackIcons[collection] || [];
    return icons.map(iconData => this.createIconFromIconifyData(iconData.name, iconData, collection, {}));
  }
}