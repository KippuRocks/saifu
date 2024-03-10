import { Event } from "@ticketto/types";

import { Card, CardContent, CardMedia, Stack, Typography } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

const convertDate = (inputDate: number) => {
  const date = new Date(inputDate);

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(date);
};

export const EventCard = ({
  event: { name, date, banner },
}: {
  event: Event;
}) => {
  return (
    <Card sx={{ maxWidth: "xl" }}>
      <CardMedia sx={{ height: 140 }} image={banner.toString()} title={name} />
      <CardContent>
        <Typography gutterBottom variant="h5">
          {name}
        </Typography>
        <Stack direction="row">
          <CalendarMonthIcon />
          <Typography marginInlineStart={1} variant="body1">
            {convertDate(date[0])}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};
