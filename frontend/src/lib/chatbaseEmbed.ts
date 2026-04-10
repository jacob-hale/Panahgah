type ChatbaseQueueFn = ((...args: unknown[]) => void) & { q?: unknown[][] };
type ChatbaseProxyFn = ChatbaseQueueFn & { getState?: () => string };

/** Loads Chatbase once per session (equivalent to their snippet, without inline JS). */
export function installChatbaseEmbed(): void {
  const w = window as Window & {
    __panahgahChatbaseLoader?: boolean;
    chatbase?: ChatbaseProxyFn;
  };
  if (w.__panahgahChatbaseLoader) return;
  w.__panahgahChatbaseLoader = true;

  const getState = w.chatbase as unknown as ((name: string) => unknown) | undefined;
  const alreadyInitialized = typeof getState === 'function' && getState('getState') === 'initialized';
  if (!alreadyInitialized) {
    const queued: ChatbaseQueueFn = ((...args: unknown[]) => {
      if (!queued.q) queued.q = [];
      queued.q.push(args);
    }) as ChatbaseQueueFn;

    w.chatbase = new Proxy(queued, {
      get(target, prop) {
        if (prop === 'q') return target.q;
        return (...args: unknown[]) => target(String(prop), ...args);
      },
      apply(target, _thisArg, argArray) {
        target(...argArray);
      },
    }) as ChatbaseProxyFn;
  }

  const addScript = () => {
    if (document.getElementById('Mahh96yzKdinEv4RFzOxq')) return;
    const script = document.createElement('script');
    script.src = 'https://www.chatbase.co/embed.min.js';
    script.id = 'Mahh96yzKdinEv4RFzOxq';
    script.setAttribute('domain', 'www.chatbase.co');
    document.body.appendChild(script);
  };

  if (document.readyState === 'complete') addScript();
  else window.addEventListener('load', addScript, { once: true });
}

export function tryCloseChatbaseWidget(): void {
  try {
    const cb = (window as unknown as { chatbase?: { close?: () => void } }).chatbase;
    cb?.close?.();
  } catch {
    /* ignore */
  }
}
