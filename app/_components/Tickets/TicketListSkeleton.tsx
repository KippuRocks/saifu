"use client";

import { Paper, Stack } from "@mui/material";

import Skeleton from "@mui/material/Skeleton";

export function TicketListSkeleton() {
  return (
    <Stack direction="column" padding={2} spacing={2}>
      {/* Skeleton layouts that mimic the actual TicketCard structure */}
      {[1, 2, 3].map((i) => (
        <Paper key={i}>
          <Stack
            direction="row"
            alignItems="center"
            paddingX={2}
            paddingY={1}
            spacing={1}
          >
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="circular" width={24} height={24} />
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
