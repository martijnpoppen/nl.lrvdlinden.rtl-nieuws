'use strict';
const Homey = require('homey');
const Parser = require('rss-parser'); // Zorg ervoor dat je deze bibliotheek hebt geïnstalleerd via npm

class RtlNieuwsApp extends Homey.App {
    log() {
        console.log.bind(this, '[log]').apply(this, arguments);
    }

    error() {
        console.error.bind(this, '[error]').apply(this, arguments);
    }

    // -------------------- INIT ----------------------

    onInit() {
        this.log(`[onInit] ${this.homey.manifest.id} - ${this.homey.manifest.version} started...`);

        // Register flow Trigger
        this.triggerNewArticle = this.homey.flow.getTriggerCard('new_article');

        // Definieer het interval om de RSS-feed te controleren (bijvoorbeeld elke 5 minuten)
        this.checkInterval = 5 * 60 * 1000; // 5 minuten in milliseconden

        this.checkRssFeed();
    }

    async checkRssFeed() {
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
                    this.triggerNewArticle
                        .trigger({
                            article_title: title,
                            article_text: text,
                            article_url: url
                        })
                        .catch((err) => this.error('Error in triggerNewArticle', err));

                    this.log(`Nieuw bericht: ${title}`);
                }
            } catch (err) {
                this.error(`Error in retrieving RSS-feed:`, err);
            }
        }, this.checkInterval);
    }
}

module.exports = RtlNieuwsApp;
