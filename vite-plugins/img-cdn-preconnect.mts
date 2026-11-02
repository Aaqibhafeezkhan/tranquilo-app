import type { Plugin } from "vite";

function cdnOrigin(baseUrl: string | undefined): string | null {
  if (!baseUrl) return null;
  try {
    const url = new URL(baseUrl);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

export function addImgCdnPreconnect(
  html: string,
  baseUrl: string | undefined,
): string {
  const origin = cdnOrigin(baseUrl);
  if (!origin) return html;
  const tag = `<link rel="preconnect" href="${origin}" crossorigin>`;
  if (html.includes(tag)) return html;
  return html.replace("</head>", `${tag}\n</head>`);
}

export default function imgCdnPreconnect(): Plugin {
  return {
    name: "img-cdn-preconnect",
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        if (ctx.path !== "/index.html") return html;
        return addImgCdnPreconnect(html, process.env.IMG_CDN_BASE_URL);
      },
    },
  };
}
