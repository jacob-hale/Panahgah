/** Loads Chatbase once per session (same behavior as their default embed snippet). */
export function installChatbaseEmbed(): void {
  const w = window as Window & { __panahgahChatbaseLoader?: boolean };
  if (w.__panahgahChatbaseLoader) return;
  w.__panahgahChatbaseLoader = true;

  const inline = document.createElement('script');
  inline.textContent = `(function(){if(!window.chatbase||window.chatbase("getState")!=="initialized"){window.chatbase=(...arguments)=>{if(!window.chatbase.q){window.chatbase.q=[]}window.chatbase.q.push(arguments)};window.chatbase=new Proxy(window.chatbase,{get(target,prop){if(prop==="q"){return target.q}return(...args)=>target(prop,...args)}})}const onLoad=function(){const script=document.createElement("script");script.src="https://www.chatbase.co/embed.min.js";script.id="Mahh96yzKdinEv4RFzOxq";script.domain="www.chatbase.co";document.body.appendChild(script)};if(document.readyState==="complete"){onLoad()}else{window.addEventListener("load",onLoad)}})();`;
  document.body.appendChild(inline);
  inline.remove();
}

export function tryCloseChatbaseWidget(): void {
  try {
    const cb = (window as unknown as { chatbase?: { close?: () => void } }).chatbase;
    cb?.close?.();
  } catch {
    /* ignore */
  }
}
