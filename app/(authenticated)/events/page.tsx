"use client";

import { useEffect, useState } from "react";

import { Event } from "@ticketto/types/events";
import { EventList } from "../../_components/index.ts";
import { useTickettoClient } from "../../providers/TickettoClientProvider.tsx";

export default function EventsPage() {
  let client = useTickettoClient();
  const [events, setEvents] = useState<Event[]>();

  useEffect(() => {
    const fetchEvents = async () => {
      const events = await client?.events.query.ticketHolderOf(
        client?.accountProvider?.getAccountId?.()!
      );
      setEvents(events || []);
    };
    fetchEvents();
  }, [client]);

  return <EventList events={events} />;
}
