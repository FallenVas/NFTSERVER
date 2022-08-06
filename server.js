import {
  AccountLayout,
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  transfer,
} from "@solana/spl-token";
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import express from "express";
import { readFileSync, promises as fsPromises } from "fs";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import mongoose from "mongoose";
import registered from "./models/whitelisted.js";
import nodemailer from "nodemailer";
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
const port = process.env.PORT || 5000;
try {
  // Connect to the MongoDB cluster
  mongoose.connect(
    process.env.MONGODB_ATLAS,
    { useNewUrlParser: true, useUnifiedTopology: true },
    () => {
      console.log("Mongoose is connected");
      // addMembers();
    }
  );
} catch (e) {
  console.log(e);
  console.log("could not connect");
}
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "cuternft@gmail.com",
    pass: process.env.GMAIL_PASSWORD,
  },
});

app.post("/airdrop", async (req, res) => {
  const { address, email, username, image } = req.body;
  try {
    const members = await registered.find({ approved: true });
    let test = false
    for (const member of members) {
      if (
        address == member.address && member.spots > 0
      ) {
        const signature = await getAirdrop(address);
        member.image = image;
        member.username = username;
        member.email = email;
        member.whitelisted = true;
        member.spots--;
        await member.save();
        const mailOptions = {
          from: "cuternft@gmail.com",
          to: email,
          subject: "Congratulations on The Whitelist",
          html: `  <div style="padding: 0 30%">
        <h1
          style="
            text-align: center;
            font-size: xx-large;
            font-weight: bold;
            margin: 3rem 0;
          "
        >
          CUTER NFT
        </h1>
        <h2 style=" text-align: center; font-size: x-large;">
          CONGRATULATIONS! WELCOME TO CUTER FAMILY!

        </h2>
        <img
          style="margin: 2rem 0 0 0; width: 100%"
          src="https://cdn.discordapp.com/attachments/914595838578282547/1004460792286023740/photo_5994719209646569528_y.png"
        />
        <p style="margin: 0.4rem 0">
          This email confirms that <b><i> ${address}</i></b> successfully received the WL token for CUTER NFT whitelist (CUTELIST). Stay tuned for announcement of the MINT DATE .

        </p>
        <p tyle="margin:0.4rem 0">
          For more info, visit the CUTER NFT page:
          <a href="https://www.cuternft.com"
            >https://www.cuternft.com</a
          >
        </p>
      </div>`,
        };
        transporter.sendMail(mailOptions, function(error, info) {
          if (error) {
            console.log(error);
          } else {
            console.log("Email sent: " + info.response);
          }
        });
        res.json({
          message: "success",
          signature: signature,
        });
        test = true
        break
      }
    }
    if (!test) {
      res.json({
        message: "fail",
        signature: "",
      });
    }

  } catch (err) {
    console.log(err)
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
  const secretKey = Uint8Array.from([
    68, 18, 242, 224, 238, 199, 89, 209, 148, 15, 43, 45, 157, 160, 144, 14, 46,
    56, 136, 160, 36, 91, 141, 6, 15, 46, 194, 105, 160, 1, 153, 36, 189, 150, 69,
    83, 102, 26, 10, 90, 95, 145, 125, 62, 56, 13, 254, 192, 5, 244, 194, 128,
    143, 33, 218, 255, 194, 75, 220, 101, 60, 179, 184, 85
  ]
  );
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
app.get("/", (req, res) => {
  res.json("hello world");
});
app.post("/register", async (req, res) => {
  const { email, address, image, username } = req.body;
  try {
    const isExist = await registered.findOne({ address });
    if (isExist !== null) {
      res.json({
        message: "already",
      });
    } else {
      const newMember = new registered({
        email,
        address,
        image,
        username,
        spots: 1,
        approved: false,
      });
      await newMember.save();
      const mailOptions = {
        from: "cuternft@gmail.com",
        to: email,
        subject: "Welcome to cuterNFT",
        html: `  <div style="padding: 0 30%">
        <h1
          style="
            text-align: center;
            font-size: xx-large;
            font-weight: bold;
            margin: 3rem 0;
          "
        >
          CUTER NFT
        </h1>
        <h2 style=" text-align: center; font-size: x-large;">
          You're registered!
        </h2>
        <img
          style="margin: 2rem 0 0 0; width: 100%"
          src="https://cdn.discordapp.com/attachments/914595838578282547/1003708982235496638/photo_5994719209646569530_y.png"
        />
        <p style="margin: 0.4rem 0">
          This email confirms that<b><i> ${address}</i></b>
          successfully registered for CUTER NFT whitelist (CUTELIST) raffle.You will be informed once you win the CuteList spot.
        </p>
        <p tyle="margin:0.4rem 0">
          For more info, visit the CUTER NFT page:
          <a href="https://www.cuternft.com/raffle"
            >https://www.cuternft.com/raffle</a
          >
        </p>
      </div>`,
      };
      transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });
      res.json({
        message: "success",
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      message: "error",
    });
  }
});

app.get("/getRegistered", async (req, res) => {
  try {
    const members = await registered.find({});
    res.json({ members });
  } catch (error) {
    res.json("error");
  }
});
app.post('/addMember', async (req, res) => {
  const { address, from } = req.body;
  console.log(address)
  console.log(from)
  if (
    from == "Dm4xQ5oGF88fA7qDZT6ygUwEB4m3sHKFaiC43NjcVbBz" ||
    from == "2tJN1QW8LSt3LQPWcHMzrt8oe7NYY7roMTPxV5zHTniW"
  ) {
    try {
      const member = await registered.findOne({ address });
      if (member !== null) {
        member.spots = member.spots + 1;
        await member.save();
        res.json({

          message: "success",
        });
      } else {
        const newMember = new registered({ address, spots: 1, approved: true })
        await newMember.save();
        res.json({
          message: "success",
        });
      }
    } catch (error) {
      res.json("error");
    }
  } else {
    res.json("error");
  }
})
app.post("/approve", async (req, res) => {
  const { address, from } = req.body;
  if (
    from == "Dm4xQ5oGF88fA7qDZT6ygUwEB4m3sHKFaiC43NjcVbBz" ||
    from == "2tJN1QW8LSt3LQPWcHMzrt8oe7NYY7roMTPxV5zHTniW"
  ) {
    try {
      const member = await registered.findOne({ address });
      if (!member.approved) {
        member.approved = true;
        await member.save();
        res.json({
          message: "success",
        });
      }
    } catch (err) {
      res.json({
        message: "error",
      });
    }
  } else {
    res.json({
      message: "error",
    });
  }
});
app.get("/deleteall", async (req, res) => {
  try {
    await registered.deleteMany({});
    res.json({
      message: "success",
    });
  } catch (error) {
    res.json({
      message: "error",
    });
  }
});
const addMembers = async () => {

  const contents = readFileSync("./members.txt", "utf-8");
  const arr = contents.split(/\r?\n/);
  console.log(arr.length);
  for (let i = 0; i < arr.length; i++) {
    let spots = 1;
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] == arr[j]) {
        spots++;
        arr.splice(j, 1);
      }
    }
    const address = arr[i];
    console.log(address);
    console.log(spots);
    const newMember = new registered({
      address,
      spots,
      approved: true,
    });
    await newMember.save();
  }

  console.log("done");
};
app.listen(port, () => {
  console.log("listening on port 5000");
});
