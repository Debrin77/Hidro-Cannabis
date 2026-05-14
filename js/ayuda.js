// Ayuda nativa — enlaces a HC y resumen de flujo Hydro Cannabis

function renderAyudaPage() {
  const host = document.getElementById('ayudaContent');
  if (!host) return;
  host.innerHTML = `
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-help"></i> Ayuda en esta app</div></div>
      <p class="body-prose">Esta app prioriza <strong>cannabis en hidro</strong> con núcleo <strong>RDWC/DWC</strong> (Medir, variedades, calendario por cepa); NFT, mesa flotante y aeroponía siguen disponibles con aviso de mayor complejidad. Los módulos de <strong>HidroCultivo</strong> (torre, riego por pulsos avanzado, meteo alimentario) se abren embebidos desde <strong>Más</strong> o desde las tarjetas de fusión en Cultivo / Calendario / Historial.</p>
      <ul class="ayuda-flow-list">
        <li><strong>1.</strong> Configura el cultivo en <strong>Cultivo</strong> y actualiza <strong>Climatología</strong> si cultivas fuera. Si tienes <strong>varias instalaciones hidro</strong>, cada una guarda depósito, ubicación, clima en caché y mediciones por separado; la variedad y las semanas del ciclo son comunes.</li>
        <li><strong>2.</strong> Registra lecturas en <strong>Medir</strong>; revisa <strong>Riego</strong> (ET₀ + demanda) y el <strong>Calendario</strong> semanal.</li>
        <li><strong>3.</strong> Historial y gráficos cruzan con tus mediciones guardadas en este dispositivo.</li>
      </ul>
      <div class="ayuda-action-grid">
        <button type="button" class="btn btn-primary" onclick="navToHcEmbed('ayuda')"><i class="ti ti-book"></i> Manual completo (HC)</button>
        <button type="button" class="btn btn-ghost" onclick="navTo('consejos')"><i class="ti ti-bulb"></i> Consejos Hydro</button>
        <button type="button" class="btn btn-ghost" onclick="navTo('legal')"><i class="ti ti-shield-check"></i> Legal España</button>
        <button type="button" class="btn btn-ghost" onclick="navTo('accesibilidad')"><i class="ti ti-palette"></i> Apariencia</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-info-circle"></i> Datos y modelos</div></div>
      <p class="body-prose body-prose--tight">Open-Meteo y geocodificación son servicios públicos; los valores son orientativos. No sustituyen medición real ni asesoramiento jurídico.</p>
      <p class="body-prose body-prose--tight">En cada guardado del cultivo se actualiza un resumen interno (<code>fusion.growContext</code>) con sistema, emplazamiento, depósito, sitios, recinto, prioridad de port (<code>hydroCannabisPortTier</code>) y etiqueta de la instalación activa, para alinear la app con HidroCultivo. Si el pronóstico en <strong>Climatología</strong> es reciente y coincide la rejilla, <strong>Riego</strong> reutiliza esa serie horaria para ET₀/VPD sin repetir la misma petición a la API.</p>
    </div>
  `;
}

window.renderAyudaPage = renderAyudaPage;
