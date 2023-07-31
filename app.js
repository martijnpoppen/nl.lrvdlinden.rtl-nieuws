'use strict';
const Homey = require('homey');
const Parser = require('rss-parser');

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

        this.triggerNewArticle = this.homey.flow.getTriggerCard('new_article');
        this.triggerNewVideoNieuws = this.homey.flow.getTriggerCard('new_video_nieuws');
        this.triggerNewVideoWeer = this.homey.flow.getTriggerCard('new_video_weer');
        this.condThereIsArticle = this.homey.flow.getConditionCard('there_is_article');
        this.condThereIsRtlNieuwsVideo = this.homey.flow.getConditionCard('there_is_rtl_nieuws_video');
        this.condThereIsRtlWeerVideo = this.homey.flow.getConditionCard('there_is_rtl_weer_video');

        this.receivedArticleLink = null;
        this.receivedVideoUrls = new Set(); // Een Set om de ontvangen videolinks bij te houden

        this.checkInterval = 5 * 60 * 1000; // 5 minutes
        this.parser = new Parser();
        this.feedUrl = 'https://www.rtlnieuws.nl/rss.xml';

        setInterval(async () => {
            this.checkRssFeed();
        }, this.checkInterval);

        this.checkRssFeed();
    }

    async checkRssFeed() {
        try {
            const feed = await this.parser.parseURL(this.feedUrl);

            if (feed && feed.items && feed.items.length) {
                let [latestItem] = feed.items;

                if (latestItem.title && (latestItem.title.includes('RTL Nieuws') || latestItem.title.includes('RTL Weer'))) {
                    this.log(`[checkRssFeed] - skip latestItem due to containing RTL in title:`, latestItem.title);
                    [, latestItem] = feed.items;
                }

                this.log(`[checkRssFeed] - got latestItem:`, latestItem);
                const { title, link, content, pubDate, enclosure } = latestItem;
                const imageUrl = enclosure.url || "";
                const data = {
                    title,
                    link,
                    content,
                    pubDate,
                    imageUrl
                };
                
                this.log(`[checkRssFeed] - trigger new article Data:`, data);

                // Check if the latest item is from RTL Nieuws or RTL Weer
                if (latestItem.title.includes('RTL Nieuws') || latestItem.title.includes('RTL Weer')) {
                    // Controleer of de link al eerder is ontvangen
                    if (!this.receivedArticleLink || this.receivedArticleLink !== latestItem.link) {
                        // Update de link met het laatste ontvangen artikel
                        this.receivedArticleLink = latestItem.link;

                        this.triggerNewArticle.trigger(data).catch((err) => this.error('[checkRssFeed] - Error in triggerNewArticle', err));
                    }
                }

                // Check if the latest item is from RTL Nieuws
                if (latestItem.title.includes('RTL Nieuws')) {
                    // Controleer of de link al eerder is ontvangen
                    if (!this.receivedVideoUrls.has(latestItem.link)) {
                        // Voeg de link toe aan de Set
                        this.receivedVideoUrls.add(latestItem.link);

                        this.log(`[checkRssFeed] - trigger new video from RTL Nieuws Data:`, latestItem.link);
                        this.triggerNewVideoNieuws.trigger({ url: latestItem.link }).catch((err) => this.error('[checkRssFeed] - Error in triggerNewVideoNieuws', err));
                    }
                }

                // Check if the latest item is from RTL Weer
                if (latestItem.title.includes('RTL Weer')) {
                    // Controleer of de link al eerder is ontvangen
                    if (!this.receivedVideoUrls.has(latestItem.link)) {
                        // Voeg de link toe aan de Set
                        this.receivedVideoUrls.add(latestItem.link);

                        this.log(`[checkRssFeed] - trigger new video from RTL Weer Data:`, latestItem.link);
                        this.triggerNewVideoWeer.trigger({ url: latestItem.link }).catch((err) => this.error('[checkRssFeed] - Error in triggerNewVideoWeer', err));
                    }
                }
            }
        } catch (err) {
            this.error(`[checkRssFeed] - Error in retrieving RSS-feed:`, err);
        }
    }
}

module.exports = RtlNieuwsApp;
