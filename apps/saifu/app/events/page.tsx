"use client";

import "reflect-metadata";
import { Container, Stack } from "@mui/material";
import { Event } from "@ticketto/types/events";
import { EventCard } from "../../components/EventCard/EventCard";
import { TickettoClientContext } from "../../providers/ticketto-client";
import { useContext, useEffect, useState } from "react";

const EventsPage = () => {
  let [events, setEvents] = useState<Event[]>([]);
  let client = useContext(TickettoClientContext);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    let events = await client.events.query.ticketHolderOf(
      "5DD8bv4RnTDuJt47SAjpWMT78N7gfBQNF2YiZpVUgbXkizMG"
    );
    setEvents(events);
  }

  return (
    <Container>
      <Stack alignContent="center">
        {events.map((event: Event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </Stack>
    </Container>
  );
};

export default EventsPage;
