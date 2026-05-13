/**
 * Lógica pura multi-torre / modo cultivo (compartida con tests Node).
 * Debe coincidir con MODOS_CULTIVO en la app: lechuga, intensivo, mixto, mini.
 */
(function (g) {
  var VALID_MODOS = ['lechuga', 'intensivo', 'mixto', 'mini'];

  function normalizeTorreModoActual(raw) {
    var m = raw == null || raw === '' ? 'lechuga' : String(raw);
    if (m === 'lechugas') m = 'lechuga';
    return VALID_MODOS.indexOf(m) !== -1 ? m : 'lechuga';
  }

  g.normalizeTorreModoActual = normalizeTorreModoActual;
  g._HC_VALID_MODOS_CULTIVO = VALID_MODOS;
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : self);
