"use client";

import { TickettoConfig } from "../providers/TickettoConfig.tsx";

export function useTickettoConfig(): TickettoConfig {
  return {
    api: {
      endpoint: process.env.NEXT_PUBLIC_KIPPU_API_ENDPOINT || "",
      clientId: process.env.NEXT_PUBLIC_KIPPU_API_CLIENT_ID,
      clientSecret: process.env.NEXT_PUBLIC_KIPPU_API_CLIENT_SECRET,
    },
    eventsContractAddress: process.env.NEXT_PUBLIC_EVENTS_CONTRACT_ADDRESS,
    ticketsContractAddress: process.env.NEXT_PUBLIC_TICKETS_CONTRACT_ADDRESS,
    merchantId: process.env.NEXT_PUBLIC_MERCHANT_ID,
  };
}
