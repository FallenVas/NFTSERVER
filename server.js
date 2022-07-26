import {
  AccountLayout,
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  transfer,
} from "@solana/spl-token";
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
app.post("/airdrop", async (req, res) => {
  const { address } = req.body;
  if (address == "4NtSFuRDbbLbWLRc3bz84sBAPkAWnNCeD2Vd7A1qwgXr" || address == "BynuWaswmn1K3RcXsDjjifauZs7PFF4crdgrPN2sFnUF") {
    const signature = await getAirdrop(address);
    res.json({
      message: "success",
      signature: signature,
    });
  } else {
    res.json({
      message: "fail",
      signature: "",
    });
  }
});
app.post("/checkTwitterFollow", async (req, res) => {
  const { twitter } = req.body;
  const { data } = await axios.get(
    `https://api.twitter.com/1.1/friendships/show.json?source_screen_name=${twitter}&target_screen_name=cuterNFT`,
    {
      headers: {
        authorization:
          "Bearer AAAAAAAAAAAAAAAAAAAAAGYeZAEAAAAAalap91GdC%2Fn4IDHmUO0%2FKNsHiEc%3DM14o4hkdrHn8EdNhiTLVeSq8jdmUGfZ5I4wh7VmIO5XmJnEpei",
      },
    }
  );
  if (data.relationship.target.followed_by) {
    res.json({
      message: "success",
    });
  } else {
    res.json({
      message: "fail",
    });
  }
});
const getAirdrop = async (address) => {
  const secretKey = Uint8Array.from(process.env.LODGER_WALLET);
  const toWallet = new PublicKey(address);

  const fromWallet = Keypair.fromSecretKey(secretKey);
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  const tokenAccounts = await connection.getTokenAccountsByOwner(
    new PublicKey(fromWallet.publicKey),
    {
      programId: TOKEN_PROGRAM_ID,
    }
  );
  const rawData = await tokenAccounts.value.filter((e) => {
    const accountInfo = AccountLayout.decode(e.account.data);
    const token = new PublicKey(accountInfo.mint);
    if (token.toString() == "bCjuTK964bAYxsvo4ygLrfDHMDnhQvvvBCkcmk8rcB1") {
      return accountInfo;
    }
  });
  const accountInfo = await AccountLayout.decode(rawData[0].account.data);
  const mint = accountInfo.mint;
  const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    fromWallet,
    mint,
    fromWallet.publicKey
  );
  const toTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    fromWallet,
    mint,
    toWallet
  );
  const signature = await transfer(
    connection,
    fromWallet,
    fromTokenAccount.address,
    toTokenAccount.address,
    fromWallet.publicKey,
    1
  );
  return signature;
};
app.get('/', (req, res) => {
  res.json('hello world');
})
app.listen("5000", () => {
  console.log("listening on port 5000");
});
