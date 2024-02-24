import { Box, Grid, Typography } from "@mui/material";
import { Event } from "@ticketto/types/events";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

const convertDate = (inputDate: number) => {
  const date = new Date(inputDate);
  return `${date.toLocaleDateString("es-CO", { weekday: "long" })} ${date.getDay()}, ${date.getFullYear()}`;
};

type EventCardProps = {
  event: Event;
};

export const EventCard = ({
  event: { name, date, banner },
}: EventCardProps) => {
  return (
    <Grid
      container
      direction="column"
      gap={5}
      sx={{
        backgroundColor: "#2B2A41",
        padding: 5,
        borderRadius: 5,
        alignItems: "center",
        maxWidth: "xl",
        color: "white"
      }}
    >
      <Box
        sx={{
          height: "300px",
          width: "90%",
          backgroundColor: "red",
          "& img": {
            objectFit: "cover",
            height: "100%",
            width: "100%",
          },
        }}
      >
        <img src={banner as string} alt="" />
      </Box>
      <Grid item direction="column">
        <Typography variant="h5" color="initial" fontWeight="700">
          {name}
        </Typography>
        <Grid container direction="row" gap={2} sx={{ alignItems: "center" }}>
          <CalendarMonthIcon />
          <Typography variant="body1" color="initial">
            {convertDate(date[0])}
          </Typography>
        </Grid>
      </Grid>
    </Grid>
  );
};
