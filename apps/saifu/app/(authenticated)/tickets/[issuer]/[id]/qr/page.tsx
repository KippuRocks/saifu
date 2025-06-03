"use client";

import "arraybuffer-base64-polyfill";
import { useCallback, useContext, useEffect, useState } from "react";

import { TickettoClientContext } from "@kippu/ticketto-react-provider";

import { Paper, Stack } from "@mui/material";
import QRCode from "react-qr-code";

export default function EventQrCodePage({
  params: { issuer, id },
}: {
  params: { issuer: string; id: string };
}) {
  const eventId = Number(issuer);
  const ticketId = BigInt(id);

  let client = useContext(TickettoClientContext);
  const [attendanceRequest, setAttendanceRequest] = useState<
    string | undefined
  >();

  const fetchAttendanceRequest = useCallback(async () => {
    return client?.tickets?.query?.attendanceRequest(eventId, ticketId);
  }, [client]);

  useEffect(() => {
    fetchAttendanceRequest().then(async (attendanceRequest) =>
      setAttendanceRequest(attendanceRequest?.toBase64())
    );
  }, [fetchAttendanceRequest]);

  return (
    <Stack
      sx={{ height: "100dvh", width: "100%", backgroundColor: "white" }}
      alignItems="center"
      justifyContent="center"
      boxSizing="border-box"
    >
      {attendanceRequest !== undefined ? (
        <Paper
          sx={{
            display: "flex",
            background: "transparent",
            padding: 1,
            border: "solid 0.5rem black",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <QRCode
            style={{ width: "90%" }}
            size={256}
            value={attendanceRequest}
            bgColor="rgba(0,0,0,0)"
            fgColor="#000000"
            viewBox={`0 0 256 256`}
          />
        </Paper>
      ) : (
        <></>
      )}
    </Stack>
  );
}
