import { IconSource, IconLoadResult, IconSourceConfig } from '../types.js';

/**
 * Base interface for all icon loaders
 */
export interface IconLoader {
  load(): Promise<IconLoaderResult>;
}

export interface IconLoaderResult extends Omit<IconLoadResult, 'duration'> {
  source?: IconSource;
}

/**
 * Abstract base class for icon loaders
 */
export abstract class BaseLoader implements IconLoader {
  protected config: IconSourceConfig;

  constructor(config: IconSourceConfig) {
    this.config = config;
  }

  abstract load(): Promise<IconLoaderResult>;

  protected log(message: string): void {
    console.log(`[${this.constructor.name}] ${message}`);
  }

  protected createIconId(name: string, style?: string): string {
    const prefix = this.config.name.toLowerCase();
    const styleSuffix = style ? `-${style}` : '';
    return `${prefix}-${name}${styleSuffix}`;
  }

  protected sanitizeSvg(svg: string): string {
    // Basic SVG sanitization - remove scripts, event handlers, etc.
    return svg
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:text\/html/gi, '')
      .trim();
  }

  protected extractViewBox(svg: string): { width: number; height: number; viewBox?: string } {
    const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
    const widthMatch = svg.match(/width="([^"]+)"/);
    const heightMatch = svg.match(/height="([^"]+)"/);

    if (viewBoxMatch) {
      const [, , , width, height] = viewBoxMatch[1].split(' ').map(Number);
      return { width, height, viewBox: viewBoxMatch[1] };
    }

    return {
      width: widthMatch ? parseFloat(widthMatch[1]) : 24,
      height: heightMatch ? parseFloat(heightMatch[1]) : 24
    };
  }

  protected normalizeCategory(category: string): string {
    return category.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  protected normalizeTags(tags: string[]): string[] {
    return tags
      .map(tag => tag.toLowerCase().trim())
      .filter(tag => tag.length > 0)
      .filter((tag, index, array) => array.indexOf(tag) === index); // Remove duplicates
  }
}