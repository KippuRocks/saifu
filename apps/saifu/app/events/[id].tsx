"use client";

import "reflect-metadata";
import Event from "../../components/Event/Event";
import { useParams } from "next/navigation";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  console.log(params);

  return <Event id={Number(params.id)} />;
}
