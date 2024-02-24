"use client";

import { ReactNode, Suspense, useEffect, useState } from "react";
import { TickettoClientContext } from "../providers/ticketto-client";
import { TickettoWebStubConsumer } from "@ticketto/web-stub";
import { TickettoClient, TickettoClientBuilder } from "@ticketto/protocol";
import "reflect-metadata";

type Parent = {
  children: React.ReactNode;
};

export default function TickettoClientProvider({ children }: Parent) {
  return (
    <Suspense fallback={<Loading />}>
      <TickettoProvider>{children}</TickettoProvider>
    </Suspense>
  );
}

function TickettoProvider({ children }: { children: ReactNode }) {
  if (
    typeof window === "undefined" ||
    typeof Reflect?.hasOwnMetadata === "undefined"
  ) {
    return null;
  }

  const [client, setClient] = useState<TickettoClient | null>(null);

  useEffect(() => {
    async function initialize() {
      new TickettoClientBuilder()
        .withConsumer(TickettoWebStubConsumer)
        .withConfig({
          accountProvider: {
            getAccountId: () =>
              "5DD8bv4RnTDuJt47SAjpWMT78N7gfBQNF2YiZpVUgbXkizMG",
            sign: (payload: Uint8Array) => payload,
          },
        })
        .build()
        .then((client) => setClient(client));
    }
    initialize();
  }, []);
  return (
    <TickettoClientContext.Provider value={client}>
      {children}
    </TickettoClientContext.Provider>
  );
}

function Loading() {
  return <>Loading...</>;
}
