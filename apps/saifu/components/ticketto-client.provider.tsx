"use client";

import { useEffect, useState } from "react";
import { TickettoClientContext } from "../providers/ticketto-client";
import { TickettoWebStubConsumer } from "@ticketto/web-stub";
import { TickettoClient, TickettoClientBuilder } from "@ticketto/protocol";

type Parent = {
  children: React.ReactNode;
};

export default function TickettoClientProvider({ children }: Parent) {
  const [client, setClient] = useState<TickettoClient | null>(null);

  useEffect(() => {
    fetchClient();
  }, []);

  async function fetchClient() {
    await new Promise((res) => setTimeout(res, 1_000));
    let client = await new TickettoClientBuilder()
      .withConsumer(TickettoWebStubConsumer)
      .withConfig({
        accountProvider: {
          getAccountId: () =>
            "5DD8bv4RnTDuJt47SAjpWMT78N7gfBQNF2YiZpVUgbXkizMG",
          sign: (payload: Uint8Array) => payload,
        },
      })
      .build();

    setClient(client);
  }

  return client == null ? (
    <Loading />
  ) : (
    <TickettoClientContext.Provider value={client}>
      {children}
    </TickettoClientContext.Provider>
  );
}

function Loading() {
  return <>Loading...</>;
}
