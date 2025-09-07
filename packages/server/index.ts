import type { Request, Response } from "express";
import express from "express";

const app = express();
const port = 3000;

app.get("/", (req: Request, res: Response) => {
  //   res.send("Hello via Express!");
  res.send("key: " + process.env.OPENAI_API_KEY);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
