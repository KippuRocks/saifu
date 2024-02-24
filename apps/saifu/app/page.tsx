"use client";

import "reflect-metadata";
import type { Event } from "@ticketto/types";
import { useContext, useEffect, useState } from "react";
import { TickettoClientContext } from "../providers/ticketto-client";
import Image from "next/image";

const RootPage = () => {
  let [events, setEvents] = useState<Event[]>();
  let client = useContext(TickettoClientContext);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    let events = await client?.events.query.ticketHolderOf(
      "5DD8bv4RnTDuJt47SAjpWMT78N7gfBQNF2YiZpVUgbXkizMG"
    );
    setEvents(events);
  }

  return (
    <div>
      {events?.map((event) => {
        return (
          <div key={event.id}>
            <h1>{event.name}</h1>
            <Image alt={event.description} src={event.banner.toString()} fill />
          </div>
        );
      })}
    </div>
  );
};

export default RootPage;
