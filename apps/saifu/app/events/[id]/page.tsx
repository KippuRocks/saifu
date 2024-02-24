"use client";

import "reflect-metadata";
import Event from "../../../components/Event/Event";

export default function EventDetailPage({ params: { id } }: any) {
  console.log(id);
  return <Event id={id} />;
}
