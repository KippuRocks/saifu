import { Container, Stack } from "@mui/material"
import { Event } from "@ticketto/types/events"
import { EventCard } from "../../components/EventCard/EventCard"

const EventsPage = () => {

  const events: Event[] = [
    {
      id: 1616516,
      owner: '5f6d84sf6d8',
      name: 'Dua Lipa en Colombia',
      description: "Dua lipa viene a Colombia, no te lo pierdas",
      banner: "https://lumiere-a.akamaihd.net/v1/images/dua_lipa_portada_5_bf1628a4.jpeg?region=15,0,1956,1100&width=960",
      dates: [
        [Date.parse('14 Mar 2024 15:00:00 GMT'), Date.parse('14 Mar 2024 23:00:00 GMT')],
        [Date.parse('15 Mar 2024 15:00:00 GMT'), Date.parse('15 Mar 2024 23:00:00 GMT')],
        [Date.parse('16 Mar 2024 15:00:00 GMT'), Date.parse('16 Mar 2024 23:00:00 GMT')],
      ],
      date: [Date.parse('14 Mar 2024 15:00:00 GMT'), Date.parse('14 Mar 2024 23:00:00 GMT')],
      capacity: 24000,
    }
  ]

  return (
    <Container>
      <Stack alignContent="center">
        {events.map(event => (
          <EventCard
            key={event.id}
            event={event}
          />
        ))}
      </Stack>
    </Container>
  )
}

export default EventsPage