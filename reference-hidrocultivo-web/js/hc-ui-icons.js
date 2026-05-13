/**
 * Iconos inline (<use href="#hc-i-*">) alineados con el sprite en index.html.
 * Debe cargarse después del <body> (sprite presente en el DOM).
 */
function hcIcon(symbolId, extraClass) {
  var id = String(symbolId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!id) return '';
  var c = extraClass && String(extraClass).trim() !== '' ? ' ' + String(extraClass).trim() : '';
  return (
    '<svg class="hc-ico' +
    c +
    '" aria-hidden="true" focusable="false"><use href="#' +
    id +
    '"/></svg>'
  );
}
