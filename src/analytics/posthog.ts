// PostHog Analytics -- live in production (VITE_POSTHOG_TOKEN is set,
// loaded on index.html).
//
// "Discard client IP data" is confirmed enabled in the PostHog project
// settings (anonymize_ips) -- posthog-js's own `ip` init option is
// deprecated and has no effect (confirmed against its source), so this
// file can't enforce it either way; the dashboard setting is what
// actually governs it, and pages/privacy.html's PostHog disclosure is
// written to stay accurate regardless of which one is doing the work.
//
// Mirrors trackEvent()'s named product events too now (src/app/Analytics.ts
// imports this module's default export and calls .capture() alongside its
// own /api/track send) -- originally additive alongside Cloudflare Web
// Analytics and trackEvent()'s /api/track pipeline for general
// click/pageview/navigation-timing signals neither captured, now also where the
// named product events are summarized (a server-side monthly report used
// to do that and has since been retired).
//
// Configured for the strictest anonymous mode posthog-js supports: no
// person profiles ever created, autocapture scoped to clicks only (no form
// input content), no session recording/heatmaps, no on-page surveys, and
// (persistence: "memory") no distinct_id written to any cookie or
// localStorage -- posthog-js's default ("localStorage+cookie") would
// otherwise persist an anonymous id across visits, which is exactly the
// cross-visit tracking pages/privacy.html promises this site doesn't do.
//
// Web Vitals (LCP/INP/CLS/FCP) are on: anonymous page-speed timings, so
// slow pages show up per path. network_timing stays off -- it would log
// every URL the browser fetched, which nothing here needs.
// Same real-site/not-opted-out gate as the Cloudflare beacon; calls
// syncInternalTrafficFlag() itself so it's correct regardless of script order.

import { isRealExternalTraffic, syncInternalTrafficFlag } from "./trafficGate";

declare global {
  interface Window {
    posthog: {
      init(token: string, config: Record<string, unknown>): void;
    };
  }
}

syncInternalTrafficFlag();

export interface PosthogHandle {
  capture(name: string, props?: Record<string, unknown>): void;
  ready: Promise<void>;
}

function whenIdle(run: () => void): void {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 0);
  }
}

// Returns null rather than throwing when disabled (no token, internal
// traffic, or a non-production host): every dev/preview/test/CI load hits
// this path, and a thrown Error here would abort app.ts's entire module
// graph, since this is a bare side-effect import with nothing to catch it.
// posthog-js loads in its own chunk once the browser is idle; events
// captured before then are queued and replayed in order.
export function initPosthog(): PosthogHandle | null {
  const POSTHOG_TOKEN = import.meta.env.VITE_POSTHOG_TOKEN;

  if (!(isRealExternalTraffic() && POSTHOG_TOKEN)) return null;

  type Client = {
    capture(name: string, props?: Record<string, unknown>): void;
  };
  const queued: Array<[string, Record<string, unknown> | undefined]> = [];
  let client: Client | null = null;

  const ready = new Promise<void>((resolve) => {
    whenIdle(() => {
      import("posthog-js")
        .then(({ default: posthog }) => {
          posthog.init(POSTHOG_TOKEN, {
            api_host: "https://us.i.posthog.com",
            person_profiles: "never",
            autocapture: { dom_event_allowlist: ["click"] },
            capture_pageview: true,
            capture_pageleave: true,
            persistence: "memory",
            disable_session_recording: true,
            capture_heatmaps: false,
            disable_surveys: true,
            disable_web_experiments: true,
            capture_performance: { web_vitals: true, network_timing: false },
          });
          client = posthog;
          for (const [name, props] of queued.splice(0)) {
            posthog.capture(name, props);
          }
        })
        .catch(() => {})
        .finally(resolve);
    });
  });

  return {
    capture(name, props) {
      if (client) client.capture(name, props);
      else queued.push([name, props]);
    },
    ready,
  };
}

const posthogInstance = initPosthog();

export default posthogInstance;
