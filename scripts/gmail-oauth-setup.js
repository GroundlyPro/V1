/**
 * Gmail OAuth Setup Helper
 * Run: node scripts/gmail-oauth-setup.js
 *
 * Step 1: Paste your Client ID + Secret when prompted, get the auth URL
 * Step 2: Visit the URL, authorize, copy the "code" from the redirect
 * Step 3: Paste the code here — script outputs your GOOGLE_REFRESH_TOKEN
 */

import https from "node:https";
import readline from "node:readline";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function exchangeCodeForToken(clientId, clientSecret, code) {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: "urn:ietf:wg:oauth:2.0:oob",
    grant_type: "authorization_code",
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "oauth2.googleapis.com",
        path: "/token",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body.toString()),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error("Failed to parse response: " + data));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body.toString());
    req.end();
  });
}

async function main() {
  console.log("\n=== Growndly Gmail OAuth Setup ===\n");
  console.log("You need a Google Cloud project with the Gmail API enabled.");
  console.log("Create OAuth 2.0 credentials (Desktop app type) at:");
  console.log("  https://console.cloud.google.com/apis/credentials\n");

  const clientId = (await ask("Paste your GOOGLE_CLIENT_ID: ")).trim();
  const clientSecret = (await ask("Paste your GOOGLE_CLIENT_SECRET: ")).trim();

  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: "urn:ietf:wg:oauth:2.0:oob",
      response_type: "code",
      scope: "https://www.googleapis.com/auth/gmail.send",
      access_type: "offline",
      prompt: "consent",
    });

  console.log("\n--- Step 1: Open this URL in your browser ---");
  console.log(authUrl);
  console.log("\nSign in with infomymaidspro@gmail.com, allow access,");
  console.log('then copy the authorization code shown on the page.\n');

  const code = (await ask("Paste the authorization code: ")).trim();

  console.log("\nExchanging code for refresh token...");
  const token = await exchangeCodeForToken(clientId, clientSecret, code);

  if (token.error) {
    console.error("\nError:", token.error, token.error_description ?? "");
    rl.close();
    return;
  }

  console.log("\n=== SUCCESS — add these to your .env.local ===\n");
  console.log(`GOOGLE_CLIENT_ID=${clientId}`);
  console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`);
  console.log(`GOOGLE_REFRESH_TOKEN=${token.refresh_token}`);
  console.log(`GMAIL_FROM_EMAIL=infomymaidspro@gmail.com`);
  console.log("\n================================================\n");

  rl.close();
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  rl.close();
  process.exit(1);
});
