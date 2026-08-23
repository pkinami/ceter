(async () => {
  const { chromium } = await import("playwright");

  const browser = await chromium.connectOverCDP(
    "http://localhost:9222"
  );

  console.log("Connected to Chrome");

  const contexts = browser.contexts();

  for (const context of contexts) {

    const pages = context.pages();

    for (const page of pages) {

      console.log("------------------------");
      console.log("Title:", await page.title());
      console.log("URL:", page.url());

    }
  }

})();
