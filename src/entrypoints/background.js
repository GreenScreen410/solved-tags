export default defineBackground({
  include: ['chrome'],
  main() {
    // Chrome applies manifest content scripts on navigation. Also attach the
    // toolbar to existing solved.ac tabs, which can change profiles in place.
    browser.runtime.onInstalled.addListener(async ({ reason }) => {
      if (reason !== 'install' && reason !== 'update') return;

      const toolbar = browser.runtime.getManifest().content_scripts.find(script => !script.all_frames);
      const tabs = await browser.tabs.query({ url: toolbar.matches, discarded: false });
      // A tab can close or leave solved.ac between the query and injection.
      await Promise.allSettled(tabs.map(async tab => {
        const target = { tabId: tab.id };
        await browser.scripting.insertCSS({ target, files: toolbar.css });
        await browser.scripting.executeScript({ target, files: toolbar.js });
      }));
    });
  },
});
