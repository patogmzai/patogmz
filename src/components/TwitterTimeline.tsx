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

interface Props {
  handle: string;
  height?: number;
}

export default function TwitterTimeline({ handle, height = 400 }: Props) {
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
  }, [handle]);

  return (
    <div ref={ref}>
      <a
        className="twitter-timeline"
        data-theme="dark"
        data-chrome="noheader nofooter noborders transparent"
        data-height={height}
        data-dnt="true"
        href={`https://twitter.com/${handle.replace("@", "")}`}
      >
        Cargando tweets de {handle}…
      </a>
    </div>
  );
}
