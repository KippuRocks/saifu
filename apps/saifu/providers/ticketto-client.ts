import { TickettoClient } from "@ticketto/protocol";
import { Event, Ticket } from "@ticketto/types";
import { createContext } from "react";

export const TickettoClientContext = createContext<TickettoClient>({
  events: {
    calls: {
      createEvent: function (): Promise<number> {
        throw new Error("Function not implemented.");
      },
      update: function (): Promise<void> {
        throw new Error("Function not implemented.");
      },
      transferOwner: function (): Promise<void> {
        throw new Error("Function not implemented.");
      },
    },
    query: {
      organizerOf: function (): Promise<Event[]> {
        throw new Error("Function not implemented.");
      },
      ticketHolderOf: function (): Promise<Event[]> {
        throw new Error("Function not implemented.");
      },
      get: function (): Promise<Event | undefined> {
        throw new Error("Function not implemented.");
      },
    },
  },
  tickets: {
    calls: {
      issue: function (): Promise<number> {
        throw new Error("Function not implemented.");
      },
      transfer: function (): Promise<void> {
        throw new Error("Function not implemented.");
      },
      sell: function (): Promise<void> {
        throw new Error("Function not implemented.");
      },
      withdrawSell: function (): Promise<void> {
        throw new Error("Function not implemented.");
      },
      buy: function (): Promise<void> {
        throw new Error("Function not implemented.");
      },
    },
    query: {
      ticketHolderOf: function (): Promise<Ticket[]> {
        throw new Error("Function not implemented.");
      },
      get: function (): Promise<Ticket | undefined> {
        throw new Error("Function not implemented.");
      },
      attendanceRequest: function (): Promise<Uint8Array> {
        throw new Error("Function not implemented.");
      },
    },
  },
});
