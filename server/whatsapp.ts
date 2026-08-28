/**
 * Capitabee Financial Services CRM - Server-Side WhatsApp Business Service
 * Secure provider gateway using Meta WhatsApp Business Cloud API.
 * Keeps all API secrets and tokens strictly on the server-side.
 * Official WhatsApp Business Number: +91 8010886625
 */

import {
  cleanPhoneNumber,
  renderWhatsAppTemplate,
  WhatsAppTemplateKey,
  WhatsAppTemplateParams,
  WHATSAPP_CONFIG,
} from '../src/config/whatsappTemplates';

export interface WhatsAppSendResult {
  success: boolean;
  status: 'Not Connected' | 'Queued' | 'Sent' | 'Delivered' | 'Failed';
  message: string;
  providerMessageId?: string;
  isConfigured: boolean;
}

export function isWhatsAppConfigured(): boolean {
  const apiKey = process.env.WHATSAPP_API_KEY || process.env.WHATSAPP_API_TOKEN || process.env.META_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  return Boolean(apiKey && apiKey.trim() && phoneId && phoneId.trim());
}

/**
 * Dispatches a WhatsApp notification to a customer phone number.
 * STRIKE MANDATE: Never fake API success.
 * If credentials are not configured, returns 'Not Connected' and "WhatsApp service is not connected yet."
 */
export async function sendWhatsAppNotification(
  recipientPhone: string,
  templateKey: WhatsAppTemplateKey,
  params: WhatsAppTemplateParams
): Promise<WhatsAppSendResult> {
  const apiKey = process.env.WHATSAPP_API_KEY || process.env.WHATSAPP_API_TOKEN || process.env.META_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!apiKey || !apiKey.trim() || !phoneId || !phoneId.trim()) {
    return {
      success: false,
      status: 'Not Connected',
      message: WHATSAPP_CONFIG.serviceNotConnectedMessage,
      isConfigured: false,
    };
  }

  const cleanPhone = cleanPhoneNumber(recipientPhone);
  if (!cleanPhone || cleanPhone.length < 10) {
    return {
      success: false,
      status: 'Failed',
      message: 'Invalid recipient phone number format.',
      isConfigured: true,
    };
  }

  const messageText = renderWhatsAppTemplate(templateKey, params);

  try {
    const url = `https://graph.facebook.com/v18.0/${phoneId.trim()}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: messageText,
        },
      }),
    });

    const data: any = await res.json();

    if (res.ok && data?.messages?.[0]?.id) {
      return {
        success: true,
        status: 'Sent',
        message: 'Message dispatched successfully to WhatsApp recipient.',
        providerMessageId: data.messages[0].id,
        isConfigured: true,
      };
    }

    const errMsg = data?.error?.message || 'Meta WhatsApp provider rejected the dispatch request.';
    return {
      success: false,
      status: 'Failed',
      message: errMsg,
      isConfigured: true,
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'Failed',
      message: err.message || 'Network failure communicating with WhatsApp gateway.',
      isConfigured: true,
    };
  }
}
