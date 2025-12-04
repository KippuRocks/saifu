"use client";

export interface TickettoConfig {
  api: {
    endpoint: string;
    clientId?: string;
    clientSecret?: string;
  };
  eventsContractAddress?: string;
  ticketsContractAddress?: string;
  merchantId?: string | number;
}
