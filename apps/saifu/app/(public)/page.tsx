"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AccountId, Account } from "@ticketto/types";

import { TickettoClientContext } from "@kippu/ticketto-react-provider";
import { Identicon } from "@polkadot/react-identicon";
import { Container, Paper, Stack, Typography } from "@mui/material";
import parsePhoneNumber from "libphonenumber-js";

export default function RootPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const client = useContext(TickettoClientContext);
  const router = useRouter();

  const fetchAccounts = useCallback(async () => {
    return client?.directory.query.all();
  }, [client]);

  useEffect(() => {
    fetchAccounts().then((accounts) => setAccounts(accounts ?? []));
  }, [fetchAccounts]);

  async function setAccountId(accountId: AccountId) {
    router.push(`/auth/login?accountId=${accountId}`);
  }

  return (
    <Container sx={{ height: "100dvh" }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={2}
        sx={{ width: "100%", height: "100dvh" }}
      >
        {accounts.map((account) => (
          <Paper
            key={account.id.toString()}
            onClick={() => setAccountId(account.id)}
            elevation={3}
          >
            <Stack
              padding={2}
              direction="column"
              alignItems="center"
              justifyContent="center"
              maxWidth="100%"
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
                onCopy={() => {}}
              />
              <Typography sx={{ textAlign: "cecnter" }} variant="button">
                {account?.identity?.display}
              </Typography>
              <Typography
                noWrap
                sx={{ textAlign: "center" }}
                maxWidth="100%"
                variant="caption"
              >
                {parsePhoneNumber(
                  account?.identity?.phone ?? "",
                  "US"
                )?.formatNational()}
              </Typography>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Container>
  );
}
