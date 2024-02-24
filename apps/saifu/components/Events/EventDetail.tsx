import { EventProps } from "../../types/events";

export function EventDetail({ event }: EventProps) {
  return <p style={{ color: "white" }}>{event.id}</p>;
}
