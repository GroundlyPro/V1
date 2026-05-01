import twilio from "twilio";

let client: ReturnType<typeof twilio> | null = null;

export function getTwilio() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required.");
  }

  if (!client) {
    client = twilio(accountSid, authToken);
  }

  return client;
}

export function getTwilioFrom() {
  if (!process.env.TWILIO_PHONE_NUMBER) {
    throw new Error("TWILIO_PHONE_NUMBER is not configured.");
  }
  return process.env.TWILIO_PHONE_NUMBER;
}
