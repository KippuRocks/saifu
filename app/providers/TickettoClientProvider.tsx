"use client";

import "reflect-metadata";

import { Binary, PolkadotClient } from "polkadot-api";
import {
  KippuConfig,
  KippuPAPIConsumer,
  isKreivoTx,
} from "@kippurocks/libticketto-papi";
import { createContext, useContext, useEffect, useState } from "react";

import { PapiSigner } from "../hooks/papi.signer.ts";
import { TickettoClient } from "@ticketto/protocol";
import { TickettoClientBuilder } from "@ticketto/protocol";
import { TickettoConfig } from "./TickettoConfig.tsx";

export const useTickettoClient = () => useContext(TickettoClientContext);
export const TickettoClientContext = createContext<TickettoClient | null>(null);

function buildAccountProvider(signer?: PapiSigner) {
  return signer
    ? {
        getAccountId: () => {
          return signer.address;
        },
        async sign<T>(payload: T) {
          if (!isKreivoTx(payload)) {
            throw new Error(
              "This `AccountProvider` is not compatible with the provided payload"
            );
          }

          const signature = await payload.sign(signer.signer);
          return Binary.fromHex(signature).asBytes();
        },
      }
    : {
        getAccountId() {
          throw new Error("Account not provided");
        },
        sign<T>(_: T) {
          throw new Error("Account not provided");
        },
      };
}

export function TickettoClientProvider({
  children,
  signer,
  config,
  client,
}: {
  children: React.ReactNode;
  signer?: PapiSigner;
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
        accountProvider: buildAccountProvider(signer),
      } as KippuConfig)
    );
  }, [signer, config, client]);

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
      <TickettoClientContext.Provider value={tickettoClient}>
        {children}
      </TickettoClientContext.Provider>
    )
  );
}
