import "reflect-metadata";
import { Container, Stack } from "@mui/material";
import { Event } from "@ticketto/types/events";
import { EventCard } from "../../components/EventCard/EventCard";
import { TickettoClientContext } from "../../providers/ticketto-client";
import { useCallback, useContext, useEffect, useState } from "react";

export default function Events() {
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
      <Stack alignContent="center" gap="1em">
        {!events && "PABLO ME LA COME"}
        {events?.map((event: Event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </Stack>
    </Container>
  );
}
