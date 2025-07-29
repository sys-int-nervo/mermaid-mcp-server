#!/usr/bin/env node

/**
 * Icon build script for the Mermaid MCP Server
 * Prepares icon assets and validates the icon system
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function buildIcons() {
  console.log('🔧 Building icon assets...');

  try {
    // Ensure icon directories exist
    const iconDirs = [
      'src/icons/sources',
      'src/icons/registry',
      'src/themes',
      'dist/icons'
    ];

    for (const dir of iconDirs) {
      const fullPath = path.join(projectRoot, dir);
      try {
        await fs.access(fullPath);
        console.log(`✓ Directory exists: ${dir}`);
      } catch {
        await fs.mkdir(fullPath, { recursive: true });
        console.log(`✓ Created directory: ${dir}`);
      }
    }

    // Validate icon configuration
    console.log('📝 Validating icon configuration...');
    
    try {
      const configPath = path.join(projectRoot, 'src/icons/config.ts');
      const configContent = await fs.readFile(configPath, 'utf-8');
      
      if (configContent.includes('DEFAULT_ICON_CONFIG')) {
        console.log('✓ Icon configuration is valid');
      } else {
        throw new Error('Invalid icon configuration');
      }
    } catch (error) {
      console.error('❌ Icon configuration validation failed:', error.message);
      process.exit(1);
    }

    // Create icon cache directory
    const cacheDir = path.join(projectRoot, 'dist/icons/cache');
    try {
      await fs.mkdir(cacheDir, { recursive: true });
      console.log('✓ Created icon cache directory');
    } catch (error) {
      console.warn('⚠️  Could not create cache directory:', error.message);
    }

    // Generate icon manifest
    console.log('📋 Generating icon manifest...');
    const manifest = {
      version: '1.0.0',
      buildTime: new Date().toISOString(),
      sources: {
        fontawesome: {
          enabled: true,
          styles: ['solid', 'regular', 'brands'],
          version: '6.5.0'
        },
        iconify: {
          enabled: true,
          collections: ['material-design-icons', 'heroicons', 'lucide']
        },
        lucidchart: {
          enabled: true,
          builtInIcons: ['server', 'database', 'disk', 'cloud', 'internet']
        },
        custom: {
          enabled: true,
          directory: 'custom-icons'
        }
      },
      features: {
        iconPreprocessing: true,
        svgGeneration: true,
        themeSupport: true,
        orientationSupport: true
      }
    };

    const manifestPath = path.join(projectRoot, 'dist/icons/manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✓ Generated icon manifest');

    // Create example icon usage documentation
    const exampleUsage = `# Icon Usage Examples

## FontAwesome Icons
\`\`\`mermaid
architecture-beta
    service web(server)[Web Server icon:fa-server]
    service db(database)[Database icon:fa-database]
    service cache(disk)[Cache icon:fa-solid-memory]
\`\`\`

## LucidChart Icons
\`\`\`mermaid
architecture-beta
    service web(server)[Web icon:lucid-server]
    service data(database)[Data icon:lucid-database]
    service storage(disk)[Storage icon:lucid-disk]
\`\`\`

## Mixed Icons
\`\`\`mermaid
flowchart TD
    A[Start icon:fa-play] --> B{Decision icon:lucid-diamond}
    B -->|Yes| C[Process icon:fa-cog]
    B -->|No| D[End icon:fa-stop]
\`\`\`

## Iconify Collections
\`\`\`mermaid
graph LR
    A[Home icon:material-design:home] --> B[Settings icon:heroicons:cog]
    B --> C[User icon:lucide:user]
\`\`\`
`;

    const examplesPath = path.join(projectRoot, 'dist/icons/examples.md');
    await fs.writeFile(examplesPath, exampleUsage);
    console.log('✓ Generated icon usage examples');

    // Validate TypeScript files
    console.log('🔍 Validating TypeScript icon files...');
    const tsFiles = [
      'src/icons/types.ts',
      'src/icons/IconManager.ts',
      'src/icons/MermaidIconIntegration.ts',
      'src/icons/config.ts'
    ];

    for (const file of tsFiles) {
      try {
        await fs.access(path.join(projectRoot, file));
        console.log(`✓ ${file} exists`);
      } catch {
        console.error(`❌ Missing required file: ${file}`);
        process.exit(1);
      }
    }

    console.log('\n🎉 Icon build completed successfully!');
    console.log(`📊 Build summary:`);
    console.log(`   - Icon sources: 4 (FontAwesome, Iconify, LucidChart, Custom)`);
    console.log(`   - Features: Icon preprocessing, SVG generation, theme support`);
    console.log(`   - Manifest: ${manifestPath}`);
    console.log(`   - Examples: ${examplesPath}`);

  } catch (error) {
    console.error('❌ Icon build failed:', error.message);
    process.exit(1);
  }
}

buildIcons().catch(console.error);