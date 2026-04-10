/* Chatbase official embed (same as their <script> block), loaded as a first-party file for CSP. */
(function () {
  if (!window.chatbase || window.chatbase('getState') !== 'initialized') {
    window.chatbase = (...arguments) => {
      if (!window.chatbase.q) {
        window.chatbase.q = [];
      }
      window.chatbase.q.push(arguments);
    };
    window.chatbase = new Proxy(window.chatbase, {
      get(target, prop) {
        if (prop === 'q') {
          return target.q;
        }
        return (...args) => target(prop, ...args);
      },
    });
  }
  const onLoad = function () {
    const script = document.createElement('script');
    script.src = 'https://www.chatbase.co/embed.min.js';
    script.id = 'Mahh96yzKdinEv4RFzOxq';
    script.domain = 'www.chatbase.co';
    document.body.appendChild(script);
  };
  if (document.readyState === 'complete') {
    onLoad();
  } else {
    window.addEventListener('load', onLoad);
  }
})();
