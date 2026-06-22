"use client";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    twttr?: {
      widgets: { load: (el?: HTMLElement) => void };
    };
  }
}

let scriptLoaded = false;
function ensureScript() {
  if (scriptLoaded) return;
  scriptLoaded = true;
  const s = document.createElement("script");
  s.src = "https://platform.twitter.com/widgets.js";
  s.async = true;
  document.head.appendChild(s);
}

export default function TweetEmbed({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureScript();
    const timer = setInterval(() => {
      if (window.twttr && ref.current) {
        window.twttr.widgets.load(ref.current);
        clearInterval(timer);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [url]);

  return (
    <div ref={ref} className="tweet-embed">
      <blockquote className="twitter-tweet" data-theme="dark" data-dnt="true">
        <a href={url}>{url}</a>
      </blockquote>
    </div>
  );
}
