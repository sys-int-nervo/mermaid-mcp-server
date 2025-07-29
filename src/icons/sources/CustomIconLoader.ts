import { BaseLoader, IconLoaderResult } from './BaseLoader.js';
import { IconDefinition, IconSource } from '../types.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Custom icon loader
 * Loads custom SVG icons from local directories or user uploads
 */
export class CustomIconLoader extends BaseLoader {
  async load(): Promise<IconLoaderResult> {
    let loaded = 0;
    let failed = 0;
    const errors: string[] = [];
    const icons: IconDefinition[] = [];

    try {
      this.log('Loading custom icons...');

      if (this.config.localPath) {
        const customIcons = await this.loadFromDirectory(this.config.localPath);
        icons.push(...customIcons);
        loaded += customIcons.length;
      }

      const source: IconSource = {
        name: this.config.name,
        type: 'custom',
        version: this.config.version || '1.0.0',
        icons,
        enabled: true,
        config: {
          localPath: this.config.localPath,
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
      const errorMsg = `Critical error in Custom loader: ${error instanceof Error ? error.message : String(error)}`;
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

  private async loadFromDirectory(dirPath: string): Promise<IconDefinition[]> {
    const icons: IconDefinition[] = [];

    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const file of files) {
        if (file.isFile() && file.name.endsWith('.svg')) {
          try {
            const iconPath = path.join(dirPath, file.name);
            const svgContent = await fs.readFile(iconPath, 'utf-8');
            const iconName = path.basename(file.name, '.svg');
            
            const icon = this.createCustomIcon(iconName, svgContent);
            icons.push(icon);
          } catch (error) {
            this.log(`Failed to load ${file.name}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to read directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
    }

    return icons;
  }

  private createCustomIcon(name: string, svgContent: string): IconDefinition {
    const sanitizedSvg = this.sanitizeSvg(svgContent);
    
    return {
      id: this.createIconId(name),
      name,
      category: 'custom',
      tags: this.normalizeTags(['custom', ...name.split('-')]),
      svg: sanitizedSvg,
      source: this.config.name,
      license: 'Custom',
      attribution: 'Custom Icon',
    };
  }
}