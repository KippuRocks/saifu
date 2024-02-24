"use client";

import { Container, Link, Stack } from "@mui/material";
import { Event } from "@ticketto/types/events";
import { useCallback, useContext, useEffect, useState } from "react";
import { EventCard } from "../../components";
import { TickettoClientContext } from "../../providers/ticketto-client";

export default function EventsPage() {
  let client = useContext(TickettoClientContext);
  const [events, setEvents] = useState<Event[] | null | undefined>(null);

  const fetchEvents = useCallback(async () => {
    let events = await client?.events?.query?.ticketHolderOf(
      "5DD8bv4RnTDuJt47SAjpWMT78N7gfBQNF2YiZpVUgbXkizMG"
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
