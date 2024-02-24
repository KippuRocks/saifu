"use client";

import "reflect-metadata";
import Event from "../../components/Event/Event";

export default function EventDetailPage({ id }: { id: number }) {
  return <Event id={id} />;
}
