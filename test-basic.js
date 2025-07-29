#!/usr/bin/env node

/**
 * Basic test for MCP server functionality
 */

import { spawn } from 'child_process';

function testBasicFunctionality() {
  return new Promise((resolve, reject) => {
    console.log('🧪 Testing basic MCP server functionality...');
    
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
      if (output.includes('Mermaid MCP Server running on stdio')) {
        console.log('✅ Server starts successfully');
        resolve(true);
      } else {
        console.log('❌ Server failed to start');
        console.log('Output:', output);
        console.log('Error:', error);
        reject(new Error('Server startup failed'));
      }
    });

    // Send a basic request to test the server
    const request = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    });

    child.stdin.write(request + '\n');
    
    // Give it time to start and respond
    setTimeout(() => {
      child.kill();
    }, 5000);
  });
}

testBasicFunctionality().catch(console.error);