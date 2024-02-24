"use client";

import "reflect-metadata";
import { Container, Stack } from "@mui/material";
import { Event } from "@ticketto/types/events";
import { EventCard } from "../../components/EventCard/EventCard";
import { TickettoClientContext } from "../../providers/ticketto-client";
import { Suspense, useContext, useEffect, useState } from "react";
import Events from "../../components/Events/Events";

const EventsPage = () => {
  return (
    <Events />
  );
};

export default EventsPage;
