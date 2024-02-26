"use client";

import { AccountId } from "@ticketto/types";
import { Container, Paper, Stack, Typography } from "@mui/material";

import { Account } from "@ticketto/web-stub/types";
import { Identicon } from "@polkadot/react-identicon";

import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

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

  async function setAccountId(accountId: AccountId) {
    router.push(`/auth/login?accountId=${accountId}`);
  }

  return (
    <Container sx={{ width: "100%", height: "100dvh" }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={2}
        sx={{ width: "100%", height: "100dvh" }}
      >
        {accounts?.map((account) => (
          <Paper onClick={() => setAccountId(account.id)} elevation={3}>
            <Stack
              padding={2}
              direction="column"
              alignItems="center"
              justifyContent="center"
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
              <Typography sx={{ textAlign: "cecnter" }} variant="button">
                {account.identity.legalName}
              </Typography>
              <Typography sx={{ textAlign: "cecnter" }} variant="caption">
                {account.identity.email}
              </Typography>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Container>
  );
}
