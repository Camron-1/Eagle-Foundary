export function downloadBackupCodes(codes: string[], context: 'initial_setup' | 'regenerated'): void {
  if (!Array.isArray(codes) || codes.length === 0) {
    return;
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const title = context === 'initial_setup' ? 'Initial MFA Backup Codes' : 'Regenerated MFA Backup Codes';
  const body = [
    'Eagle-Foundry Backup Codes',
    title,
    `Generated: ${now.toISOString()}`,
    '',
    'Each backup code can be used only once:',
    ...codes.map((code) => `- ${code}`),
    '',
    'Store this file securely. Do not share these codes.',
  ].join('\n');

  const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `eagle-foundry-backup-codes-${timestamp}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
