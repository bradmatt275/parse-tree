#!/usr/bin/env node

/**
 * Generate test JSON files for performance testing
 * Usage: node scripts/generate-test-data.js [size] [output]
 * 
 * Examples:
 *   node scripts/generate-test-data.js           # Default: generates small, medium, and large files
 *   node scripts/generate-test-data.js 20        # 20MB to examples/test-large.json
 *   node scripts/generate-test-data.js 5 custom  # 5MB to examples/test-custom.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample data generators
const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Support', 'Research'];
const statuses = ['active', 'inactive', 'pending', 'archived'];
const tags = ['urgent', 'important', 'review', 'approved', 'draft', 'final', 'confidential'];

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePerson(id) {
  return {
    id: `user_${id}`,
    firstName: randomItem(firstNames),
    lastName: randomItem(lastNames),
    email: `user${id}@example.com`,
    age: randomInt(22, 65),
    department: randomItem(departments),
    salary: randomInt(40000, 150000),
    isActive: Math.random() > 0.3,
    joinDate: new Date(Date.now() - randomInt(0, 365 * 5) * 24 * 60 * 60 * 1000).toISOString(),
  };
}

function generateProject(id) {
  return {
    projectId: `proj_${id}`,
    name: `Project ${id}`,
    status: randomItem(statuses),
    budget: randomInt(10000, 1000000),
    startDate: new Date(Date.now() - randomInt(0, 730) * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + randomInt(0, 365) * 24 * 60 * 60 * 1000).toISOString(),
    tags: Array.from({ length: randomInt(1, 3) }, () => randomItem(tags)),
    team: Array.from({ length: randomInt(3, 8) }, (_, i) => ({
      memberId: `user_${randomInt(1, 1000)}`,
      role: randomItem(['lead', 'developer', 'designer', 'tester', 'analyst']),
      allocation: randomInt(25, 100),
    })),
    milestones: Array.from({ length: randomInt(2, 5) }, (_, i) => ({
      name: `Milestone ${i + 1}`,
      dueDate: new Date(Date.now() + randomInt(-30, 180) * 24 * 60 * 60 * 1000).toISOString(),
      completed: Math.random() > 0.5,
    })),
  };
}

function generateDocument(id) {
  return {
    docId: `doc_${id}`,
    title: `Document ${id}`,
    content: `This is the content of document ${id}. `.repeat(randomInt(5, 15)),
    author: `user_${randomInt(1, 1000)}`,
    createdAt: new Date(Date.now() - randomInt(0, 365) * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - randomInt(0, 30) * 24 * 60 * 60 * 1000).toISOString(),
    version: randomInt(1, 10),
    tags: Array.from({ length: randomInt(0, 4) }, () => randomItem(tags)),
    metadata: {
      pageCount: randomInt(1, 100),
      wordCount: randomInt(100, 10000),
      language: randomItem(['en', 'es', 'fr', 'de', 'zh']),
      isPublic: Math.random() > 0.5,
    },
  };
}

function generateTestFile(targetSizeMB, outputPath, showHeader = true) {
  if (showHeader) {
    console.log(`Generating ${targetSizeMB}MB test JSON file...`);
  }

  // Generate data in chunks to avoid memory issues
  const targetBytes = targetSizeMB * 1024 * 1024;
  let currentSize = 0;
  let currentId = 1;

  const data = {
    meta: {
      generatedAt: new Date().toISOString(),
      targetSize: `${targetSizeMB}MB`,
      generator: 'generate-test-data.js',
      version: '1.0.0',
    },
    users: [],
    projects: [],
    documents: [],
  };

  // Estimate size and generate data
  while (currentSize < targetBytes * 0.95) {
    // Add users (smaller objects)
    for (let i = 0; i < 100; i++) {
      data.users.push(generatePerson(currentId++));
    }
    
    // Add projects (medium objects)
    for (let i = 0; i < 50; i++) {
      data.projects.push(generateProject(currentId++));
    }
    
    // Add documents (larger objects)
    for (let i = 0; i < 30; i++) {
      data.documents.push(generateDocument(currentId++));
    }
    
    // Estimate current size
    currentSize = JSON.stringify(data).length;
    
    // Show progress
    if (showHeader) {
      const progress = Math.min(100, (currentSize / targetBytes) * 100).toFixed(1);
      process.stdout.write(`\rProgress: ${progress}% (${(currentSize / 1024 / 1024).toFixed(2)}MB)`);
    }
  }

  if (showHeader) {
    console.log('\n\nWriting to file...');
  }

  // Ensure examples directory exists
  const examplesDir = path.dirname(outputPath);
  if (!fs.existsSync(examplesDir)) {
    fs.mkdirSync(examplesDir, { recursive: true });
  }

  // Write to file with formatting
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  const finalSize = fs.statSync(outputPath).size;
  const finalSizeMB = (finalSize / 1024 / 1024).toFixed(2);

  if (showHeader) {
    console.log(`\n✅ Success!`);
  }
  console.log(`   Output: ${path.basename(outputPath)}`);
  console.log(`   Size: ${finalSizeMB}MB`);
  console.log(`   Users: ${data.users.length}`);
  console.log(`   Projects: ${data.projects.length}`);
  console.log(`   Documents: ${data.documents.length}`);
  console.log(`   Total records: ${data.users.length + data.projects.length + data.documents.length}`);
}

// Parse command line arguments and execute
const targetSizeMB = parseFloat(process.argv[2]);
const outputName = process.argv[3];

// Default test suite configuration
const defaultSizes = [
  { size: 0.1, name: 'test-small', label: 'Small (100KB)' },
  { size: 1, name: 'test-medium', label: 'Medium (1MB)' },
  { size: 19, name: 'test-large', label: 'Large (19MB)' }
];

// If size specified, generate single file
if (targetSizeMB) {
  const outputPath = path.join(__dirname, '..', 'examples', `${outputName || 'test-large'}.json`);
  generateTestFile(targetSizeMB, outputPath);
} else {
  // Generate default test suite
  console.log('Generating test file suite...\n');
  for (const config of defaultSizes) {
    const outputPath = path.join(__dirname, '..', 'examples', `${config.name}.json`);
    console.log(`📦 ${config.label}`);
    generateTestFile(config.size, outputPath, false);
    console.log('');
  }
  console.log('✅ All test files generated successfully!');
}
