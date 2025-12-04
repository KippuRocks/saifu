"use client";

import { Card, CardContent, Skeleton, Stack } from "@mui/material";

export function EventListSkeleton() {
  return (
    <Stack alignContent="center" gap={5}>
      {/* Skeleton layouts that mimic the actual EventCard structure */}
      {[1, 2, 3].map((i) => (
        <Card key={i} sx={{ maxWidth: "xl" }}>
          <Skeleton variant="rectangular" width="100%" height={140} />
          <CardContent>
            <Skeleton variant="text" width="80%" height={32} />
            <Stack
              direction="row"
              alignItems="center"
              marginTop={1}
              spacing={1}
            >
              <Skeleton variant="circular" width={24} height={24} />
              <Skeleton variant="text" width="40%" height={24} />
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
