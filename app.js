'use strict';
const Homey = require('homey');
const Parser = require('rss-parser');
const fetch = require('node-fetch');

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
        this.triggerNewVideoRtlZ = this.homey.flow.getTriggerCard('new_video_rtlz');
        this.condThereIsRtlZVideo = this.homey.flow.getConditionCard('there_is_rtl_z_video');
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

    async setImage(imagePath = null) {
        try {
            if (!this._image) {
                this._imageSet = false;
                this._image = await this.homey.images.createImage();

                this.log(`[setImage] - Registering Device image`);
            }

            await this._image.setStream(async (stream) => {
                    this.homey.app.log(`[setImage] - Setting image - `, imagePath);

                    let res = await fetch(imagePath);
                    return res.body.pipe(stream);
            });

            return Promise.resolve(true);
        } catch (e) {
            this.homey.app.error(e);
            return Promise.reject(e);
        }
    }

    async checkRssFeed() {
        try {
            const feed = await this.parser.parseURL(this.feedUrl);

            if (feed && feed.items && feed.items.length) {
                let [latestItem] = feed.items;

                if (latestItem.title && (latestItem.title.includes('RTL Nieuws') || latestItem.title.includes('RTL Weer'))) {
                    this.log(`[checkRssFeed] - skip latestItem due to containing RTL in title:`, latestItem.title);
                    [, latestItem] = feed.items;
                    console.log();
                }

                this.log(`[checkRssFeed] - got latestItem:`, latestItem);

                this.triggerFlows(latestItem);
            }
        } catch (err) {
            this.error(`[checkRssFeed] - Error in retrieving RSS-feed:`, err);
        }
    }

    async triggerFlows(latestItem) {
        const { title, link, content, pubDate, enclosure } = latestItem;
        const imageUrl = enclosure.url || '';

        await this.setImage(imageUrl);

        const data = {
            title,
            link,
            content,
            pubDate,
            imageUrl,
            image: this._image
        };

        

        if (pubDate !== this.lastTriggeredPubDate) {
            this.log(`[checkRssFeed] - trigger new article Data:`, data);
            this.triggerNewArticle.trigger(data).catch((err) => this.error('[checkRssFeed] - Error in triggerNewArticle', err));

            // Update the lastTriggeredPubDate with the current pubDate
            this.lastTriggeredPubDate = pubDate;
        } else {
            this.log(`[checkRssFeed] - Article already triggered, skipping...`);
        }
        // Check if the latest item is from RTL Nieuws
        if (title.includes('RTL Nieuws')) {
            // Controleer of de link al eerder is ontvangen
            if (!this.receivedVideoUrls.has(link)) {
                // Voeg de link toe aan de Set
                this.receivedVideoUrls.add(link);

                this.log(`[checkRssFeed] - trigger new video from RTL Nieuws Data:`, link);
                this.triggerNewVideoNieuws.trigger({ url: link }).catch((err) => this.error('[checkRssFeed] - Error in triggerNewVideoNieuws', err));
            }
        }

        // Check if the latest item is from RTL Weer
        if (title.includes('RTL Weer')) {
            // Controleer of de link al eerder is ontvangen
            if (!this.receivedVideoUrls.has(link)) {
                // Voeg de link toe aan de Set
                this.receivedVideoUrls.add(link);

                this.log(`[checkRssFeed] - trigger new video from RTL Weer Data:`, link);
                this.triggerNewVideoWeer.trigger({ url: link }).catch((err) => this.error('[checkRssFeed] - Error in triggerNewVideoWeer', err));
            }
        }
        // Check if the latest item is from RTL Z
        if (title.includes('RTL Z')) {
            // Controleer of de link al eerder is ontvangen
            if (!this.receivedVideoUrls.has(link)) {
                // Voeg de link toe aan de Set
                this.receivedVideoUrls.add(link);

                this.log(`[checkRssFeed] - trigger new video from RTL Z Data:`, link);
                this.triggerNewVideoRtlZ.trigger({ url: link }).catch((err) => this.error('[checkRssFeed] - Error in triggerNewVideoRtlZ', err));
            }
        }
    }
}

module.exports = RtlNieuwsApp;
