"use client";

import { Box, Container, Link, Stack, Typography } from "@mui/material";
import { EventCard, EventListSkeleton } from "../index.ts";

import { Event } from "@ticketto/types/events";
import LocalActivityIcon from "@mui/icons-material/LocalActivity";

function EmptyEventsView() {
  return (
    <Container>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "50vh",
          textAlign: "center",
        }}
      >
        <LocalActivityIcon
          sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
        />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Your upcoming events
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You don't have any event tickets yet.
        </Typography>
      </Box>
    </Container>
  );
}

export function EventList({ events }: { events: Event[] | undefined }) {
  const sortedEvents = events
    ? [...events].sort(
        ({ name: nameA, date: dateA }, { name: nameB, date: dateB }) =>
          // While it is assumed that dates must be set when actual people
          // hold tickets for an event, it is also safe to assume an implementation
          // of the protocol might not include that.
          dateA?.[0] !== undefined && dateB?.[0] !== undefined
            ? Number(dateA?.[0] - dateB?.[0])
            : nameA.localeCompare(nameB)
      )
    : events;

  // Loading state when events haven't been fetched yet
  if (events === undefined) {
    return (
      <Container>
        <EventListSkeleton />
      </Container>
    );
  }

  // Empty state when no events
  if (sortedEvents && sortedEvents.length === 0) {
    return <EmptyEventsView />;
  }

  return (
    <Container>
      <Stack alignContent="center" gap={5}>
        {sortedEvents?.map((event: Event) => (
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
