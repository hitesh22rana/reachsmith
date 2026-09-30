import "dotenv/config";
import { startGuessWorker } from "./email-guess.ts";

startGuessWorker();

console.log("reachsmith worker running (email-guess)");
