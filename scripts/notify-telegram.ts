import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramMessage(text: string): Promise<boolean> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log('[Telegram] No BOT_TOKEN or CHAT_ID provided, skipping notification.');
    return false;
  }

  const payload = JSON.stringify({
    chat_id: CHAT_ID,
    text,
    parse_mode: 'Markdown'
  });

  return new Promise((resolve) => {
    const req = https.request(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          console.log('[Telegram] Notification message sent successfully.');
          resolve(true);
        } else {
          console.error(`[Telegram] Failed to send message. HTTP Code: ${res.statusCode}`);
          resolve(false);
        }
      }
    );

    req.on('error', (err) => {
      console.error('[Telegram] Network error:', err.message);
      resolve(false);
    });

    req.write(payload);
    req.end();
  });
}
