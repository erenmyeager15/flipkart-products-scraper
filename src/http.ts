import { fetch, ProxyAgent } from 'undici';

export class FetchFailure extends Error {
    constructor(public readonly code: string) { super(code); }
}

export function classifyPage(html: string): 'blocked' | 'empty' | 'content' {
    const text = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
    if (/captcha|access denied|verify (?:you are|you're|that you are) human|unusual traffic|too many requests/i.test(text)) return 'blocked';
    if (/sorry[,!]?\s+(?:we couldn't find|no results)|no results found|no matching products/i.test(text)) return 'empty';
    return 'content';
}

export async function fetchHtml(url: string, proxyUrl: () => Promise<string | undefined>, timeoutMs = 20000,
    deps = { fetch, makeAgent: (uri: string) => new ProxyAgent(uri) }): Promise<string> {
    let lastCode = 'NETWORK_ERROR';
    const deadline = Date.now() + timeoutMs;
    for (let attempt = 0; attempt < 2 && Date.now() < deadline; attempt++) {
        let agent: ProxyAgent | undefined;
        try {
            const uri = await proxyUrl();
            if (uri) agent = deps.makeAgent(uri);
            const response = await deps.fetch(url, {
                dispatcher: agent, redirect: 'error', signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
                headers: { accept: 'text/html', 'accept-language': 'en-IN,en;q=0.9',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' },
            });
            if (!response.ok) {
                await response.body?.cancel();
                const code = response.status === 407 ? 'PROXY_AUTH_OR_COUNTRY_UNAVAILABLE' : `HTTP_${response.status}`;
                if (![403, 429, 500, 502, 503, 504, 529].includes(response.status)) throw new FetchFailure(code);
                lastCode = code;
                continue;
            }
            const parts: Buffer[] = [];
            let bytes = 0;
            for await (const chunk of response.body ?? []) {
                bytes += chunk.length;
                if (bytes > 4 * 1024 * 1024) throw new FetchFailure('RESPONSE_TOO_LARGE');
                parts.push(Buffer.from(chunk));
            }
            const html = Buffer.concat(parts).toString('utf8');
            if (classifyPage(html) === 'blocked') { lastCode = 'SOURCE_BLOCKED'; continue; }
            return html;
        } catch (error) {
            if (error instanceof FetchFailure) throw error;
            const cause = (error as Error & { cause?: Error }).cause?.message ?? '';
            if (/407|proxy authentication|no usable proxies/i.test(cause + (error as Error).message)) {
                throw new FetchFailure('PROXY_AUTH_OR_COUNTRY_UNAVAILABLE');
            }
            lastCode = /abort|timeout/i.test((error as Error).name + (error as Error).message) ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR';
        } finally {
            await agent?.destroy();
        }
    }
    throw new FetchFailure(lastCode);
}
