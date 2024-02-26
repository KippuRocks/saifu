"use client";

import { useCallback, useContext, useEffect, useState } from "react";

import { Event } from "@ticketto/types/events";
import { TickettoClientContext } from "@kippu/ticketto-react-provider";

import { Container, Link, Stack } from "@mui/material";
import { EventCard } from "@/components";

export default function EventsPage() {
  let client = useContext(TickettoClientContext);
  const [events, setEvents] = useState<Event[] | null | undefined>(null);

  const fetchEvents = useCallback(async () => {
    const events = await client?.events.query.ticketHolderOf(
      client?.accountProvider?.getAccountId?.()!
    );
    return events;
  }, [client]);

  useEffect(() => {
    fetchEvents().then((events) => setEvents(events));
  }, [fetchEvents]);

  return (
    <Container>
      <Stack alignContent="center" gap={5}>
        {events?.map((event: Event) => (
          <Link
            key={event.id}
            sx={{ textDecoration: "none" }}
            href={`events/${event.id}`}
          >
            <EventCard key={event.id} event={event} />
          </Link>
        ))}
      </Stack>
    </Container>
  );
}
