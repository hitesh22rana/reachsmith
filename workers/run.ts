import "dotenv/config";
import { startGuessWorker } from "./email-guess.ts";

import { startVerifyWorker } from "./email-verify.ts";

startGuessWorker();
startVerifyWorker();

console.log("reachsmith worker running (email-guess + email-verify)");
