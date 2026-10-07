import { Actor, log } from 'apify';
import type { ActorInput } from './types.js';
import { normalizeInput } from './input.js';
import { fetchHtml } from './http.js';
import { collect } from './runner.js';

await Actor.init();
try {
    const input = normalizeInput((await Actor.getInput<ActorInput>()) ?? {});
    const proxyInput = input.proxyConfiguration;
    const proxy = (proxyInput?.useApifyProxy || proxyInput?.proxyUrls?.length)
        ? await Actor.createProxyConfiguration(proxyInput) : undefined;
    const charging = Actor.getChargingManager();
    const summary = await collect(input, {
        fetch: (url, timeout) => fetchHtml(url, async () => proxy ? await proxy.newUrl() : undefined, timeout),
        push: row => Actor.pushData(row, 'product-scraped'),
        canCharge: () => !charging.getPricingInfo().isPayPerEvent
            || charging.calculateMaxEventChargeCountWithinLimit('product-scraped') > 0,
    });
    await Actor.setValue('OUTPUT', summary);
    await Actor.setStatusMessage(`${summary.status}: ${summary.results} priced products; ${summary.failedPages} failed pages`);
    if (summary.status === 'failed' || (!summary.results && !summary.spendingLimitReached && summary.status !== 'succeeded')) {
        await Actor.fail('No priced products saved. See OUTPUT coverage for the failure reason.');
    } else {
        log.info('Flipkart collection finished', summary);
        await Actor.exit();
    }
} catch (error) {
    log.error('Flipkart stopped on an input, storage, proxy or billing error; no automatic paid retry.');
    const message = error instanceof Error && /^(?:Field "|Input must)/.test(error.message)
        ? error.message : 'Check input, proxy access and the platform log. Saved dataset rows are retained.';
    await Actor.setValue('ERROR', { status: 'failed', category: 'INPUT_PROXY_STORAGE_OR_BILLING', message });
    await Actor.fail('Flipkart stopped safely; see ERROR and existing dataset rows.');
}
