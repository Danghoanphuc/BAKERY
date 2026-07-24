import { Resolver } from "node:dns/promises";
import { Agent, fetch as undiciFetch } from "undici";

const fallbackResolver = new Resolver();
fallbackResolver.setServers(["1.1.1.1", "8.8.8.8"]);

const openAiDispatcher = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      fallbackResolver.resolve4(hostname)
        .then((addresses) => {
          const [address] = addresses;
          if (!address) {
            callback(Object.assign(new Error(`No A record found for ${hostname}`), { code: "ENOTFOUND" }), "", 4);
            return;
          }
          if (options.all) {
            callback(null, addresses.map((item) => ({ address: item, family: 4 })) as never);
            return;
          }
          callback(null, address, 4);
        })
        .catch((error: NodeJS.ErrnoException) => callback(error, "", 4));
    },
  },
});

/** Keep OpenAI independent from an unreliable host DNS resolver. */
export const openAiFetch: typeof globalThis.fetch = (input, init) =>
  undiciFetch(input as Parameters<typeof undiciFetch>[0], {
    ...init,
    dispatcher: openAiDispatcher,
  } as Parameters<typeof undiciFetch>[1]) as unknown as ReturnType<typeof globalThis.fetch>;
