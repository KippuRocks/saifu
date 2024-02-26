"use client";

import "reflect-metadata";
import { ReactNode, Suspense, useEffect, useState } from "react";
import { TickettoClientContext } from "./contexts";

import { TickettoClient, TickettoClientBuilder } from "@ticketto/protocol";

export function TickettoClientProvider({
  builder,
  children,
}: {
  builder: TickettoClientBuilder;
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <TickettoProvider builder={builder}>{children}</TickettoProvider>
    </Suspense>
  );
}

function TickettoProvider({
  builder,
  children,
}: {
  builder: TickettoClientBuilder;
  children: ReactNode;
}) {
  if (
    typeof window === "undefined" ||
    typeof Reflect?.hasOwnMetadata === "undefined"
  ) {
    return null;
  }

  const [client, setClient] = useState<TickettoClient | null>(null);

  useEffect(() => {
    async function initialize() {
      builder.build().then((client) => setClient(client));
    }
    initialize();
  }, [builder]);
  return (
    <TickettoClientContext.Provider value={client}>
      {children}
    </TickettoClientContext.Provider>
  );
}

function Loading() {
  return <>Loading...</>;
}
