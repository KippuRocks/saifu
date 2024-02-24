import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import QrCodeIcon from "@mui/icons-material/QrCode";
import SendIcon from "@mui/icons-material/Send";

import { IconButton, Paper, Typography } from "@mui/material";
import Grid2 from "@mui/material/Unstable_Grid2/Grid2";
import { Ticket } from "@ticketto/types";

export function TicketCard({
  ticket: { id, description, issuer },
}: {
  ticket: Ticket;
}) {
  return (
    <Paper sx={{ backgroundColor: "#212031", color: "white" }}>
      <Grid2
        paddingX={2}
        paddingY={1}
        alignItems="center"
        container
        spacing={2}
      >
        <Grid2 xs={1}>
          <ConfirmationNumberIcon />
        </Grid2>
        <Grid2 xs={8}>
          <Typography noWrap marginBlockStart={1} variant="button">
            {description}
          </Typography>
        </Grid2>
        <Grid2 direction="row" xs={3}>
          <IconButton
            href={`/tickets/${issuer}/${id}/qr`}
            size="small"
            color="warning"
            aria-label="access"
          >
            <QrCodeIcon />
          </IconButton>
          <IconButton disabled size="small" color="warning" aria-label="send">
            <SendIcon />
          </IconButton>
        </Grid2>
      </Grid2>
    </Paper>
  );
}
