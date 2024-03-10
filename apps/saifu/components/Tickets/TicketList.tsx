import { Stack } from "@mui/material";
import { Ticket } from "@ticketto/types";
import { TicketCard } from "./TicketCard";

export function TicketList({ tickets = [] }: { tickets?: Ticket[] }) {
  return (
    <Stack direction="column" padding={2}>
      {tickets.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
    </Stack>
  );
}
