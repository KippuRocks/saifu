"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { TickettoClientProvider } from "@kippu/ticketto-react-provider";
import { TickettoClientBuilder } from "@ticketto/protocol";
import { TickettoWebStubConsumer } from "@ticketto/web-stub";
import { type AccountId } from "@ticketto/types";

export function ClientSideLayout({
  accountId,
  children,
}: {
  accountId?: AccountId;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (accountId === undefined && pathname !== "/") {
    window.location.reload();
  }

  const [isClientSide, setIsClientSide] = useState(false);
  const builder = new TickettoClientBuilder()
    .withConsumer(TickettoWebStubConsumer)
    .withConfig({
      accountProvider: {
        getAccountId: () => {
          if (accountId === undefined) {
            throw new Error("NoAccountIdProvided");
          }

          return accountId;
        },
        sign: (payload: Uint8Array) => Promise.resolve(payload),
      },
    });

  useEffect(() => {
    setIsClientSide(true);
  }, [accountId, builder]);

  return (
    isClientSide && (
      <TickettoClientProvider builder={builder}>
        {children}
      </TickettoClientProvider>
    )
  );
}
