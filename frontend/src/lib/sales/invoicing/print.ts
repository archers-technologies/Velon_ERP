export function openPrintPreview(html: string, title = 'Print preview'): void {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1100');
  if (!win) {
    throw new Error('Pop-up blocked — allow pop-ups to print invoices.');
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.document.title = title;
  win.focus();
  win.onload = () => {
    win.print();
  };
}

export function downloadHtmlAsFile(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
