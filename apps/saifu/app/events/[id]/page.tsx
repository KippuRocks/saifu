"use client";

import "reflect-metadata";
import { EventDetail } from "../../../components/Events";
import { useCallback, useContext, useEffect, useState } from "react";
import { TickettoClientContext } from "../../../providers/ticketto-client";
import type { Event } from "@ticketto/types";

export default function EventDetailPage({
  params: { id },
}: {
  params: { id: number };
}) {
  let client = useContext(TickettoClientContext);
  const [event, setEvent] = useState<Event | undefined>();

  const fetchEvent = useCallback(async () => {
    return client?.events?.query?.get(Number(id));
  }, [client]);

  useEffect(() => {
    fetchEvent().then((event) => setEvent(event));
  }, [fetchEvent]);

  return event === undefined ? <></> : <EventDetail event={event} />;
}
