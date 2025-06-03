import { Event } from "@ticketto/types";

import { Card, CardContent, CardMedia, Stack, Typography } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

const convertDate = (inputDate: bigint) => {
  const date = new Date(Number(inputDate));

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(date);
};

export const EventCard = ({
  event: { name, date, metadata },
}: {
  event: Event;
}) => {
  return (
    <Card sx={{ maxWidth: "xl" }}>
      <CardMedia sx={{ height: 140 }} image={metadata?.banner?.toString() ?? '/default-ticket.png'} title={name} />
      <CardContent>
        <Typography gutterBottom variant="h5">
          {name}
        </Typography>
        {date?.[0] ?
          <Stack direction="row">
            <CalendarMonthIcon />
            <Typography marginInlineStart={1} variant="body1">
              {convertDate(date[0])}
            </Typography>
          </Stack> : <></>
        }
      </CardContent>
    </Card>
  );
};
