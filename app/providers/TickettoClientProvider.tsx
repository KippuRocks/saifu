"use client";

import "reflect-metadata";

import { KippuConfig, KippuPAPIConsumer } from "@kippurocks/libticketto-papi";
import { createContext, useContext, useEffect, useState } from "react";

import { ClientAccountProvider } from "@ticketto/protocol";
import { PolkadotClient } from "polkadot-api";
import { TickettoClient } from "@ticketto/protocol";
import { TickettoClientBuilder } from "@ticketto/protocol";
import { TickettoConfig } from "./TickettoConfig";

export const useTickettoClient = () => useContext(TickettoClientContext);
export const TickettoClientContext = createContext<TickettoClient | null>(null);
export const useChainClient = () => useContext(ChainClientContext);
export const ChainClientContext = createContext<PolkadotClient | null>(null);

export function TickettoClientProvider({
  children,
  accountProvider,
  config,
  client,
}: {
  children: React.ReactNode;
  accountProvider?: ClientAccountProvider;
  config: TickettoConfig;
  client: PolkadotClient;
}) {
  const [builder, setBuilder] = useState<TickettoClientBuilder>();

  useEffect(() => {
    setBuilder(
      new TickettoClientBuilder().withConsumer(KippuPAPIConsumer).withConfig({
        consumerSettings: {
          api: {
            endpoint: config.api.endpoint,
            clientId: config.api.clientId,
            clientSecret: config.api.clientSecret,
          },
          client: client,
          eventsContractAddress: config.eventsContractAddress,
          ticketsContractAddress: config.ticketsContractAddress,
          merchantId: config.merchantId,
        },
        accountProvider: accountProvider ?? {
          getAccountId() {
            throw new Error("Account not provided");
          },
          sign<T>(_: T) {
            throw new Error("Account not provided");
          },
        },
      } as KippuConfig)
    );
  }, [accountProvider, config, client]);

  const [tickettoClient, setTickettoClient] = useState<TickettoClient | null>(
    null
  );
  useEffect(() => {
    async function initialize() {
      builder
        ?.build()
        ?.then((tickettoClient) => setTickettoClient(tickettoClient));
    }

    if (
      typeof window !== "undefined" &&
      typeof Reflect?.hasOwnMetadata !== "undefined"
    ) {
      initialize();
    }
  }, [builder]);

  return (
    tickettoClient && (
      <ChainClientContext.Provider value={client}>
        <TickettoClientContext.Provider value={tickettoClient}>
          {children}
        </TickettoClientContext.Provider>
      </ChainClientContext.Provider>
    )
  );
}
