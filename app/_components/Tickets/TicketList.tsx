import { Stack } from "@mui/material";
import { Ticket } from "@ticketto/types";
import { TicketCard } from "./TicketCard.tsx";
import { TicketListSkeleton } from "./TicketListSkeleton.tsx";

export function TicketList({ tickets = [] }: { tickets?: Ticket[] }) {
  if (tickets.length === 0) {
    return <TicketListSkeleton />;
  }

  return (
    <Stack direction="column" padding={2}>
      {tickets.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
    </Stack>
  );
}
