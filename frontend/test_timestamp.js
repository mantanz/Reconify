// Test file to verify timestamp parsing
import { parseISTTimestamp } from './src/utils.js';

// Test cases with 24-hour format (backend format)
const testCases = [
  "24-07-2025 16:01:00",  // Should show as 4:01 PM
  "24-07-2025 02:30:00",  // Should show as 2:30 AM
  "24-07-2025 14:30:00",  // Should show as 2:30 PM
  "24-07-2025 00:30:00",  // Should show as 12:30 AM
];

console.log("Testing 24-hour format parsing:");
testCases.forEach(testCase => {
  console.log(`${testCase} -> ${parseISTTimestamp(testCase)}`);
}); 