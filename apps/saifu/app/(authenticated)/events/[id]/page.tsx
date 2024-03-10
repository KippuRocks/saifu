"use client";

import { useCallback, useContext, useEffect, useState } from "react";

import type { Event, Ticket } from "@ticketto/types";
import { TickettoClientContext } from "@kippu/ticketto-react-provider";

import { Box, Container, Stack, Typography } from "@mui/material";
import {
  EventCard,
  EventNotFound,
  MarkdownRender,
  TicketList,
} from "@/components";

export default function EventDetailPage({
  params: { id },
}: {
  params: { id: number };
}) {
  const eventId = Number(id);
  let client = useContext(TickettoClientContext);

  const [event, setEvent] = useState<Event | undefined>();
  const [tickets, setTickets] = useState<Ticket[] | undefined>();

  const fetchEvent = useCallback(async () => {
    return client?.events?.query?.get(eventId);
  }, [client]);
  const fetchTickets = useCallback(async () => {
    return client?.tickets?.query?.ticketHolderOf(
      client?.accountProvider?.getAccountId?.()!,
      eventId
    );
  }, [client]);

  useEffect(() => {
    fetchEvent().then((event) => setEvent(event));
    fetchTickets().then((tickets) => setTickets(tickets));
  }, [fetchEvent, fetchTickets]);

  return event !== undefined ? (
    <Container>
      <Stack>
        <EventCard event={event} />

        <Typography marginBlock={2} variant="h5">
          Event Details
        </Typography>

        <Box marginY={3}>
          <MarkdownRender>{event.description}</MarkdownRender>
        </Box>

        <Typography marginBlock={2} variant="h5">
          My tickets
        </Typography>

        <TicketList tickets={tickets} />
      </Stack>
    </Container>
  ) : (
    <EventNotFound />
  );
}
