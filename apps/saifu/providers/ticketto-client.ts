import { TickettoClient } from "@ticketto/protocol";
import { Event, Ticket } from "@ticketto/types";
import { createContext } from "react";

export const TickettoClientContext = createContext<TickettoClient | null>(null);
