"use client";

import "reflect-metadata";

import { Box, Container, Stack, Typography } from "@mui/material";
import type { Event, Ticket } from "@ticketto/types";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  EventCard,
  EventNotFound,
  MarkdownRender,
  TicketList,
} from "../../../components";
import { TickettoClientContext } from "../../../providers/ticketto-client";

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

        <Typography marginBlock={2} variant="h5" color="white">
          Event Details
        </Typography>

        <Box marginY={3}>
          <MarkdownRender>{event.description}</MarkdownRender>
        </Box>

        <TicketList tickets={tickets} />
      </Stack>
    </Container>
  ) : (
    <EventNotFound />
  );
}
