import type { Plugin } from "vite";

export const portless = (): Plugin => ({
  name: "configure-portless-url",
  apply: "serve",
  configureServer(server) {
    const portlessUrl = process.env.PORTLESS_URL;
    if (!portlessUrl) return;

    const _printUrls = server.printUrls;
    server.printUrls = () => {
      _printUrls();
      server.config.logger.info(
        `\u001b[32m  ➜\u001b[39m  Portless: \u001b[1m\u001b[36m${portlessUrl}\u001b[39m\u001b[22m`,
      );
    };

    server.bindCLIShortcuts({
      customShortcuts: [
        {
          key: "o",
          description: "open Portless URL in browser",
          action(server) {
            const open = server.config.server.open;
            server.config.server.open = portlessUrl;
            try {
              server.openBrowser();
            } finally {
              server.config.server.open = open;
            }
          },
        },
      ],
    });
  },
});
