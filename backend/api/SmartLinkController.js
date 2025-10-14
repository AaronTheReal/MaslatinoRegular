// controllers/SmartLinkController.js
export default class SmartLinkController {
  static async redirectPodcastLink(req, res) {
    const { podcastId, episodeId } = req.params;
    const userAgent = req.get('User-Agent') || '';
    const isMobile = /android|iphone|ipad|ipod/i.test(userAgent);

    const appDeepLink = `maslatino://podcast/${podcastId}/episodio/${episodeId}`;
    const webFallback = `https://maslatinonetwork.com/podcast/${podcastId}/episodio/${episodeId}`;
    const playStore = 'https://play.google.com/store/apps/details?id=com.maslatino.app';
    const appStore = 'https://apps.apple.com/mx/app/mas-latino/id6698865116';

    if (isMobile) {
      if (/android/i.test(userAgent)) {
        // Intent para Android
        res.redirect(`intent://${appDeepLink.replace('://', '/')}#Intent;scheme=maslatino;package=com.maslatino.app;S.browser_fallback_url=${encodeURIComponent(webFallback)};end`);
      } else if (/iphone|ipad/i.test(userAgent)) {
        // iOS lo mandamos directo al App Store (no hay intents)
        res.redirect(appStore);
      } else {
        res.redirect(webFallback);
      }
    } else {
      res.redirect(webFallback);
    }
  }
}
