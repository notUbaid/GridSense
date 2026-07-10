import { processBatch } from './src/lib/extractor';

async function run() {
  try {
    console.log("Running test with Gemini...");
    const headers = ["First Name", "Reach Number"];
    const rows = [
      { "First Name": "Arjun", "Reach Number": "92803 66864" }
    ];
    const res = await processBatch(headers, rows, "gemini", [], []);
    console.log("Success:", JSON.stringify(res, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}

run();
