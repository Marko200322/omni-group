#!/usr/bin/env node
/**
 * CI gate for Jest JSON output (handles forceExit exit code 1 when tests passed).
 */
import fs from 'node:fs';

const resultsPath = process.argv[2] || 'jest-results.json';

if (!fs.existsSync(resultsPath)) {
  console.error(`missing ${resultsPath}`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
} catch (err) {
  console.error(`invalid JSON in ${resultsPath}:`, err.message);
  process.exit(1);
}

const failedTests = report.numFailedTests || 0;
const failedSuites = report.numFailedTestSuites || 0;
const passedTests = report.numPassedTests || 0;
const passedSuites = report.numPassedTestSuites || 0;

if (failedTests > 0 || failedSuites > 0) {
  console.error(`Jest failed: ${failedTests} tests, ${failedSuites} suites`);
  for (const suite of report.testResults || []) {
    if (suite.status === 'failed' || (suite.numFailingTests || 0) > 0) {
      console.error(`  SUITE ${suite.name}`);
      for (const test of suite.assertionResults || []) {
        if (test.status === 'failed') {
          console.error(`    FAIL ${test.fullName || test.title}`);
          for (const msg of test.failureMessages || []) {
            console.error(msg.split('\n').slice(0, 12).join('\n'));
          }
        }
      }
    }
  }
  process.exit(1);
}

if (passedTests < 1) {
  console.error(`No passed tests in ${resultsPath} (passed=${passedTests})`);
  process.exit(1);
}

console.log(`Jest OK: ${passedTests} passed, ${passedSuites} suites`);
process.exit(0);
