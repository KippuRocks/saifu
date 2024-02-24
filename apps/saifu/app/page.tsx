"use client";

import { useLocalStorage } from "@uidotdev/usehooks";
import { useEffect } from "react";
import { AccountId } from "@ticketto/types";
import { Container, Stack, Typography } from "@mui/material";

import { Account } from "@ticketto/web-stub/types";
import { Identicon } from "@polkadot/react-identicon";

const RootPage = () => {
  const accounts: Account[] = [
    {
      id: "5DD8bv4RnTDuJt47SAjpWMT78N7gfBQNF2YiZpVUgbXkizMG",
      identity: {
        legalName: "Alice",
        email: "alice@example.com",
      },
      balance: 0,
    },
    {
      id: "5HVoCpiwRWMZCmM8ituz46JVGAzvAjqsHrGkdhqrDUD4NW6o",
      identity: {
        legalName: "Bob",
        email: "bob@example.com",
      },
      balance: 0,
    },
  ];

  let [accountId, setAccountId] = useLocalStorage<AccountId>("accountId");

  useEffect(() => {
    if (accountId !== undefined) {
      location.replace("/events");
    }
  }, [accountId]);

  return (
    <Container sx={{ width: "100%", height: "100dvh" }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{ width: "100%", height: "100dvh" }}
      >
        {accounts?.map((account) => (
          <Stack
            width="50%"
            onClick={() => setAccountId(account.id)}
            direction="column"
            alignItems="center"
          >
            <Identicon
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                marginBlockEnd: 20,
              }}
              value={account.id.toString()}
              theme="polkadot"
            />
            <Typography
              sx={{ textAlign: "cecnter" }}
              variant="subtitle1"
              color="white"
            >
              {account.identity.legalName}
            </Typography>
            <Typography
              sx={{ textAlign: "cecnter" }}
              variant="subtitle2"
              color="gray"
            >
              {account.identity.email}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Container>
  );
};

export default RootPage;
