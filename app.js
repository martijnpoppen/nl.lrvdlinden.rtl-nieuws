'use strict';
const Homey = require('homey');
const Parser = require('rss-parser'); // Zorg ervoor dat je deze bibliotheek hebt geïnstalleerd via npm

class RtlNieuwsApp extends Homey.App {
  async onInit() {
    this.log('RTL Nieuws app is gestart');

    // Registreer de trigger-kaart
    this.triggerNieuwBericht = new Homey.FlowCardTrigger('nieuw_bericht')
      .register();

    // Definieer het interval om de RSS-feed te controleren (bijvoorbeeld elke 5 minuten)
    const checkInterval = 5 * 60 * 1000; // 5 minuten in milliseconden

    // Start het interval om de RSS-feed te controleren
    this.checkRssFeed(checkInterval);
  }

  async checkRssFeed(interval) {
    const parser = new Parser();
    const feedUrl = 'https://www.rtlnieuws.nl/rss.xml';

    setInterval(async () => {
      try {
        const feed = await parser.parseURL(feedUrl);

        if (feed && feed.items && feed.items.length > 0) {
          // Haal de meest recente nieuwsbericht op
          const latestItem = feed.items[0];

          // Haal de relevante informatie van het nieuwsbericht op
          const title = latestItem.title;
          const text = latestItem.contentSnippet;
          const url = latestItem.link;

          // Stuur de informatie door als tokens bij de trigger-kaart
          this.triggerNieuwBericht.trigger({
            article_title: title,
            article_text: text,
            article_url: url,
          });

          this.log(`Nieuw bericht: ${title}`);
        }
      } catch (error) {
        this.error(`Fout bij ophalen van RSS-feed: ${error}`);
      }
    }, interval);
  }
}

module.exports = RtlNieuwsApp;
