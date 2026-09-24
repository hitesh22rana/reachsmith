import "dotenv/config";
import { startGuessWorker } from "./email-guess.ts";
import { startVerifyWorker } from "./email-verify.ts";

// Single process hosting both BullMQ workers: queues stay separate with
// their own concurrency and limits, but there is one log stream, one model
// load, and one container to operate.
startGuessWorker();
startVerifyWorker();

console.log("reachsmith worker running (email-guess + email-verify)");
