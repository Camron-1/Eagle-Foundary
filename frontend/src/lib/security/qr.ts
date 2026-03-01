import QRCode from 'qrcode';

export async function createQrCodeDataUrl(text: string): Promise<string> {
  if (!text || !text.trim()) {
    throw new Error('QR payload cannot be empty');
  }

  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 360,
  });
}

