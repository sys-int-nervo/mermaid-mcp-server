#!/usr/bin/env node

/**
 * Test script for icon integration in Mermaid diagrams
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const testCases = [
  {
    name: 'FontAwesome Icons',
    code: `
architecture-beta
    group api(cloud)[API Layer]
    service server(server)[Web Server icon:fa-server]
    service db(database)[Database icon:fa-database]
    service cache(disk)[Cache icon:fa-solid-memory]
    
    server:R --> db:L
    server:R --> cache:L
    `,
    expected: ['fa-server', 'fa-database', 'fa-solid-memory']
  },
  {
    name: 'LucidChart Icons',
    code: `
architecture-beta
    group infra(cloud)[Infrastructure]
    service web(server)[Web icon:lucid-server]
    service data(database)[Data icon:lucid-database]
    service storage(disk)[Storage icon:lucid-disk]
    
    web:R --> data:L
    web:R --> storage:L
    `,
    expected: ['lucid-server', 'lucid-database', 'lucid-disk']
  },
  {
    name: 'Mixed Icons',
    code: `
flowchart TD
    A[Start icon:fa-play] --> B{Decision icon:lucid-diamond}
    B -->|Yes| C[Process icon:fa-cog]
    B -->|No| D[End icon:fa-stop]
    C --> D
    `,
    expected: ['fa-play', 'lucid-diamond', 'fa-cog', 'fa-stop']
  }
];

async function testIconIntegration() {
  console.log('🧪 Testing Icon Integration...\n');
  
  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    console.log(`Expected icons: ${testCase.expected.join(', ')}`);
    
    try {
      const result = await generateDiagram(testCase.code, `test-${testCase.name.toLowerCase().replace(/\s+/g, '-')}`);
      console.log(`✅ ${testCase.name}: Generated successfully`);
      console.log(`   Output: ${result}\n`);
    } catch (error) {
      console.log(`❌ ${testCase.name}: Failed`);
      console.log(`   Error: ${error.message}\n`);
    }
  }
}

function generateDiagram(code, filename) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      error += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(error || `Process exited with code ${code}`));
      }
    });

    // Send the MCP request
    const request = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'generate',
        arguments: {
          code: code,
          theme: 'default',
          outputFormat: 'png',
          name: filename,
          folder: './test-output'
        }
      }
    });

    child.stdin.write(request + '\n');
    child.stdin.end();

    // Set timeout
    setTimeout(() => {
      child.kill();
      reject(new Error('Test timeout'));
    }, 30000);
  });
}

// Ensure test output directory exists
if (!fs.existsSync('./test-output')) {
  fs.mkdirSync('./test-output');
}

testIconIntegration().catch(console.error);