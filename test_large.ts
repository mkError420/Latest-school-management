import fetch from 'node-fetch';

async function testLargePayload() {
  try {
    console.log("Adding Notice with large base64 payload...");
    // create a 1MB payload
    const largeStr = 'a'.repeat(1024 * 1024);
    
    const postRes = await fetch('http://localhost:3000/api/website/notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Large News',
        content: 'This is a test large news',
        date: '2026-05-14',
        attachmentUrl: `data:image/png;base64,${largeStr}`
      })
    });
    console.log("POST res status:", postRes.status);
    console.log("POST res output:", await postRes.text());
  } catch(e) {
    console.error("Error:", e);
  }
}
testLargePayload();
