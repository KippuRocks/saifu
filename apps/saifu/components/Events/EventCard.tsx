import { Box, Grid, Typography } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import Image from "next/image";
import Link from "next/link";
import { EventProps } from "../../types/events";

const convertDate = (inputDate: number) => {
  const date = new Date(inputDate);

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(date);
};

export const EventCard = ({
  event: { id, name, description, date, banner },
}: EventProps) => {
  return (
    <Link href={`events/${id}`}>
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
          color: "white",
        }}
      >
        <Box
          sx={{
            position: "relative",
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
          <Image fill src={banner.toString()} alt={description} />
        </Box>
        <Grid item>
          <Typography
            textAlign="center"
            variant="h5"
            color="initial"
            fontWeight="700"
          >
            {name}
          </Typography>
          <Grid
            container
            direction="row"
            gap={2}
            sx={{ alignItems: "center", justifyContent: "center" }}
          >
            <CalendarMonthIcon />
            <Typography variant="body1" color="initial">
              {convertDate(date[0])}
            </Typography>
          </Grid>
        </Grid>
      </Grid>
    </Link>
  );
};
