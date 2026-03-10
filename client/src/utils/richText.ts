const escapeHtml = (value: string): string => (
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
);

const applyInlineFormatting = (value: string): string => {
  let formatted = value;

  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/__(.+?)__/g, '<u>$1</u>');
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');

  return formatted;
};

export const formatRichTextToHtml = (value: string): string => {
  if (!value) return '';

  return escapeHtml(value)
    .split(/\r?\n/)
    .map((line) => {
      if (!line) return '';

      const bulletLine = /^\s*[-*]\s+/.test(line)
        ? `• ${line.replace(/^\s*[-*]\s+/, '')}`
        : line;

      return applyInlineFormatting(bulletLine);
    })
    .join('<br />');
};
