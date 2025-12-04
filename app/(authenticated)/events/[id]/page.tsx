"use client";

import { Box, Container, Stack, Typography } from "@mui/material";
import type { Event, Ticket } from "@ticketto/types";
import {
  EventCard,
  EventNotFound,
  MarkdownRender,
  TicketList,
} from "../../../_components/index.ts";
import { useCallback, useContext, useEffect, useState } from "react";

import { TickettoClientContext } from "../../../providers/TickettoClientProvider.tsx";

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

        {event.metadata?.description !== undefined ? (
          <Box marginY={3}>
            <MarkdownRender>{event.metadata?.description}</MarkdownRender>
          </Box>
        ) : (
          <></>
        )}

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
