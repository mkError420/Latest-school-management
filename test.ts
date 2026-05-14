import fetch from 'node-fetch';

async function test() {
  try {
    console.log("Adding Notice...");
    const postRes = await fetch('http://localhost:3000/api/website/notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test News',
        content: 'This is a test news',
        date: '2026-05-14'
      })
    });
    console.log("POST res status:", postRes.status);
    console.log("POST res output:", await postRes.text());

    console.log("\nFetching Notices...");
    const getRes = await fetch('http://localhost:3000/api/website/notices');
    console.log("GET res status:", getRes.status);
    console.log("GET res output:", await getRes.text());
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
