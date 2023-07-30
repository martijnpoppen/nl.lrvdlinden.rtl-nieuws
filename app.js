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
            // Loop through all the news items
            for (const item of feed.items) {
              // Get the relevant information from the news item
              const title = item.title;
              const link = item.link;
              const description = item.description;
              const pubDate = item.pubDate;

              // Send the information as tokens to the trigger card
              this.triggerNieuwBericht.trigger({
                article_title: title,
                article_link: link,
                article_description: description,
                article_pubDate: pubDate,
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
