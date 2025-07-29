import { IconManager } from './IconManager.js';
import { IconDefinition } from './types.js';

/**
 * Integration layer between the icon system and Mermaid diagram generation
 */
export class MermaidIconIntegration {
  private iconManager: IconManager;

  constructor(iconManager: IconManager) {
    this.iconManager = iconManager;
  }

  /**
   * Preprocesses Mermaid code to replace icon references with actual SVG icons
   * Supports various icon syntaxes:
   * - icon:fa-home (FontAwesome)
   * - icon:lucid-server (LucidChart)
   * - icon:iconify-material-design:home (Iconify)
   * - icon:custom-myicon (Custom)
   */
  async preprocessMermaidCode(code: string): Promise<{
    processedCode: string;
    iconDefinitions: string;
    usedIcons: IconDefinition[];
  }> {
    const iconRegex = /icon:([a-zA-Z0-9-_:]+)/g;
    const usedIcons: IconDefinition[] = [];
    const iconDefinitions: string[] = [];
    let processedCode = code;

    // Find all icon references in the code
    const matches = Array.from(code.matchAll(iconRegex));
    
    for (const match of matches) {
      const iconRef = match[1];
      const icon = await this.resolveIconReference(iconRef);
      
      if (icon) {
        usedIcons.push(icon);
        
        // Create a unique identifier for this icon in the diagram
        const iconId = `icon-${icon.id.replace(/[^a-zA-Z0-9]/g, '-')}`;
        
        // Replace the icon reference with a Mermaid-compatible reference
        processedCode = processedCode.replace(
          match[0], 
          this.generateMermaidIconReference(iconId, icon)
        );
        
        // Add the icon definition for injection into HTML
        iconDefinitions.push(this.generateIconDefinition(iconId, icon));
      } else {
        // Keep the original reference if icon not found
        console.warn(`Icon not found: ${iconRef}`);
      }
    }

    return {
      processedCode,
      iconDefinitions: iconDefinitions.join('\n'),
      usedIcons,
    };
  }

  /**
   * Resolves an icon reference to an actual icon definition
   */
  private async resolveIconReference(iconRef: string): Promise<IconDefinition | null> {
    // Handle different icon reference formats
    if (iconRef.startsWith('fa-')) {
      // FontAwesome: fa-home, fa-solid-home, fa-brands-github
      return await this.resolveFontAwesomeIcon(iconRef);
    } else if (iconRef.startsWith('lucid-')) {
      // LucidChart: lucid-server, lucid-database
      return await this.resolveLucidChartIcon(iconRef);
    } else if (iconRef.includes(':')) {
      // Iconify format: material-design:home, heroicons:home
      return await this.resolveIconifyIcon(iconRef);
    } else {
      // Try to find by name across all sources
      const searchResult = await this.iconManager.searchIcons({
        query: iconRef,
        limit: 1,
      });
      return searchResult.icons[0] || null;
    }
  }

  private async resolveFontAwesomeIcon(iconRef: string): Promise<IconDefinition | null> {
    // Parse FontAwesome reference: fa-home, fa-solid-home, fa-brands-github
    const parts = iconRef.split('-');
    let style = 'solid';
    let iconName = iconRef.substring(3); // Remove 'fa-'

    if (parts.length > 2 && ['solid', 'regular', 'brands', 'light', 'thin'].includes(parts[1])) {
      style = parts[1];
      iconName = parts.slice(2).join('-');
    }

    const searchResult = await this.iconManager.searchIcons({
      query: iconName,
      sources: ['fontawesome'],
      styles: [style],
      limit: 1,
    });

    return searchResult.icons[0] || null;
  }

  private async resolveLucidChartIcon(iconRef: string): Promise<IconDefinition | null> {
    const iconName = iconRef.substring(6); // Remove 'lucid-'
    
    const searchResult = await this.iconManager.searchIcons({
      query: iconName,
      sources: ['lucidchart'],
      limit: 1,
    });

    return searchResult.icons[0] || null;
  }

  private async resolveIconifyIcon(iconRef: string): Promise<IconDefinition | null> {
    const [collection, iconName] = iconRef.split(':', 2);
    
    const searchResult = await this.iconManager.searchIcons({
      query: iconName,
      sources: ['iconify'],
      categories: [collection],
      limit: 1,
    });

    return searchResult.icons[0] || null;
  }

  /**
   * Generates a Mermaid-compatible icon reference
   * For architecture diagrams and other diagram types that support icons
   */
  private generateMermaidIconReference(iconId: string, icon: IconDefinition): string {
    // For architecture diagrams, we can use the icon directly
    // For other diagram types, we might need to use a different approach
    return `<use href="#${iconId}"/>`;
  }

  /**
   * Generates SVG icon definition for injection into HTML
   */
  private generateIconDefinition(iconId: string, icon: IconDefinition): string {
    // Extract the SVG content and create a reusable symbol
    const svgContent = icon.svg;
    
    // Parse the SVG to extract the path/content
    const svgMatch = svgContent.match(/<svg[^>]*>(.*?)<\/svg>/s);
    if (!svgMatch) {
      return '';
    }

    const innerSvg = svgMatch[1];
    
    return `
      <symbol id="${iconId}" viewBox="0 0 24 24">
        ${innerSvg}
      </symbol>
    `;
  }

  /**
   * Generates the complete SVG defs section for all used icons
   */
  generateSvgDefs(iconDefinitions: string): string {
    if (!iconDefinitions.trim()) {
      return '';
    }

    return `
      <defs>
        ${iconDefinitions}
      </defs>
    `;
  }

  /**
   * Generates CSS styles for icon integration
   */
  generateIconStyles(): string {
    return `
      <style>
        .mermaid-icon {
          width: 1em;
          height: 1em;
          display: inline-block;
          vertical-align: middle;
        }
        
        .icon-small { width: 0.8em; height: 0.8em; }
        .icon-medium { width: 1.2em; height: 1.2em; }
        .icon-large { width: 1.6em; height: 1.6em; }
        
        /* Architecture diagram specific styles */
        .architecture-icon {
          width: 2em;
          height: 2em;
        }
      </style>
    `;
  }

  /**
   * Enhanced Mermaid configuration with icon support
   */
  generateMermaidConfig(theme: string = 'default'): any {
    return {
      theme,
      startOnLoad: false,
      securityLevel: 'loose',
      logLevel: 5,
      // Enable architecture diagrams with icon support
      architecture: {
        iconPack: 'custom',
        icons: {
          // Icons will be dynamically added here
        },
      },
      // Custom renderer for icon integration
      htmlLabels: true,
      flowchart: {
        htmlLabels: true,
      },
    };
  }
}