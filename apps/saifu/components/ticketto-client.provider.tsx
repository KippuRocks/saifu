"use client";

import { useLocalStorage } from "@uidotdev/usehooks";
import { ReactNode, Suspense, useEffect, useState } from "react";
import { TickettoClientContext } from "../providers/ticketto-client";
import { TickettoWebStubConsumer } from "@ticketto/web-stub";
import { TickettoClient, TickettoClientBuilder } from "@ticketto/protocol";
import { AccountId } from "@ticketto/types";

export default function TickettoClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <TickettoProvider>{children}</TickettoProvider>
    </Suspense>
  );
}

function TickettoProvider({ children }: { children: ReactNode }) {
  let [accountId] = useLocalStorage<AccountId>("accountId");
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
            getAccountId: () => accountId,
            sign: (payload: Uint8Array) => payload,
          },
        })
        .build()
        .then((client) => setClient(client));
    }
    initialize();
  }, [accountId]);
  return (
    <TickettoClientContext.Provider value={client}>
      {children}
    </TickettoClientContext.Provider>
  );
}

function Loading() {
  return <>Loading...</>;
}
