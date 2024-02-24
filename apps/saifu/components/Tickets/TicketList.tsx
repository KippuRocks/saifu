import { Stack, Typography } from "@mui/material";
import { Ticket } from "@ticketto/types";
import { TicketCard } from "./TicketCard";

export function TicketList({ tickets = [] }: { tickets?: Ticket[] }) {
  return (
    <>
      <Typography marginBlock={2} variant="h5" color="white">
        My tickets
      </Typography>
      <Stack direction="column" padding={2}>
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </Stack>
    </>
  );
}
