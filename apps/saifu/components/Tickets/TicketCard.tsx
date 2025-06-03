import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import QrCodeIcon from "@mui/icons-material/QrCode";
import SendIcon from "@mui/icons-material/Send";

import { IconButton, Paper, Stack, Typography } from "@mui/material";
import { Ticket } from "@ticketto/types";

export function TicketCard({
  ticket: { id, metadata, eventId },
}: {
  ticket: Ticket;
}) {
  return (
    <Paper>
      <Stack
        direction="row"
        alignItems="center"
        paddingX={2}
        paddingY={1}
        spacing={1}
      >
        <ConfirmationNumberIcon />

        {
          metadata?.description
            ? <Typography noWrap variant="button" flexGrow={2}>
              {metadata.description}
            </Typography> : <></>
        }

        <IconButton href={`/tickets/${eventId}/${id}/qr`} aria-label="access">
          <QrCodeIcon />
        </IconButton>
        <IconButton disabled aria-label="send">
          <SendIcon />
        </IconButton>
      </Stack>
    </Paper>
  );
}
