import axios from 'axios';
import logger from '../utils/logger';

/** Direct Telegram Bot API — fallback when COMMS agregator nije podešen. */
export async function sendTelegramDirect(
  botToken: string,
  chatId: string,
  text: string
): Promise<boolean> {
  const token = botToken.trim();
  const chat = chatId.trim();
  if (!token || !chat) return false;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await axios.post(
      url,
      {
        chat_id: chat,
        text: text.slice(0, 4000),
        disable_web_page_preview: true,
      },
      { timeout: 12_000 }
    );
    return res.status >= 200 && res.status < 300 && res.data?.ok === true;
  } catch (err) {
    logger.warn('Telegram direct send failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
