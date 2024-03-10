import { Stack, Typography } from "@mui/material";

export function EventNotFound() {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      sx={{ width: "100%", height: "100dvh" }}
    >
      <Typography variant="body1" color="white" textAlign="center">
        Event Not Found
      </Typography>
    </Stack>
  );
}
