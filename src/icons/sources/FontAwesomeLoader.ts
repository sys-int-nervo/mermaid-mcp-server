import { BaseLoader, IconLoaderResult } from './BaseLoader.js';
import { IconDefinition, FontAwesomeIcon, IconSource } from '../types.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * FontAwesome icon loader
 * Supports loading from local files, CDN, or API
 */
export class FontAwesomeLoader extends BaseLoader {
  private readonly FONTAWESOME_STYLES = ['solid', 'regular', 'light', 'thin', 'duotone', 'brands'] as const;
  private readonly FREE_STYLES = ['solid', 'regular', 'brands'] as const;

  async load(): Promise<IconLoaderResult> {
    const startTime = Date.now();
    let loaded = 0;
    let failed = 0;
    const errors: string[] = [];
    const icons: IconDefinition[] = [];

    try {
      this.log(`Loading FontAwesome icons (version: ${this.config.version || 'latest'})`);

      // Determine which styles to load
      const stylesToLoad = this.config.styles || ['solid', 'regular', 'brands'];
      const validStyles = stylesToLoad.filter(style => 
        this.FONTAWESOME_STYLES.includes(style as any)
      );

      if (validStyles.length === 0) {
        throw new Error('No valid FontAwesome styles specified');
      }

      // Load icons for each style
      for (const style of validStyles) {
        try {
          this.log(`Loading ${style} style icons...`);
          const styleIcons = await this.loadStyle(style);
          icons.push(...styleIcons);
          loaded += styleIcons.length;
        } catch (error) {
          const errorMsg = `Failed to load ${style} style: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          this.log(errorMsg);
          failed++;
        }
      }

      const source: IconSource = {
        name: this.config.name,
        type: 'fontawesome',
        version: this.config.version || '6.5.0',
        icons,
        enabled: true,
        config: {
          styles: validStyles,
          freeOnly: !this.config.apiKey, // Assume free version if no API key
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
      const errorMsg = `Critical error in FontAwesome loader: ${error instanceof Error ? error.message : String(error)}`;
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

  private async loadStyle(style: string): Promise<IconDefinition[]> {
    // Try different loading methods in order of preference
    if (this.config.localPath) {
      return this.loadFromLocal(style);
    } else if (this.config.endpoint) {
      return this.loadFromAPI(style);
    } else {
      return this.loadFromCDN(style);
    }
  }

  private async loadFromLocal(style: string): Promise<IconDefinition[]> {
    if (!this.config.localPath) {
      throw new Error('Local path not specified');
    }

    const stylePath = path.join(this.config.localPath, `${style}.json`);
    
    try {
      const content = await fs.readFile(stylePath, 'utf-8');
      const data = JSON.parse(content);
      return this.parseIconData(data, style);
    } catch (error) {
      // Try SVG directory approach
      return this.loadFromSVGDirectory(style);
    }
  }

  private async loadFromSVGDirectory(style: string): Promise<IconDefinition[]> {
    if (!this.config.localPath) {
      throw new Error('Local path not specified');
    }

    const svgDir = path.join(this.config.localPath, 'svgs', style);
    
    try {
      const files = await fs.readdir(svgDir);
      const svgFiles = files.filter(file => file.endsWith('.svg'));
      const icons: IconDefinition[] = [];

      for (const file of svgFiles) {
        try {
          const iconName = path.basename(file, '.svg');
          const svgPath = path.join(svgDir, file);
          const svgContent = await fs.readFile(svgPath, 'utf-8');
          
          const icon = this.createIconFromSVG(iconName, svgContent, style);
          icons.push(icon);
        } catch (error) {
          this.log(`Failed to load ${file}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return icons;
    } catch (error) {
      throw new Error(`Failed to read SVG directory ${svgDir}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async loadFromAPI(style: string): Promise<IconDefinition[]> {
    if (!this.config.endpoint) {
      throw new Error('API endpoint not specified');
    }

    const url = `${this.config.endpoint}/icons/${style}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    try {
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseIconData(data, style);
    } catch (error) {
      throw new Error(`API request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async loadFromCDN(style: string): Promise<IconDefinition[]> {
    // For CDN loading, we'll use a predefined list of common FontAwesome icons
    // In a real implementation, you might want to fetch this from a more comprehensive source
    const commonIcons = this.getCommonIconsForStyle(style);
    const icons: IconDefinition[] = [];

    for (const iconData of commonIcons) {
      try {
        const icon = this.createIconFromMetadata(iconData, style);
        icons.push(icon);
      } catch (error) {
        this.log(`Failed to create icon ${iconData.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return icons;
  }

  private parseIconData(data: any, style: string): IconDefinition[] {
    const icons: IconDefinition[] = [];

    // Handle different data formats
    if (data.icons) {
      // Standard FontAwesome format
      for (const [iconName, iconData] of Object.entries(data.icons)) {
        try {
          const icon = this.createIconFromData(iconName, iconData as any, style);
          icons.push(icon);
        } catch (error) {
          this.log(`Failed to parse icon ${iconName}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } else if (Array.isArray(data)) {
      // Array format
      for (const iconData of data) {
        try {
          const icon = this.createIconFromData(iconData.name, iconData, style);
          icons.push(icon);
        } catch (error) {
          this.log(`Failed to parse icon ${iconData.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    return icons;
  }

  private createIconFromSVG(name: string, svgContent: string, style: string): IconDefinition {
    const sanitizedSvg = this.sanitizeSvg(svgContent);
    const { width, height } = this.extractViewBox(sanitizedSvg);

    return {
      id: this.createIconId(name, style),
      name,
      category: this.getCategoryForStyle(style),
      tags: this.generateTags(name, style),
      svg: sanitizedSvg,
      styles: [style],
      source: this.config.name,
      license: 'FontAwesome License',
      attribution: 'FontAwesome by Fonticons, Inc.',
    };
  }

  private createIconFromData(name: string, data: any, style: string): IconDefinition {
    // Extract SVG from data
    let svg = '';
    
    if (data.svg) {
      svg = data.svg;
    } else if (data.path) {
      // Create SVG from path data
      const viewBox = data.viewBox || '0 0 512 512';
      svg = `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg"><path d="${data.path}"/></svg>`;
    } else {
      throw new Error(`No SVG data found for icon ${name}`);
    }

    const sanitizedSvg = this.sanitizeSvg(svg);

    return {
      id: this.createIconId(name, style),
      name,
      category: this.getCategoryForStyle(style),
      tags: this.generateTags(name, style, data.tags),
      svg: sanitizedSvg,
      styles: [style],
      source: this.config.name,
      license: 'FontAwesome License',
      attribution: 'FontAwesome by Fonticons, Inc.',
    };
  }

  private createIconFromMetadata(metadata: any, style: string): IconDefinition {
    const { name, category, tags, unicode } = metadata;
    
    // For CDN loading, we create a placeholder SVG that can be loaded dynamically
    const svg = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8z" fill="currentColor"/>
      <text x="256" y="280" text-anchor="middle" font-family="FontAwesome" font-size="200" fill="white">${String.fromCharCode(parseInt(unicode, 16))}</text>
    </svg>`;

    return {
      id: this.createIconId(name, style),
      name,
      category: category || this.getCategoryForStyle(style),
      tags: this.normalizeTags([...this.generateTags(name, style), ...(tags || [])]),
      svg: this.sanitizeSvg(svg),
      styles: [style],
      source: this.config.name,
      license: 'FontAwesome License',
      attribution: 'FontAwesome by Fonticons, Inc.',
    };
  }

  private getCategoryForStyle(style: string): string {
    const categoryMap: Record<string, string> = {
      solid: 'interface',
      regular: 'interface',
      light: 'interface',
      thin: 'interface',
      duotone: 'interface',
      brands: 'brands',
    };

    return categoryMap[style] || 'general';
  }

  private generateTags(name: string, style: string, additionalTags: string[] = []): string[] {
    const baseTags = [
      'fontawesome',
      `fa-${style}`,
      style,
      ...name.split('-'),
      ...additionalTags,
    ];

    return this.normalizeTags(baseTags);
  }

  private getCommonIconsForStyle(style: string): any[] {
    // This is a simplified list - in a real implementation, you'd want a more comprehensive list
    const commonIcons: Record<string, any[]> = {
      solid: [
        { name: 'home', category: 'interface', tags: ['house', 'main'], unicode: 'f015' },
        { name: 'user', category: 'people', tags: ['person', 'profile'], unicode: 'f007' },
        { name: 'envelope', category: 'communication', tags: ['email', 'mail'], unicode: 'f0e0' },
        { name: 'phone', category: 'communication', tags: ['call', 'telephone'], unicode: 'f095' },
        { name: 'search', category: 'interface', tags: ['find', 'magnify'], unicode: 'f002' },
        { name: 'heart', category: 'interface', tags: ['love', 'favorite'], unicode: 'f004' },
        { name: 'star', category: 'interface', tags: ['rating', 'favorite'], unicode: 'f005' },
        { name: 'check', category: 'interface', tags: ['approve', 'confirm'], unicode: 'f00c' },
        { name: 'times', category: 'interface', tags: ['close', 'delete'], unicode: 'f00d' },
        { name: 'plus', category: 'interface', tags: ['add', 'create'], unicode: 'f067' },
      ],
      regular: [
        { name: 'home', category: 'interface', tags: ['house', 'main'], unicode: 'f015' },
        { name: 'user', category: 'people', tags: ['person', 'profile'], unicode: 'f007' },
        { name: 'envelope', category: 'communication', tags: ['email', 'mail'], unicode: 'f0e0' },
        { name: 'heart', category: 'interface', tags: ['love', 'favorite'], unicode: 'f004' },
        { name: 'star', category: 'interface', tags: ['rating', 'favorite'], unicode: 'f005' },
      ],
      brands: [
        { name: 'github', category: 'brands', tags: ['git', 'code'], unicode: 'f09b' },
        { name: 'twitter', category: 'brands', tags: ['social', 'x'], unicode: 'f099' },
        { name: 'facebook', category: 'brands', tags: ['social'], unicode: 'f09a' },
        { name: 'google', category: 'brands', tags: ['search'], unicode: 'f1a0' },
        { name: 'linkedin', category: 'brands', tags: ['professional', 'social'], unicode: 'f08c' },
        { name: 'youtube', category: 'brands', tags: ['video', 'social'], unicode: 'f167' },
        { name: 'instagram', category: 'brands', tags: ['photo', 'social'], unicode: 'f16d' },
      ],
    };

    return commonIcons[style] || [];
  }
}