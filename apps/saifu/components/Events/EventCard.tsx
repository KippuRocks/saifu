import { Card, CardContent, CardMedia, Stack, Typography } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { EventProps } from "../../types/events";

const convertDate = (inputDate: number) => {
  const date = new Date(inputDate);

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(date);
};

export const EventCard = ({ event: { name, date, banner } }: EventProps) => {
  return (
    <Card
      sx={{
        backgroundColor: "#2B2A41",
        maxWidth: "xl",
        color: "white",
      }}
    >
      <CardMedia sx={{ height: 140 }} image={banner.toString()} title={name} />
      <CardContent>
        <Typography gutterBottom variant="h5" color="white">
          {name}
        </Typography>
        <Stack direction="row">
          <CalendarMonthIcon />
          <Typography marginInlineStart={1} variant="body1" color="white">
            {convertDate(date[0])}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};
