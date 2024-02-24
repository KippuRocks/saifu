import { TickettoClient } from "@ticketto/protocol";
import { createContext } from "react";

export const TickettoClientContext = createContext<TickettoClient | null>(null);
