import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import QrCodeIcon from "@mui/icons-material/QrCode";
import SendIcon from "@mui/icons-material/Send";

import { IconButton, Paper, Stack, Typography } from "@mui/material";
import { Ticket } from "@ticketto/types";

export function TicketCard({
  ticket: { id, description, issuer },
}: {
  ticket: Ticket;
}) {
  return (
    <Paper sx={{ backgroundColor: "#212031", color: "white" }}>
      <Stack
        direction="row"
        alignItems="center"
        paddingX={2}
        paddingY={1}
        spacing={1}
      >
        <ConfirmationNumberIcon />

        <Typography noWrap variant="button" flexGrow={2}>
          {description}
        </Typography>

        <IconButton
          href={`/tickets/${issuer}/${id}/qr`}
          color="warning"
          aria-label="access"
        >
          <QrCodeIcon />
        </IconButton>
        <IconButton disabled color="warning" aria-label="send">
          <SendIcon />
        </IconButton>
      </Stack>
    </Paper>
  );
}
