import { Resend } from "resend";

let resend: Resend | null = null;

export function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured.");
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export function getFromAddress() {
  return process.env.RESEND_FROM_EMAIL ?? "noreply@groundlypro.com";
}

export function invoiceEmailHtml({
  businessName,
  clientName,
  invoiceNumber,
  totalAmount,
  dueDate,
  paymentLink,
}: {
  businessName: string;
  clientName: string;
  invoiceNumber: string;
  totalAmount: string;
  dueDate: string;
  paymentLink?: string;
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:32px auto;">
    <tr><td style="background:#0d1c2e;padding:24px 32px;border-radius:12px 12px 0 0;">
      <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px">${businessName}</span>
    </td></tr>
    <tr><td style="background:#fff;padding:32px;border-left:1px solid #e4ecf3;border-right:1px solid #e4ecf3;">
      <p style="margin:0 0 8px;color:#4a6070;font-size:15px">Hi ${clientName},</p>
      <p style="margin:0 0 24px;color:#1a2d3d;font-size:15px">You have a new invoice from <strong>${businessName}</strong>.</p>
      <table width="100%" style="background:#f4f7fa;border-radius:8px;padding:20px;margin-bottom:24px;">
        <tr>
          <td style="color:#9baab8;font-size:12px;text-transform:uppercase;letter-spacing:0.8px">Invoice</td>
          <td style="color:#9baab8;font-size:12px;text-transform:uppercase;letter-spacing:0.8px">Amount Due</td>
          <td style="color:#9baab8;font-size:12px;text-transform:uppercase;letter-spacing:0.8px">Due Date</td>
        </tr>
        <tr>
          <td style="color:#1a2d3d;font-size:18px;font-weight:700;padding-top:6px">${invoiceNumber}</td>
          <td style="color:#007bb8;font-size:18px;font-weight:700;padding-top:6px">${totalAmount}</td>
          <td style="color:#1a2d3d;font-size:15px;padding-top:6px">${dueDate}</td>
        </tr>
      </table>
      ${paymentLink ? `<div style="text-align:center;margin-bottom:24px"><a href="${paymentLink}" style="display:inline-block;background:linear-gradient(135deg,#007bb8,#0097e6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px">Pay Now</a></div>` : ""}
      <p style="margin:0;color:#9baab8;font-size:13px">If you have questions, reply to this email or contact ${businessName} directly.</p>
    </td></tr>
    <tr><td style="background:#f4f7fa;padding:16px 32px;text-align:center;border-radius:0 0 12px 12px;border:1px solid #e4ecf3;border-top:none;">
      <p style="margin:0;color:#9baab8;font-size:12px">Sent via Groundly PRO</p>
    </td></tr>
  </table>
</body>
</html>`;
}

export function quoteEmailHtml({
  businessName,
  clientName,
  quoteTitle,
  totalAmount,
  validUntil,
  message,
  approveLink,
}: {
  businessName: string;
  clientName: string;
  quoteTitle: string;
  totalAmount: string;
  validUntil: string;
  message?: string;
  approveLink?: string;
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:32px auto;">
    <tr><td style="background:#0d1c2e;padding:24px 32px;border-radius:12px 12px 0 0;">
      <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px">${businessName}</span>
    </td></tr>
    <tr><td style="background:#fff;padding:32px;border-left:1px solid #e4ecf3;border-right:1px solid #e4ecf3;">
      <p style="margin:0 0 8px;color:#4a6070;font-size:15px">Hi ${clientName},</p>
      <p style="margin:0 0 24px;color:#1a2d3d;font-size:15px">You have a new quote from <strong>${businessName}</strong>.</p>
      <table width="100%" style="background:#f4f7fa;border-radius:8px;padding:20px;margin-bottom:${message ? "16px" : "24px"};">
        <tr>
          <td style="color:#9baab8;font-size:12px;text-transform:uppercase;letter-spacing:0.8px">Quote</td>
          <td style="color:#9baab8;font-size:12px;text-transform:uppercase;letter-spacing:0.8px">Total</td>
          <td style="color:#9baab8;font-size:12px;text-transform:uppercase;letter-spacing:0.8px">Valid Until</td>
        </tr>
        <tr>
          <td style="color:#1a2d3d;font-size:15px;font-weight:600;padding-top:6px">${quoteTitle}</td>
          <td style="color:#007bb8;font-size:18px;font-weight:700;padding-top:6px">${totalAmount}</td>
          <td style="color:#1a2d3d;font-size:15px;padding-top:6px">${validUntil}</td>
        </tr>
      </table>
      ${message ? `<div style="background:#f4f7fa;border-left:3px solid #007bb8;padding:12px 16px;margin-bottom:24px;border-radius:0 6px 6px 0;"><p style="margin:0;color:#4a6070;font-size:14px;font-style:italic">"${message}"</p></div>` : ""}
      ${approveLink ? `<div style="text-align:center;margin-bottom:24px"><a href="${approveLink}" style="display:inline-block;background:linear-gradient(135deg,#007bb8,#0097e6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px">View &amp; Approve Quote</a></div>` : ""}
      <p style="margin:0;color:#9baab8;font-size:13px">If you have questions, reply to this email or contact ${businessName} directly.</p>
    </td></tr>
    <tr><td style="background:#f4f7fa;padding:16px 32px;text-align:center;border-radius:0 0 12px 12px;border:1px solid #e4ecf3;border-top:none;">
      <p style="margin:0;color:#9baab8;font-size:12px">Sent via Groundly PRO</p>
    </td></tr>
  </table>
</body>
</html>`;
}
