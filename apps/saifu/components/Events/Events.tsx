import "reflect-metadata";
import { Container, Stack } from "@mui/material";
import { Event } from "@ticketto/types/events";
import { EventCard } from "../../components/EventCard/EventCard";
import { TickettoClientContext } from "../../providers/ticketto-client";
import { Suspense, useContext, useEffect, useState } from "react";

export default async function Events() {
  let client = useContext(TickettoClientContext);
  
  async function fetchEvents() {
    let events = await client.events?.query?.ticketHolderOf(
      "5DD8bv4RnTDuJt47SAjpWMT78N7gfBQNF2YiZpVUgbXkizMG"
    );
    return events;
  }

  const events = await fetchEvents();

  return (
    <Container>
      <Stack alignContent="center">
        {events?.map((event: Event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </Stack>
    </Container>
  );
};
