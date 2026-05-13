/** Config agua/sustrato y base municipios EC. Tras hc-setup-registro.js. */
// ══════════════════════════════════════════════════
// CONFIGURACIÓN AGUA Y SUSTRATO
// ══════════════════════════════════════════════════

// ── Base de datos EC agua del grifo por municipio ───────────────────────────
// Fuente: SINAC Ministerio de Sanidad + análisis medios conocidos
// EC en µS/cm (media anual aproximada)
const AGUA_MUNICIPIOS = {
  // Comunidad Valenciana
  "Castelló de la Plana":  { ec: 850, dureza: "Muy dura",  nota: "Agua del río Mijares — muy dura" },
  "Valencia":              { ec: 620, dureza: "Dura",       nota: "Mezcla ríos Turia y Júcar" },
  "Alicante":              { ec: 740, dureza: "Dura",       nota: "Agua desalada + acuíferos" },
  "Elche":                 { ec: 780, dureza: "Muy dura",   nota: "Acuíferos locales" },
  "Torrevieja":            { ec: 690, dureza: "Dura",       nota: "Desaladora del Júcar" },
  "Benidorm":              { ec: 680, dureza: "Dura",       nota: "Marina Baixa" },
  "Gandia":                { ec: 590, dureza: "Dura",       nota: "Río Serpis" },
  "Sagunto":               { ec: 710, dureza: "Dura",       nota: "Canal del Camp de Morvedre" },
  "Torrent":               { ec: 600, dureza: "Dura",       nota: "EMIVASA Valencia" },
  "Vila-real":             { ec: 830, dureza: "Muy dura",   nota: "Mismo sistema que Castelló" },
  // CV — Plana / Maestrat / interior Castelló (aguas duras, referencia Mijares–red provincial)
  "Almassora":             { ec: 840, dureza: "Muy dura",   nota: "Plana — red próxima a Castelló" },
  "Burriana":              { ec: 820, dureza: "Muy dura",   nota: "Litoral norte Castelló" },
  "Benicarló":             { ec: 800, dureza: "Dura",       nota: "Baix Maestrat — agua dura típica" },
  "Vinaròs":               { ec: 790, dureza: "Dura",       nota: "Litoral nord — similar Benicarló" },
  "Onda":                  { ec: 860, dureza: "Muy dura",   nota: "Interior Plana Alta" },
  "Nules":                 { ec: 850, dureza: "Muy dura",   nota: "Plana Baixa — similar Vila-real" },
  "Peníscola":             { ec: 795, dureza: "Dura",       nota: "Litoral norte — acuífero y red local" },
  "Morella":               { ec: 720, dureza: "Dura",       nota: "Els Ports — manantiales y mezcla red" },
  "Segorbe":               { ec: 740, dureza: "Dura",       nota: "Alto Palancia — interior Castelló" },
  "Vilafranca del Cid":    { ec: 715, dureza: "Dura",       nota: "Alt Maestrat — manantiales y red" },
  "Monòver":               { ec: 728, dureza: "Dura",       nota: "Vinalopó Medio — similar Elda" },
  // CV — Horta / Safor / Ribera / interior València
  "Alzira":                { ec: 640, dureza: "Dura",       nota: "Ribera Alta — Júcar / red valenciana" },
  "Sueca":                 { ec: 610, dureza: "Dura",       nota: "Litoral sud — acuíferos costeros" },
  "Cullera":               { ec: 600, dureza: "Dura",       nota: "Túria / red metropolitana sur" },
  "Xàtiva":                { ec: 680, dureza: "Dura",       nota: "Costera — acuíferos y red interior" },
  "Ontinyent":             { ec: 700, dureza: "Dura",       nota: "Vall d'Albaida — dura" },
  "Manises":               { ec: 610, dureza: "Dura",       nota: "Àrea metropolitana — mixta EMIVASA" },
  "Burjassot":             { ec: 615, dureza: "Dura",       nota: "Metropolitana Valencia" },
  "Paterna":               { ec: 605, dureza: "Dura",       nota: "Metropolitana — similar Torrent" },
  "Mislata":               { ec: 615, dureza: "Dura",       nota: "Metropolitana Valencia" },
  "Xirivella":             { ec: 618, dureza: "Dura",       nota: "Metropolitana Valencia" },
  "Oliva":                 { ec: 580, dureza: "Dura",       nota: "Safor — similar Gandia" },
  "Carcaixent":            { ec: 650, dureza: "Dura",       nota: "Ribera Alta — Júcar" },
  // CV — Marina / Alacantí / Vinalopó / Vega Baja
  "Dénia":                 { ec: 650, dureza: "Dura",       nota: "Marina Alta — acuíferos y red" },
  "Calp":                  { ec: 670, dureza: "Dura",       nota: "Marina Alta — similar Benidorm" },
  "Altea":                 { ec: 660, dureza: "Dura",       nota: "Marina Baixa" },
  "Xàbia":                 { ec: 640, dureza: "Dura",       nota: "Marina Alta" },
  "Orihuela":              { ec: 760, dureza: "Dura",       nota: "Vega Baja — trasvase y acuíferos" },
  "Elda":                  { ec: 720, dureza: "Dura",       nota: "Vinalopó Medio — muy mineralizada" },
  "Alcoi":                 { ec: 690, dureza: "Dura",       nota: "Hoya de Alcoy — manantiales y red" },
  "Villena":               { ec: 710, dureza: "Dura",       nota: "Alto Vinalopó" },
  "Novelda":               { ec: 750, dureza: "Muy dura",   nota: "Medio Vinalopó — muy dura" },
  "Crevillent":            { ec: 770, dureza: "Muy dura",   nota: "Bajo Vinalopó — similar Elche" },
  "Santa Pola":            { ec: 700, dureza: "Dura",       nota: "Litoral — acuífero y salinas" },
  "Guardamar del Segura":  { ec: 720, dureza: "Dura",       nota: "Litoral sur — trasvase" },
  "La Vila Joiosa":        { ec: 675, dureza: "Dura",       nota: "Marina Baixa — similar Benidorm" },
  "Finestrat":             { ec: 670, dureza: "Dura",       nota: "Marina Baixa" },
  "Callosa d'en Sarrià":   { ec: 655, dureza: "Dura",       nota: "Marina Baixa interior" },
  "Ibi":                   { ec: 695, dureza: "Dura",       nota: "Alcoià — similar Alcoi" },
  "Mutxamel":              { ec: 735, dureza: "Dura",       nota: "Camp d'Alacant — similar Alicante" },
  "San Vicente del Raspeig": { ec: 745, dureza: "Dura",     nota: "Camp d'Alacant — campus y red urbana" },
  "El Campello":           { ec: 710, dureza: "Dura",       nota: "Litoral — mezcla acuífero" },
  // Cataluña
  "Barcelona":             { ec: 180, dureza: "Blanda",     nota: "Río Ter — blanda en España" },
  "L'Hospitalet":          { ec: 190, dureza: "Blanda",     nota: "Red metropolitana Barcelona" },
  "Badalona":              { ec: 195, dureza: "Blanda",     nota: "Red metropolitana Barcelona" },
  "Terrassa":              { ec: 210, dureza: "Blanda",     nota: "Consorci Aigues Ter-Llobregat" },
  "Sabadell":              { ec: 205, dureza: "Blanda",     nota: "Consorci Aigues Ter-Llobregat" },
  "Tarragona":             { ec: 420, dureza: "Moderada",   nota: "Río Ebre" },
  "Lleida":                { ec: 480, dureza: "Moderada",   nota: "Canal d'Urgell" },
  "Girona":                { ec: 210, dureza: "Blanda",     nota: "Río Ter" },
  // Madrid
  "Madrid":                { ec: 250, dureza: "Blanda",     nota: "Embalses sierra — muy buena" },
  "Alcalá de Henares":     { ec: 380, dureza: "Moderada",   nota: "Canal de Isabel II" },
  "Leganés":               { ec: 260, dureza: "Blanda",     nota: "Canal de Isabel II" },
  "Getafe":                { ec: 270, dureza: "Blanda",     nota: "Canal de Isabel II" },
  "Alcorcón":              { ec: 255, dureza: "Blanda",     nota: "Canal de Isabel II" },
  "Torrejón de Ardoz":     { ec: 390, dureza: "Moderada",   nota: "Canal de Isabel II" },
  // Andalucía
  "Sevilla":               { ec: 420, dureza: "Moderada",   nota: "Río Guadalquivir" },
  "Málaga":                { ec: 390, dureza: "Moderada",   nota: "Embalse del Guadalhorce" },
  "Córdoba":               { ec: 450, dureza: "Moderada",   nota: "Río Guadalquivir" },
  "Granada":               { ec: 280, dureza: "Blanda",     nota: "Sierra Nevada — buena calidad" },
  "Almería":               { ec: 710, dureza: "Dura",       nota: "Acuíferos + desaladora" },
  "Cádiz":                 { ec: 350, dureza: "Moderada",   nota: "Embalses locales" },
  "Jerez de la Frontera":  { ec: 460, dureza: "Moderada",   nota: "Embalse de Guadalcacín" },
  "Huelva":                { ec: 380, dureza: "Moderada",   nota: "Embalse del Chanza" },
  "Jaén":                  { ec: 320, dureza: "Moderada",   nota: "Embalse del Quiebrajano" },
  // País Vasco
  "Bilbao":                { ec: 170, dureza: "Muy blanda", nota: "Embalse de Ordunte — excelente" },
  "San Sebastián":         { ec: 165, dureza: "Muy blanda", nota: "Urumea — agua de montaña" },
  "Vitoria-Gasteiz":       { ec: 175, dureza: "Muy blanda", nota: "Embalse de Ullibarri" },
  // Aragón / Navarra / La Rioja
  "Zaragoza":              { ec: 540, dureza: "Dura",        nota: "Río Ebro" },
  "Pamplona":              { ec: 290, dureza: "Blanda",      nota: "Embalse de Eugui" },
  "Logroño":               { ec: 380, dureza: "Moderada",    nota: "Río Ebro — embalse Pajares" },
  // Castilla y León / Castilla-La Mancha
  "Valladolid":            { ec: 320, dureza: "Moderada",    nota: "Río Duero" },
  "Burgos":                { ec: 280, dureza: "Blanda",      nota: "Río Arlanzón" },
  "Salamanca":             { ec: 290, dureza: "Blanda",      nota: "Río Tormes" },
  "Toledo":                { ec: 490, dureza: "Moderada",    nota: "Río Tajo" },
  "Albacete":              { ec: 560, dureza: "Dura",        nota: "Acuíferos manchegos" },
  // Galicia
  "Vigo":                  { ec: 120, dureza: "Muy blanda",  nota: "Embalse de Eiras — la más blanda" },
  "A Coruña":              { ec: 130, dureza: "Muy blanda",  nota: "Embalse de Cecebre" },
  "Santiago de Compostela":{ ec: 125, dureza: "Muy blanda",  nota: "Embalse de Pontevea" },
  // Murcia / Extremadura
  "Murcia":                { ec: 680, dureza: "Dura",        nota: "Trasvase Tajo-Segura" },
  "Cartagena":             { ec: 720, dureza: "Dura",        nota: "Desaladora + trasvase" },
  "Badajoz":               { ec: 290, dureza: "Blanda",      nota: "Río Guadiana" },
  "Cáceres":               { ec: 210, dureza: "Blanda",      nota: "Embalse de Valdesalor" },
  // Islas
  "Palma de Mallorca":     { ec: 620, dureza: "Dura",        nota: "Acuíferos + desaladora" },
  "Las Palmas de GC":      { ec: 660, dureza: "Dura",        nota: "Desaladora oceánica" },
  "Santa Cruz de Tenerife":{ ec: 580, dureza: "Dura",        nota: "Desaladora + galerías" },
  // Asturias / Cantabria
  "Oviedo":                { ec: 155, dureza: "Muy blanda",  nota: "Embalse de Trasona" },
  "Gijón":                 { ec: 160, dureza: "Muy blanda",  nota: "Embalse de Trasona" },
  "Santander":             { ec: 145, dureza: "Muy blanda",  nota: "Embalse del Ebro" },
};

/** Normaliza texto para comparar municipios (minúsculas, sin tildes). */
function normalizaMunicipioStr(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Sinónimos toponímicos (valenciano/castellano u otras grafías) → clave canónica en AGUA_MUNICIPIOS.
 * Así "Castellón", "Castelló" o "Castellón de la Plana" encuentran el mismo registro que Castelló de la Plana.
 */
const MUNICIPIO_ALIAS_A_CANON = (() => {
  const m = Object.create(null);
  const reg = (aliasList, canon) => {
    aliasList.forEach(a => {
      const k = normalizaMunicipioStr(a);
      if (k) m[k] = canon;
    });
  };
  // ── Comunitat Valenciana: bilingüe (valencià / castellà) y grafías habituales ──
  reg(['Castellón de la Plana', 'Castellón', 'Castello de la Plana', 'Castello', 'Castelló', 'Castelló de la Plana', 'La Plana'], 'Castelló de la Plana');
  reg(['València', 'Valencia ciutat', 'Valéncia', 'Ciutat de Valencia', 'Ciudad de Valencia'], 'Valencia');
  reg(['Alacant', 'Alicante ciudad', 'Alacant ciutat'], 'Alicante');
  reg(['Elx', 'Elche ciudad'], 'Elche');
  reg(['Gandía', 'Gandia ciudad', 'La Safor'], 'Gandia');
  reg(['Sagunt', 'Murviedro', 'Sagunto ciudad'], 'Sagunto');
  reg(['Villarreal', 'Vila Real', 'Vila-real', 'Vila Real de'], 'Vila-real');
  reg(['Almazora', 'Almassora', 'Almazara'], 'Almassora');
  reg(['Borriana', 'Borrianes'], 'Burriana');
  reg(['Benicarlo'], 'Benicarló');
  reg(['Vinaroz', 'Vinaros', 'Vinaròs'], 'Vinaròs');
  reg(['Peniscola', 'Peníscola', 'Peñíscola'], 'Peníscola');
  reg(['Moixent', 'Mogente'], 'Xàtiva');
  reg(['Montesa'], 'Ontinyent');
  reg(['Alcira', 'Algezira', 'Alzira ciutat'], 'Alzira');
  reg(['Játiva', 'Xativa'], 'Xàtiva');
  reg(['Onteniente'], 'Ontinyent');
  reg(['Denia', 'Diana'], 'Dénia');
  reg(['Calpe'], 'Calp');
  reg(['Jávea', 'Javea', 'Xabia'], 'Xàbia');
  reg(['Oriola', 'Orihuela ciudad'], 'Orihuela');
  reg(['Petrer', 'Petrer de los Valles', 'Petrer dels Alagons'], 'Elda');
  reg(['Alcoy', 'Alcoy de', 'Alcoi ciutat'], 'Alcoi');
  reg(['Crevillente'], 'Crevillent');
  reg(['Villajoyosa', 'La Vila Joiosa', 'Vila Joiosa', 'Vila-Joiosa', 'La Vila'], 'La Vila Joiosa');
  reg(['Callosa', "Callosa d'En Sarrià", 'Callosa den Sarria'], "Callosa d'en Sarrià");
  reg(['San Vicente del Raspeig', 'Sant Vicent del Raspeig', 'San Vicente', 'Sant Vicent'], 'San Vicente del Raspeig');
  reg(['Muchamiel', 'Mutxamel'], 'Mutxamel');
  reg(['El Campello', "L'Altet", "l'Altet"], 'El Campello');
  reg(['Guardamar'], 'Guardamar del Segura');
  reg(['Monover', 'Monòver'], 'Monòver');
  reg(['Elda ciudad'], 'Elda');
  reg(['Novelda ciudad'], 'Novelda');
  reg(['Villena ciudad'], 'Villena');
  reg(['Ibi ciudad'], 'Ibi');
  reg(['Finestrat ciudad'], 'Finestrat');
  reg(['Santa Pola ciudad'], 'Santa Pola');
  reg(['Torrevieja ciudad', 'Torrevella', 'Torrevella de la Mata'], 'Torrevieja');
  reg(['Benidorm ciudad'], 'Benidorm');
  reg(['Torrent ciudad', 'Torrent de'], 'Torrent');
  reg(['Manises ciudad'], 'Manises');
  reg(['Burjassot ciudad'], 'Burjassot');
  reg(['Paterna ciudad'], 'Paterna');
  reg(['Mislata ciudad'], 'Mislata');
  reg(['Xirivella ciudad', 'Chirivella'], 'Xirivella');
  reg(['Carcaixent ciudad', 'Carcagente'], 'Carcaixent');
  reg(['Cullera ciudad'], 'Cullera');
  reg(['Sueca ciudad'], 'Sueca');
  reg(['Oliva ciudad', "l'Oliva"], 'Oliva');
  reg(['Morella ciudad'], 'Morella');
  reg(['Onda ciudad'], 'Onda');
  reg(['Nules ciudad'], 'Nules');
  reg(['Benicarló ciudad', 'Benicarlo ciudad'], 'Benicarló');
  reg(['Burriana ciudad', 'Borriana ciudad'], 'Burriana');
  reg(['Almassora ciudad', 'Almazora ciudad'], 'Almassora');
  // CV — pueblos frecuentes → municipio de referencia (misma comarca / red)
  reg(['Almenara', 'Tales', 'La Llosa', 'Moncofa', 'Chilches', 'Xilxes', 'La Vilavella', 'Les Alqueries', 'Alqueries'], 'Nules');
  reg(['Vall d Uixó', 'Vall d Uxo', 'La Vall d Uixó', 'Vall duixo'], 'Nules');
  reg(['Betxí', 'Betxi', 'Betchi'], 'Vila-real');
  reg(['Alqueries', 'Alquerias del Niño Perdido', 'Alqueríes del Niño Perdido', 'Alquerias'], 'Almassora');
  reg(['Cabanes', 'Cabanes de Mar', 'Orpesa', 'Oropesa del Mar', 'Orpesa del Mar'], 'Benicarló');
  reg(['Benicasim', 'Benicàssim', 'Benicasim playa'], 'Castelló de la Plana');
  reg(['Alcalà de Xivert', 'Alcala de Chivert', 'Torreblanca', 'Torreblanca playa'], 'Benicarló');
  reg(['Alcora', "l'Alcora", 'Alcora ciudad'], 'Onda');
  reg(['Lucena del Cid', 'Lucena Cid', 'Useras', 'Les Useres'], 'Onda');
  reg(['Segorbe', 'Segorb', 'Altura', 'Soneja', 'Soneixa'], 'Segorbe');
  reg(['Vilafranca', 'Vilafranca del Cid', 'Villafranca del Cid', 'Villafranca'], 'Vilafranca del Cid');
  reg(['Silla', 'Silla Valencia', 'Albalat de la Ribera', 'Albalat Ribera', 'Guadassuar', 'L Alcudia', "L'Alcúdia", 'Alcudia Valencia', 'Carlet', 'Alginet', 'Benimodo', 'Catadau', 'Llombai', 'Llocnou'], 'Carcaixent');
  reg(['Tavernes de la Valldigna', 'Tavernes Valldigna', 'Xeraco', 'Jaraco', 'Xeresa', 'Platja Xeraco'], 'Cullera');
  reg(['Cullera playa', 'Favara', 'Favara Ribera', 'Antella', 'Alberic', 'Benimuslem'], 'Alzira');
  reg(['L Eliana', "L'Eliana", 'La Eliana', 'La Pobla de Vallbona', 'Pobla Vallbona', 'Ribarroja', 'Riba-roja de Túria', 'Ribarroja del Turia', 'Benaguasil', 'Benisanó', 'Llíria', 'Liria', 'Marines', 'Gátova', 'Gatova', 'Olocau', 'Pedralba', 'Vilamarxant', 'Villamarchante'], 'Paterna');
  reg(['Quart de Poblet', 'Quart Poblet', 'Quart de les Valls', 'Aldaia', 'Adaya', 'Alaquàs', 'Alaquas', 'Albal', 'Albal Valencia', 'Alcàsser', 'Alcasser', 'Alfafar', 'Alfafar Valencia', 'Albalat dels Sorells', 'Albalat Sorells', 'Albalat dels Tarongers', 'Alboraya', 'Alboraia', 'Almàssera', 'Almàssera Valencia', 'Almassera', 'Benetússer', 'Benetusser', 'Beniparell', 'Benisano', 'Bétera', 'Betera', 'Bonrepòs i Mirambell', 'Bonrepos Mirambell', 'Burjassot playa', 'Catarroja', 'Chiva', 'Xiva', 'Xirivella playa', 'Foios', 'Godella', 'Massanassa', 'Meliana', 'Moncada', 'Museros', 'Paiporta', 'Picanya', 'Picassent', 'Puzol', 'Puçol', 'Quartell', 'Rafelbunyol', 'Rafelbuñol', 'Rocafort', 'Sedaví', 'Silla horta', 'Tavernes Blanques', 'Tavernes Blanques Valencia', 'Vinalesa', 'Vinalesa Valencia'], 'Burjassot');
  reg(['Albalat de la Ribera', 'Corbera', 'Fortaleny', 'Polinyà de Xúquer', 'Polinya Xuquer', 'Riola', 'Llanera de Ranes', 'Manuel', 'Real de Gandia', 'Real Gandia', 'Rafelcofer', 'Beniflá', 'Benifaio', 'Benifayo', 'Alfarp', 'Alfarb', 'Catadau horta', 'Montserrat Valencia', 'Montserrat Ribera', 'Montroy', 'Montroi', 'Llocnou de Sant Jeroni', 'Llocnou Sant Jeroni'], 'Carcaixent');
  reg(['Ador', 'Alfauir', 'Almoines', 'Barx', 'Barxeta', 'Beniarjó', 'Benirredrà', 'Castellonet', 'Castellonet de la Conquesta', 'Llocnou de Sant Jeroni', 'Palma de Gandia', 'Palma Gandia', 'Potries', 'Rafelcofer', 'Real de Gandia', 'Villalonga'], 'Gandia');
  reg(['Daimús', 'Daimus', 'Grau de Gandia', 'Platja Gandia', 'Miramar Valencia', 'Platja Miramar', 'Bellreguard', 'Bellreguart', 'Piles', 'Piles Valencia', 'Piles de la Baronia'], 'Gandia');
  reg(['Beniarbeig', 'Benidoleig', 'Benimeli', 'El Verger', 'Els Poblets', 'Poblets', 'Ondara', 'Pedreguer', 'Ràfol d Almúnia', 'Rafol Almunia', 'Sanet y Negrals', 'Sanet Negrals', 'Benissa', 'Benisa', 'Calp playa', 'Calpe playa', 'Teulada', 'Moraira', 'Benitachell', 'Poble Nou Benitatxell'], 'Dénia');
  reg(['Alfas del Pi', "l'Alfàs del Pi", 'Alfas Pi', 'Finestrat playa', 'Polop', 'Polop de la Marina', 'Relleu', 'Sella', 'Tàrbena', 'Tarbenya', 'Confrides', 'Benasau', 'Beniardá', 'Benimantell', 'Famorca', 'Facheca', 'Quatretondeta', 'Tollos'], 'Altea');
  reg(['Agres', 'Alcoleja', 'Alcolecha', 'Alfafara', 'Alfafara Alicante', 'Alfàs del Pi interior', "Alqueria d'Asnar", 'Beniarrés', 'Benilloba', 'Benillup', 'Benimarfull', 'Benimassot', 'Benimeli', 'Castalla', 'Cocentaina', 'Facheca', 'Gaianes', 'Gorga', 'Millena', 'Muro de Alcoy', 'Planes', 'Quatretondeta', 'Tibi'], 'Alcoi');
  reg(['Aspe', 'Hondon de las Nieves', 'Fondó', 'Fondo Nieves', 'Hondon Frailes', 'Monforte del Cid', 'Monforte Cid', 'Montealegre del Castillo', 'Pinoso', 'El Pinós', 'La Romana', 'La Romana Alicante', 'Algueña', 'Algueña Alicante', 'Herrada', 'Rafal', 'Redován', 'Redovan', 'San Isidro Alicante', 'Sant Isidre', 'Torrellano', 'Urbanización Torrellano'], 'Elda');
  reg(['Ulea', 'Blanca', 'Abarán', 'Abaran', 'Ceutí', 'Ceuti', 'Fortuna', 'Lorquí', 'Lorqui'], 'Orihuela');
  reg(['Algorfa', 'Almoradí', 'Almoradi', 'Benejúzar', 'Benejuzar', 'Benferri', 'Bigastro', 'Catral', 'Cox', 'Daya Nueva', 'Day Vieja', 'Dolores Alicante', 'Formentera del Segura', 'Granja Rocamora', 'Jacarilla', 'Los Montesinos', 'Montesinos', 'Pilar de la Horadada', 'Pilar Horadada', 'Rafal Torrevieja', 'San Fulgencio', 'San Miguel de Salinas', 'San Miguel Salinas', 'Torre de la Horadada', 'Torrevieja campo'], 'Orihuela');
  reg(['Agost campo', 'Busot', 'Campello playa', 'Campello Altet', 'Jijona', 'Xixona', 'Mutxamel playa', 'San Juan Alicante', 'Sant Joan Alacant', 'San Juan playa', 'Muchavista', 'El Rebolledo'], 'Mutxamel');
  reg(['Aigües', 'Aigues', 'Relleu', 'Tibi Alicante', 'Torremanzanas', 'Torremanzana', 'Villajoyosa playa'], 'La Vila Joiosa');
  // Resto España (alias ya existentes)
  reg(["L'Hospitalet de Llobregat", 'Hospitalet de Llobregat', 'Hospitalet'], "L'Hospitalet");
  reg(['Donostia', 'San Sebastián'], 'San Sebastián');
  reg(['Vitoria', 'Gasteiz'], 'Vitoria-Gasteiz');
  reg(['A Coruña', 'La Coruña'], 'A Coruña');
  reg(['Palma', 'Palma de Mallorca', 'Ciutat de Mallorca'], 'Palma de Mallorca');
  reg(['Las Palmas', 'Las Palmas de Gran Canaria'], 'Las Palmas de GC');
  return m;
})();

// Función para buscar municipio
function buscarMunicipio(query) {
  if (!query || query.length < 2) return [];
  const q = normalizaMunicipioStr(query);
  const seen = new Set();
  const out = [];

  function pushCanon(canonName) {
    const data = AGUA_MUNICIPIOS[canonName];
    if (!data || seen.has(canonName)) return;
    seen.add(canonName);
    out.push([canonName, data]);
  }

  const directCanon = MUNICIPIO_ALIAS_A_CANON[q];
  if (directCanon) pushCanon(directCanon);

  for (const aliasNorm of Object.keys(MUNICIPIO_ALIAS_A_CANON)) {
    if (aliasNorm.includes(q) || q.includes(aliasNorm)) {
      pushCanon(MUNICIPIO_ALIAS_A_CANON[aliasNorm]);
    }
  }

  Object.entries(AGUA_MUNICIPIOS).forEach(([nombre, data]) => {
    const n = normalizaMunicipioStr(nombre);
    if (n.includes(q) || q.includes(n)) pushCanon(nombre);
  });

  return out.slice(0, 8);
}

// Constantes por tipo de agua
const CONFIG_AGUA = {
  destilada: {
    nombre: 'Destilada',
    ecBase: 0,
    calmagMl: 6.7,       // ml para llegar a EC 0.4
    calmagNecesario: true,
    nota: 'Sin buffer — CalMag imprescindible'
  },
  osmosis: {
    nombre: 'Ósmosis',
    ecBase: 30,           // µS/cm base media
    calmagMl: 6.0,
    calmagNecesario: true,
    nota: 'EC base baja — CalMag muy recomendado'
  },
  grifo: {
    nombre: 'Grifo',
    ecBase: 850,          // Castelló — se puede sobrescribir
    calmagMl: 0,          // no necesario, el agua ya tiene Ca y Mg
    calmagNecesario: false,
    nota: 'Agua muy dura en Castelló — no recomendada'
  }
};

/**
 * Perfil de riego por sustrato — calibrado de forma coherente con tablas y manuales habituales
 * (extensión universitaria, fichas de sustratos hortícolas, comparativas WHC / aeración en hidroponía).
 * - retencion: índice interno 0.22–0.82 (no es un % volumétrico medido en campo). Ordena de menor a mayor
 *   “inercia” hídrica relativa: macroporos dominantes (perlita, LECA) abajo; fibras y láminas capilares
 *   (coco, lana, vermiculita) arriba. Entra en riegoMinutosDesdeDemanda vía sPulso y (0.88 + retencion×0.2).
 * - onRef / minOFFRef: min ON y min OFF de referencia (demanda≈1, ~15 plantas lechuga).
 */
const CONFIG_SUSTRATO = {
  esponja: {
    nombre: 'Esponja hidropónica',
    retencion: 0.50,
    onRef: 10.0,
    minOFFRef: 24,
    objetivoHumedadDefault: 58,
    whcPct: 'Media — fenólica/PU: poros finos + aire, entre LECA y cubo denso',
    poroAire: '≈35–48% (orden típico publicitario cubo esponja)',
    dryBack: 'Ligero secado entre pulsos sin llegar a estrés severo si el pulso está bien ajustado',
    nota: 'Valores medios de biblioteca “cubo rígido” frente a macroporos (LECA/perlita)'
  },
  lana: {
    nombre: 'Lana de roca',
    retencion: 0.76,
    onRef: 11.5,
    minOFFRef: 33,
    objetivoHumedadDefault: 63,
    whcPct: 'Muy alta agua fácilmente disponible en cubo comercial (fichas 65–90%+ por volumen de poros)',
    poroAire: '≈6–18% con matriz saturada según densidad',
    dryBack: 'Inercia hídrica alta; suele tolerar intervalos algo más largos entre pulsos',
    nota: 'Alto buffer hídrico — OFF más largo que LECA/perlita a igual demanda climática'
  },
  arcilla: {
    nombre: 'Arcilla expandida',
    retencion: 0.30,
    onRef: 8.2,
    minOFFRef: 17,
    objetivoHumedadDefault: 46,
    whcPct: 'Baja vs fibra — LECA: agua en poros grandes, poca matriz capilar fina',
    poroAire: '≈45–55% aire tras drenaje (típico bol LECA limpio)',
    dryBack: 'Evapotranspiración vacía poros rápido; en cubeta flood puede saturar distinto que en “solo bolas”',
    nota: 'En red/torre con poco contacto capilar suele comportarse más “seco” que coco o lana'
  },
  mixto: {
    nombre: 'Mixto (esponja + arcilla)',
    retencion: 0.57,
    onRef: 10.4,
    minOFFRef: 27,
    objetivoHumedadDefault: 54,
    whcPct: 'Intermedia — mezcla esponja/bol LECA en cesta',
    poroAire: 'Compromiso entre macroporos y poros de cubo',
    dryBack: 'Entre esponja sola (más estable) y solo LECA (más irregular)',
    nota: 'Montaje típico torre: retención un poco por encima de arcilla pura'
  },
  perlita: {
    nombre: 'Perlita',
    retencion: 0.22,
    onRef: 7.6,
    minOFFRef: 14,
    objetivoHumedadDefault: 40,
    whcPct: 'Muy baja (casi solo drenaje + película) — en mezcla suele “llevar” coco',
    poroAire: '≈40–55% AFP típica en grano hortícola suelto',
    dryBack: 'Secado muy rápido en cavidad; en torre pura exige pulsos frecuentes',
    nota: 'Referencia baja retención; mezclas 50/50 coco–perlita se acercan más al perfil coco'
  },
  coco: {
    nombre: 'Fibra de coco',
    retencion: 0.65,
    onRef: 10.9,
    minOFFRef: 29,
    objetivoHumedadDefault: 57,
    whcPct: 'Alta disponibilidad hídrica + aeración si fibra lavada y gruesa',
    poroAire: '≈10–28% según marca, lavado y troceo',
    dryBack: 'Buffer capacitivo fuerte frente a perlita/LECA; menos “tanque” que cubo lana denso',
    nota: 'EC y Na+/K+ del lavado cambian sensación real; este perfil es fibra hortícola estándar'
  },
  vermiculita: {
    nombre: 'Vermiculita',
    retencion: 0.82,
    onRef: 11.8,
    minOFFRef: 35,
    objetivoHumedadDefault: 65,
    whcPct: 'Muy alta — láminas silicatadas retienen agua interlaminar (hasta ~3–4× peso en fichas)',
    poroAire: 'Más baja que perlita cuando compacta o húmeda — riesgo anaerobio si encharca',
    dryBack: 'Secado lento; suele cortarse con perlita 30–70% en mezclas',
    nota: 'Mayor índice de retención del catálogo; pura en torre puede ser demasiado húmeda'
  },
  turba_enraiz: {
    nombre: 'Taco / esponja de turba biodegradable (enraizamiento)',
    retencion: 0.53,
    onRef: 10.2,
    minOFFRef: 25,
    objetivoHumedadDefault: 52,
    whcPct: 'Alta en el volumen del taco — turba mantiene malla capilar fina',
    poroAire: 'Variable según prensado / pastilla (Jiffy, etc.)',
    dryBack: 'Almáculo: mantener húmedo; en torre adulta mejor migrar a coco o lana',
    nota: 'Perfil “plántula”; no equivale a lana de producción en planta adulta'
  }
};

/** Clave de sustrato válida o 'esponja' por defecto */
function normalizaSustratoKey(tipo) {
  const k = String(tipo || '').trim();
  return CONFIG_SUSTRATO[k] ? k : 'esponja';
}

/** Multiplicador suave del índice de demanda según fase (transpiración típica / VPD recomendado) */
const RIEGO_FASE_CULTIVO = {
  propagacion: { mult: 0.84, label: 'Propagación / plántula' },
  vegetativo:  { mult: 0.94, label: 'Desarrollo vegetativo' },
  produccion:  { mult: 1.0,  label: 'Producción / engorde' },
  cierre:      { mult: 0.97, label: 'Pre-cosecha (cierre suave)' },
};

/** Avance 0–1 del ciclo (ponderado por planta con fecha; si no hay, lechuga ref. y edad del formulario) */
function riegoPctCicloMedioTorre(edadSemManual) {
  let sum = 0, n = 0;
  getNivelesActivos().forEach(nv => {
    (state.torre[nv] || []).forEach(c => {
      if (!cestaCuentaParaRiegoYMetricas(c)) return;
      sum += riegoPctCicloPlanta(c, edadSemManual);
      n++;
    });
  });
  if (n === 0) {
    const s = Math.max(0.05, Math.min(24, Number(edadSemManual) || 4));
    return Math.max(0, Math.min(1.15, (s * 7) / 45));
  }
  return sum / n;
}

/** Mismos hitos que riegoKcDesdePctYGrupo (inicio / desarrollo / mediados / final) */
function riegoFaseDesdePctCiclo(pct) {
  const p = Math.max(0, Math.min(1.2, pct));
  if (p < 0.12) return 'propagacion';
  if (p < 0.35) return 'vegetativo';
  if (p < 0.85) return 'produccion';
  return 'cierre';
}

function riegoFaseCultivoKeyEfectiva(edadSem) {
  if (!state.configTorre) return 'produccion';
  const auto = state.configTorre.faseCultivoRiegoAuto !== false;
  if (auto) {
    return riegoFaseDesdePctCiclo(riegoPctCicloMedioTorre(edadSem));
  }
  const f = state.configTorre.faseCultivoRiego || 'produccion';
  return RIEGO_FASE_CULTIVO[f] ? f : 'produccion';
}

function riegoFaseCultivoMult(edadSem) {
  const k = riegoFaseCultivoKeyEfectiva(edadSem);
  return RIEGO_FASE_CULTIVO[k]?.mult ?? 1;
}

function riegoFaseCultivoLabel(edadSem) {
  const k = riegoFaseCultivoKeyEfectiva(edadSem);
  return RIEGO_FASE_CULTIVO[k]?.label || 'Producción';
}

function ensureSustratoMezclaDefaults() {
  if (!state.configTorre) state.configTorre = {};
  let m = state.configTorre.sustratoMezcla;
  if (!m || typeof m !== 'object') {
    m = {
      activa: false,
      a: normalizaSustratoKey(state.configTorre.sustrato),
      b: 'perlita',
      pctA: 70
    };
    state.configTorre.sustratoMezcla = m;
  }
  m.a = normalizaSustratoKey(m.a || state.configTorre.sustrato);
  m.b = normalizaSustratoKey(m.b || 'perlita');
  m.pctA = Math.max(10, Math.min(90, parseInt(m.pctA, 10) || 70));
}

/** Perfil numérico para cálculos: mezcla interpolada o sustrato único */
function interpSustratoMezcla(aKey, bKey, pctA) {
  const t = Math.max(0.1, Math.min(0.9, (parseFloat(pctA) || 50) / 100));
  const A = CONFIG_SUSTRATO[aKey];
  const B = CONFIG_SUSTRATO[bKey];
  if (!A || !B) return CONFIG_SUSTRATO[normalizaSustratoKey(aKey)];
  const pA = Math.round(t * 100);
  const pB = Math.round((1 - t) * 100);
  return {
    nombre: `Mezcla ${pA}% ${A.nombre} + ${pB}% ${B.nombre}`,
    retencion: A.retencion * t + B.retencion * (1 - t),
    onRef: A.onRef * t + B.onRef * (1 - t),
    minOFFRef: A.minOFFRef * t + B.minOFFRef * (1 - t),
    objetivoHumedadDefault: Math.round(A.objetivoHumedadDefault * t + B.objetivoHumedadDefault * (1 - t)),
    whcPct: `Interpolado ${pA}/${pB} · ver textos de cada componente en Mediciones`,
    poroAire: 'Mezcla',
    dryBack: 'Intermedio proporcional a la mezcla',
    nota: 'Si predomina un solo medio, desactiva mezcla y elige un perfil'
  };
}

function riegoSustratoPerfil() {
  ensureSustratoMezclaDefaults();
  const m = state.configTorre.sustratoMezcla;
  if (m.activa && m.a && m.b && m.a !== m.b) {
    return interpSustratoMezcla(m.a, m.b, m.pctA);
  }
  return CONFIG_SUSTRATO[riegoSustratoKey()];
}

function riegoSustratoKey() {
  const k = state.configTorre?.sustrato || state.configSustrato || 'esponja';
  return CONFIG_SUSTRATO[k] ? k : 'esponja';
}

/** Migra sensorHumedadEsponja → sensorHumedadSustrato y devuelve el objeto activo */
function ensureSensorHumedadSustrato() {
  if (!state.configTorre) state.configTorre = {};
  const cfg = state.configTorre;
  if (!cfg.sensorHumedadSustrato || typeof cfg.sensorHumedadSustrato !== 'object') {
    const leg = cfg.sensorHumedadEsponja;
    cfg.sensorHumedadSustrato = leg && typeof leg === 'object'
      ? { activo: !!leg.activo, lecturaPct: leg.lecturaPct, objetivoPct: leg.objetivoPct }
      : { activo: false, lecturaPct: null, objetivoPct: null };
  }
  return cfg.sensorHumedadSustrato;
}

/**
 * Ajuste muy suave si el usuario activa lectura manual: el riego principal sigue siendo clima + tipo de sustrato
 * (minON/minOFF de referencia). Aquí como mucho ±3 % de demanda — sin sondas caras ni pretender precisión de invernadero.
 */
function riegoMultSensorSustrato() {
  const sh = ensureSensorHumedadSustrato();
  if (!sh?.activo || sh.lecturaPct == null || String(sh.lecturaPct) === '') {
    return { mult: 1, etiqueta: '' };
  }
  const defObj = riegoSustratoPerfil()?.objetivoHumedadDefault ?? 58;
  const lec = Math.max(0, Math.min(100, parseFloat(sh.lecturaPct)));
  const objRaw = sh.objetivoPct;
  const obj = Math.max(28, Math.min(82, parseFloat(objRaw) || defObj));
  const ratio = lec / obj;
  let m = 1;
  if (ratio < 0.8) m = 1 + (0.8 - ratio) * 0.08;
  else if (ratio > 1.22) m = 1 - Math.min(0.035, (ratio - 1.22) * 0.1);
  m = Math.max(0.97, Math.min(1.03, m));
  return {
    mult: m,
    etiqueta: ' · Afinado manual: ' + (m > 1.008 ? 'un poco más' : m < 0.992 ? 'un poco menos' : 'neutro') +
      ' (' + Math.round(lec) + '% / ref. ' + Math.round(obj) + '%)'
  };
}

// ── Geolocalización — detectar municipio más cercano ────────────────────────
async function detectarMunicipio() {
  const btn    = document.getElementById('btnGeolocalizacion');
  const estado = document.getElementById('geoEstado');

  if (!navigator.geolocation) {
    mostrarGeoEstado('warn', '⚠️ Tu navegador no soporta geolocalización. Usa la búsqueda manual.');
    return;
  }

  // Estado cargando
  btn.style.background = '#fef3c7';
  btn.style.borderColor = '#d97706';
  btn.style.color = '#92400e';
  btn.innerHTML = '<span>⏳</span><span>Obteniendo ubicación...</span>';
  btn.disabled = true;
  estado.style.display = 'none';

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      btn.innerHTML = '<span>🌐</span><span>Buscando municipio...</span>';

      try {
        // Usar Nominatim (OpenStreetMap) para geocodificación inversa — sin API key
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=es`;
        const res  = await fetch(url, { headers: { 'User-Agent': 'HidroCultivo/1.0' } });
        const data = await res.json();

        const ciudad = data.address?.city
          || data.address?.town
          || data.address?.village
          || data.address?.municipality
          || '';

        if (!ciudad) {
          mostrarGeoEstado('warn', '⚠️ No se pudo identificar el municipio. Usa la búsqueda manual.');
          resetGeoBtn();
          return;
        }

        // Buscar en base de datos local
        const resultados = buscarMunicipio(ciudad);

        if (resultados.length > 0) {
          // Encontrado — seleccionar automáticamente el primero
          const [nombre, data2] = resultados[0];
          seleccionarMunicipio(nombre, data2.ec, data2.dureza, data2.nota);
          document.getElementById('inputBuscarMunicipio').value = nombre;
          mostrarGeoEstado('ok', `✅ Municipio detectado: <strong>${nombre}</strong> (${data2.ec} µS/cm)`);
          btn.style.display = 'none'; // ocultar botón tras éxito
        } else {
          // No en la base de datos — mostrar nombre y sugerir búsqueda manual o SINAC
          mostrarGeoEstado('info',
            `📍 Ubicación: <strong>${ciudad}</strong><br>` +
            `No está en nuestra base de datos. Introduce la EC manualmente o consulta el ` +
            `<a href="https://sinac.sanidad.gob.es/CiudadanoWeb/ciudadano/informacionAbastecimientoActionMunicipiosCenso.do" target="_blank" rel="noopener noreferrer" class="medir-link-sinac">SINAC (por municipio)</a>.`
          );
          document.getElementById('inputBuscarMunicipio').value = ciudad;
          resetGeoBtn();
        }

      } catch(e) {
        mostrarGeoEstado('warn', '⚠️ Error al obtener datos de ubicación. Usa la búsqueda manual.');
        resetGeoBtn();
      }
    },
    (err) => {
      let msg = '';
      switch(err.code) {
        case 1: msg = '❌ Permiso de ubicación denegado. Actívalo en Ajustes > Safari > Ubicación.'; break;
        case 2: msg = '⚠️ No se pudo obtener la ubicación. Comprueba el GPS.'; break;
        case 3: msg = '⚠️ Tiempo de espera agotado. Inténtalo de nuevo.'; break;
        default: msg = '⚠️ Error desconocido. Usa la búsqueda manual.';
      }
      mostrarGeoEstado('warn', msg);
      resetGeoBtn();
    },
    { timeout: 10000, maximumAge: 300000 } // 10s timeout, caché 5min
  );
}

function mostrarGeoEstado(tipo, html) {
  const el = document.getElementById('geoEstado');
  el.style.display = 'block';
  const colores = {
    ok:   { bg: '#f0fdf4', border: '#16a34a', color: '#14532d' },
    warn: { bg: '#fef3c7', border: '#d97706', color: '#78350f' },
    info: { bg: '#eff6ff', border: '#93c5fd', color: '#1e40af' },
  };
  const c = colores[tipo] || colores.info;
  el.style.background   = c.bg;
  el.style.border       = `1px solid ${c.border}`;
  el.style.borderRadius = '8px';
  el.style.color        = c.color;
  el.innerHTML          = html;
}

function resetGeoBtn() {
  const btn = document.getElementById('btnGeolocalizacion');
  if (!btn) return;
  btn.disabled = false;
  btn.style.background   = '#eff6ff';
  btn.style.borderColor  = '#93c5fd';
  btn.style.color        = '#1d4ed8';
  btn.innerHTML = '<span>📍</span><span>Detectar mi municipio automáticamente</span>';
}

// Búsqueda de municipio
function onBuscarMunicipio(query) {
  const resEl = document.getElementById('municipioResultados');
  const selEl = document.getElementById('municipioSeleccionado');

  if (!query || query.length < 2) {
    resEl.style.display = 'none';
    return;
  }

  const resultados = buscarMunicipio(query);
  if (resultados.length === 0) {
    resEl.style.display = 'block';
    resEl.innerHTML = '<div class="medir-muni-empty">No encontrado — prueba otro nombre o introduce EC manualmente</div>';
    return;
  }

  resEl.style.display = 'block';
  // Guardar en variable global para acceso por índice (evita problemas con apóstrofes en nombres)
  window._municipioResultados = resultados;
  resEl.innerHTML = resultados.map(([nombre, data], idx) => {
    const color = data.ec < 300 ? '#15803d' : data.ec < 500 ? '#b45309' : data.ec < 700 ? '#d97706' : '#dc2626';
    return `<button type="button" class="medir-muni-result-btn" onclick="seleccionarMunicipioPorIdx(${idx})">
      <span>
        <span class="medir-muni-name">${nombre}</span>
        <span class="medir-muni-nota">${data.nota}</span>
      </span>
      <span class="medir-muni-ec" style="--medir-ec:${color}">${data.ec} µS</span>
    </button>`;
  }).join('');
}

function seleccionarMunicipioPorIdx(idx) {
  if (!window._municipioResultados || !window._municipioResultados[idx]) return;
  const [nombre, data] = window._municipioResultados[idx];
  seleccionarMunicipio(nombre, data.ec, data.dureza, data.nota);
}

function seleccionarMunicipio(nombre, ec, dureza, nota) {
  document.getElementById('municipioResultados').style.display = 'none';
  document.getElementById('inputBuscarMunicipio').value = nombre;

  const selEl = document.getElementById('municipioSeleccionado');
  selEl.style.display = 'block';

  const ecColor = ec < 300 ? '#15803d' : ec < 500 ? '#b45309' : '#dc2626';
  const viable = ec < 600;
  document.getElementById('municipioNombre').innerHTML =
    `${nombre} — <span class="medir-ec-inline" style="--medir-ec:${ecColor}">${ec} µS/cm</span> · ${dureza}`;
  document.getElementById('municipioInfo').innerHTML =
    `${nota}<br>${viable
      ? '✅ Usable para hidropónica con CalMag reducido'
      : '⚠️ EC alta — muy poco margen para nutrientes. Recomendable ósmosis.'}`;

  // Actualizar el input manual
  document.getElementById('inputECBaseGrifo').value = ec;
  CONFIG_AGUA.grifo.ecBase = ec;
  state.configAguaEC = ec;
  state.configAguaMunicipio = nombre;
  saveState();
  actualizarRangoEC();

  // Si EC > 600 mostrar advertencia adicional
  const warnEl = document.getElementById('warningGrifo');
  if (ec > 600) {
    resetWarningGrifoInlineStyles();
    warnEl.classList.add('show');
    warnEl.innerHTML = `⚠️ <strong>${nombre}:</strong> EC ${ec} µS/cm — agua ${dureza.toLowerCase()}. Solo quedan ~${1400 - ec} µS/cm de margen para nutrientes. Se recomienda usar agua destilada u ósmosis.`;
  } else {
    resetWarningGrifoInlineStyles();
    warnEl.innerHTML = `ℹ️ <strong>${nombre}:</strong> EC ${ec} µS/cm — ${dureza}. ${nota}. Ajusta la dosis de CalMag en consecuencia.`;
    warnEl.classList.add('show');
    warnEl.style.background = '#eff6ff';
    warnEl.style.borderColor = '#93c5fd';
    warnEl.style.color = '#1e40af';
  }
  cargarLocalidadMeteoUI();
}

function mostrarAlternativasSINAC() {
  const el = document.getElementById('modalAgua');
  el.classList.add('open');
  a11yDialogOpened(el);
}

function resetMunicipio() {
  state.configAguaMunicipio = null;
  state.configAguaEC = null;
  saveState();
  document.getElementById('inputBuscarMunicipio').value = '';
  document.getElementById('municipioSeleccionado').style.display = 'none';
  document.getElementById('municipioResultados').style.display = 'none';
  document.getElementById('geoEstado').style.display = 'none';
  const btn = document.getElementById('btnGeolocalizacion');
  if (btn) { btn.style.display = 'flex'; resetGeoBtn(); }
  cargarLocalidadMeteoUI();
  if ((state.configAgua || '') === 'grifo') {
    try {
      actualizarWarningGrifoSegunEstado();
    } catch (_) {}
  }
}

/** Quita estilos inline del aviso de grifo (p. ej. tras mensaje informativo azul). */
function resetWarningGrifoInlineStyles() {
  const warnEl = document.getElementById('warningGrifo');
  if (!warnEl) return;
  warnEl.style.removeProperty('background');
  warnEl.style.removeProperty('border-color');
  warnEl.style.removeProperty('color');
}

/** Sin municipio ni EC: mensaje neutro (evita texto fijo de una sola ciudad). */
function pintarWarningGrifoPendienteDatos() {
  const warnEl = document.getElementById('warningGrifo');
  if (!warnEl) return;
  resetWarningGrifoInlineStyles();
  warnEl.innerHTML =
    '<svg class="hc-ico hc-ico--warn hc-ico--warn-inline" aria-hidden="true" focusable="false"><use href="#hc-i-alert-warn"/></svg> ' +
    '<strong>Agua del grifo:</strong> indica tu <strong>municipio</strong> (abajo) o la <strong>EC medida</strong> de tu grifo para estimar margen respecto a nutrientes. ' +
    'Sin esos datos la app no puede acertar la dureza de tu red.';
}

/**
 * Sincroniza el aviso de grifo con state (tras init, cambio de tipo de agua o reset de municipio).
 */
function actualizarWarningGrifoSegunEstado() {
  if ((state.configAgua || 'destilada') !== 'grifo') return;
  const warnEl = document.getElementById('warningGrifo');
  if (!warnEl) return;
  const nombre = state.configAguaMunicipio;
  const ecSaved = parseFloat(state.configAguaEC);
  const ecInp = parseFloat(String(document.getElementById('inputECBaseGrifo')?.value || '').replace(',', '.'));
  const ec = Number.isFinite(ecSaved) && ecSaved > 0 ? ecSaved : ecInp;
  const data = nombre && AGUA_MUNICIPIOS[nombre] ? AGUA_MUNICIPIOS[nombre] : null;

  if (nombre && data) {
    seleccionarMunicipio(nombre, data.ec, data.dureza, data.nota);
    return;
  }

  function durezaDeEc(e) {
    if (!Number.isFinite(e) || e <= 0) return '—';
    if (e < 300) return 'Blanda';
    if (e < 500) return 'Media';
    return 'Muy dura';
  }

  if (nombre && Number.isFinite(ec) && ec > 0) {
    const dureza = durezaDeEc(ec);
    warnEl.classList.add('show');
    if (ec > 600) {
      resetWarningGrifoInlineStyles();
      warnEl.innerHTML =
        '⚠️ <strong>' +
        nombre +
        ':</strong> EC ' +
        ec +
        ' µS/cm — agua ' +
        String(dureza).toLowerCase() +
        '. Solo quedan ~' +
        (1400 - ec) +
        ' µS/cm de margen para nutrientes. Se recomienda usar agua destilada u ósmosis.';
    } else {
      resetWarningGrifoInlineStyles();
      warnEl.innerHTML =
        'ℹ️ <strong>' +
        nombre +
        ':</strong> EC ' +
        ec +
        ' µS/cm — ' +
        dureza +
        ' (valor guardado o manual). Ajusta la dosis de CalMag en consecuencia.';
      warnEl.style.background = '#eff6ff';
      warnEl.style.borderColor = '#93c5fd';
      warnEl.style.color = '#1e40af';
    }
    return;
  }

  if (Number.isFinite(ec) && ec > 0) {
    const dureza = durezaDeEc(ec);
    warnEl.classList.add('show');
    if (ec > 600) {
      resetWarningGrifoInlineStyles();
      warnEl.innerHTML =
        '⚠️ EC ' +
        ec +
        ' µS/cm (grifo) — ' +
        String(dureza).toLowerCase() +
        '. Solo quedan ~' +
        (1400 - ec) +
        ' µS/cm de margen para nutrientes. Recomendable ósmosis o destilada.';
    } else {
      resetWarningGrifoInlineStyles();
      warnEl.innerHTML =
        'ℹ️ EC base del grifo: <strong>' +
        ec +
        ' µS/cm</strong> (' +
        dureza +
        '). Ajusta CalMag según guía; confirma con municipio o medición si no reconoces el valor.';
    }
    return;
  }

  pintarWarningGrifoPendienteDatos();
  warnEl.classList.add('show');
}

function setAgua(tipo) {
  state.configAgua = tipo;
  saveState();

  // Actualizar UI radio buttons
  ['destilada','osmosis','grifo'].forEach(t => {
    const el = document.getElementById('opt-' + t);
    if (!el) return;
    const sel = t === tipo;
    el.classList.toggle('selected', sel);
    el.setAttribute('aria-checked', sel ? 'true' : 'false');
  });

  // Mostrar/ocultar advertencia grifo
  const warnEl = document.getElementById('warningGrifo');
  const ecBaseEl = document.getElementById('ecBaseGrifo');
  if (tipo === 'grifo') {
    ecBaseEl?.classList.add('show');
    warnEl?.classList.add('show');
    try {
      actualizarWarningGrifoSegunEstado();
    } catch (_) {}
  } else {
    warnEl?.classList.remove('show');
    ecBaseEl?.classList.remove('show');
  }

  actualizarRangoEC();
  cargarLocalidadMeteoUI();
  refreshConsejosSiVisible();
  syncMedirAguaResumen();
}

function toggleMedirOpcionesAgua() {
  const cb = document.getElementById('chkMedirCambiarAgua');
  const wrap = document.getElementById('wrapMedirOpcionesAgua');
  if (wrap) wrap.style.display = cb && cb.checked ? 'block' : 'none';
}

function syncMedirAguaResumen() {
  const el = document.getElementById('medirAguaResumen');
  if (!el) return;
  const k = state.configAgua || 'destilada';
  const labels = { destilada: 'Agua destilada', osmosis: 'Agua de ósmosis', grifo: 'Agua del grifo' };
  el.innerHTML = 'Tipo de agua en el sistema: <strong class="u-text-gold">' + (labels[k] || '—') + '</strong>.';
}

function toggleMedirOpcionesSustrato() {
  const cb = document.getElementById('chkMedirCambiarSustrato');
  const wrap = document.getElementById('wrapMedirOpcionesSustrato');
  if (wrap) wrap.style.display = cb && cb.checked ? 'block' : 'none';
}

function syncMedirSustratoResumen() {
  const el = document.getElementById('medirSustratoResumen');
  if (!el) return;
  const k = normalizaSustratoKey(state.configTorre?.sustrato || state.configSustrato || 'esponja');
  const nombre = CONFIG_SUSTRATO[k]?.nombre || '—';
  el.innerHTML = 'Sustrato configurado: <strong class="u-text-gold">' + nombre + '</strong>.';
}

function setSustrato(tipo) {
  const t = normalizaSustratoKey(tipo);
  state.configSustrato = t;
  if (!state.configTorre) state.configTorre = {};
  state.configTorre.sustrato = t;
  ensureSustratoMezclaDefaults();
  state.configTorre.sustratoMezcla.activa = false;
  state.configTorre.sustratoMezcla.a = t;
  guardarEstadoTorreActual();
  saveState();

  Object.keys(CONFIG_SUSTRATO).forEach(id => {
    const el = document.getElementById('opt-' + id);
    if (!el) return;
    const sel = id === t;
    el.classList.toggle('selected', sel);
    el.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  syncRiegoAvanzadoUI();
  syncMedirSustratoResumen();
  if (document.getElementById('tab-riego')?.classList.contains('active')) calcularRiego();
}

/** Abre el bloque colapsable de riego si hay ajustes no por defecto (fase manual o mezcla activa). */
function actualizarRiegoAvanzadoDetailsOpen() {
  const det = document.getElementById('riegoAvanzadoDetails');
  if (!det) return;
  // UX final: este bloque avanzado empieza siempre cerrado.
  det.open = false;
}

function syncRiegoAvanzadoUI() {
  const fSel = document.getElementById('riegoFaseCultivo');
  const cbFaseAuto = document.getElementById('riegoFaseCultivoAuto');
  const cb = document.getElementById('riegoMezclaActiva');
  const sa = document.getElementById('riegoMezclaA');
  const sb = document.getElementById('riegoMezclaB');
  const rng = document.getElementById('riegoMezclaPctA');
  const wrap = document.getElementById('riegoMezclaCampos');
  const lab = document.getElementById('riegoMezclaPctALabel');
  if (!fSel && !cb && !cbFaseAuto) return;
  if (!state.configTorre) state.configTorre = {};
  ensureSustratoMezclaDefaults();
  const autoFase = state.configTorre.faseCultivoRiegoAuto !== false;
  if (cbFaseAuto) cbFaseAuto.checked = autoFase;
  const edadSem = parseFloat(document.getElementById('riegoEdad')?.value) || 4;
  if (fSel) {
    fSel.removeAttribute('aria-disabled');
    fSel.title = '';
    if (autoFase) {
      const k = riegoFaseCultivoKeyEfectiva(edadSem);
      fSel.value = RIEGO_FASE_CULTIVO[k] ? k : 'produccion';
    } else {
      const fv = state.configTorre.faseCultivoRiego || 'produccion';
      fSel.value = RIEGO_FASE_CULTIVO[fv] ? fv : 'produccion';
    }
  }
  const m = state.configTorre.sustratoMezcla;
  if (cb) cb.checked = !!m.activa;
  if (sa) {
    fillRiegoMezclaSelectIfEmpty(sa);
    sa.value = m.a || riegoSustratoKey();
  }
  if (sb) {
    fillRiegoMezclaSelectIfEmpty(sb);
    sb.value = m.b || 'perlita';
  }
  if (rng) rng.value = m.pctA != null ? m.pctA : 70;
  if (wrap) wrap.classList.toggle('setup-hidden', !m.activa);
  if (lab && rng) {
    const v = parseInt(rng.value, 10) || 70;
    lab.textContent = 'Medio 1: ' + v + '% · medio 2: ' + (100 - v) + '%';
  }
  actualizarRiegoAvanzadoDetailsOpen();
}

function fillRiegoMezclaSelectIfEmpty(sel) {
  if (!sel || sel.options.length > 0) return;
  sel.innerHTML = Object.keys(CONFIG_SUSTRATO).map(k => {
    const n = CONFIG_SUSTRATO[k].nombre.replace(/</g, '');
    return '<option value="' + k + '">' + n + '</option>';
  }).join('');
}

function persistRiegoAvanzado() {
  if (!state.configTorre) state.configTorre = {};
  ensureSustratoMezclaDefaults();
  const cbFaseAuto = document.getElementById('riegoFaseCultivoAuto');
  const fSel = document.getElementById('riegoFaseCultivo');
  const wasAuto = state.configTorre.faseCultivoRiegoAuto !== false;
  const nowAuto = cbFaseAuto ? cbFaseAuto.checked : wasAuto;
  state.configTorre.faseCultivoRiegoAuto = nowAuto;
  if (!nowAuto) {
    if (wasAuto && fSel) {
      const ed = parseFloat(document.getElementById('riegoEdad')?.value) || 4;
      const inf = riegoFaseDesdePctCiclo(riegoPctCicloMedioTorre(ed));
      fSel.value = inf;
      state.configTorre.faseCultivoRiego = inf;
    } else if (fSel && RIEGO_FASE_CULTIVO[fSel.value]) {
      state.configTorre.faseCultivoRiego = fSel.value;
    }
  }
  const m = state.configTorre.sustratoMezcla;
  const cb = document.getElementById('riegoMezclaActiva');
  m.activa = !!(cb && cb.checked);
  const sa = document.getElementById('riegoMezclaA');
  const sb = document.getElementById('riegoMezclaB');
  const rng = document.getElementById('riegoMezclaPctA');
  if (sa) m.a = normalizaSustratoKey(sa.value);
  if (sb) m.b = normalizaSustratoKey(sb.value);
  if (rng) m.pctA = Math.max(10, Math.min(90, parseInt(rng.value, 10) || 70));
  if (m.a === m.b) m.activa = false;
  const wrap = document.getElementById('riegoMezclaCampos');
  const lab = document.getElementById('riegoMezclaPctALabel');
  if (wrap) wrap.classList.toggle('setup-hidden', !m.activa);
  if (lab && rng) {
    const v = parseInt(rng.value, 10) || 70;
    lab.textContent = 'Medio 1: ' + v + '% · medio 2: ' + (100 - v) + '%';
  }
  guardarEstadoTorreActual();
  saveState();
  syncRiegoAvanzadoUI();
  if (document.getElementById('tab-riego')?.classList.contains('active')) calcularRiego();
}

function cargarUbicacionMedicionesUI() {
  if (!state.configTorre) state.configTorre = {};
  const u = (state.configTorre.ubicacion || 'exterior') === 'interior' ? 'interior' : 'exterior';
  ['exterior', 'interior'].forEach(id => {
    const el = document.getElementById('opt-medir-ubic-' + id);
    if (!el) return;
    const sel = id === u;
    el.classList.toggle('selected', sel);
    el.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  const wrap = document.getElementById('wrapLuzOrigenMediciones');
  if (wrap) wrap.style.display = u === 'interior' ? 'block' : 'none';
}

function setUbicacionTorreMediciones(tipo) {
  const v = tipo === 'interior' ? 'interior' : 'exterior';
  if (!state.configTorre) state.configTorre = {};
  state.configTorre.ubicacion = v;
  invalidateMeteoNomiCache();
  guardarEstadoTorreActual();
  saveState();
  cargarUbicacionMedicionesUI();
  actualizarVisibilidadPanelInteriorGrow();
  cargarInteriorGrowUI();
  applyMedirCollapseUI();
  if (typeof updateDashboard === 'function') updateDashboard();
  try {
    actualizarVistaRiegoPorTipoInstalacion();
  } catch (ePol) {}
  if (document.getElementById('tab-riego')?.classList.contains('active') && typeof calcularRiego === 'function') calcularRiego();
  if (document.getElementById('tab-meteo')?.classList.contains('active')) {
    try {
      if (typeof renderMeteoAvisosPanelCompleto === 'function') void renderMeteoAvisosPanelCompleto();
    } catch (eMet) {}
  }
}

function actualizarVisibilidadPanelInteriorGrow() {
  const p = document.getElementById('panelConfigInteriorGrow');
  if (!p) return;
  const int = (state.configTorre || {}).ubicacion === 'interior';
  p.style.display = int ? 'block' : 'none';
  cargarUbicacionMedicionesUI();
  applyMedirCollapseUI();
}

function cargarCalentadorConsignaMedicionesUI() {
  if (!state.configTorre) state.configTorre = {};
  const cfg = state.configTorre;
  const el = document.getElementById('medirCalentadorConsignaC');
  if (!el) return;
  const v = Number(cfg.calentadorConsignaC);
  el.value =
    Number.isFinite(v) && v >= 10 && v <= 35 ? String(Math.round(v * 10) / 10) : '';
}

function persistMedirCalentadorConsigna() {
  if (!state.configTorre) state.configTorre = {};
  const cfg = state.configTorre;
  const el = document.getElementById('medirCalentadorConsignaC');
  if (!el) return;
  if (!Array.isArray(cfg.equipamiento) || !cfg.equipamiento.includes('calentador')) {
    delete cfg.calentadorConsignaC;
    guardarEstadoTorreActual();
    saveState();
    return;
  }
  const raw = el.value;
  const v = parseFloat(String(raw || '').replace(',', '.'));
  if (Number.isFinite(v) && v >= 10 && v <= 35) {
    cfg.calentadorConsignaC = Math.round(v * 10) / 10;
  } else {
    delete cfg.calentadorConsignaC;
  }
  guardarEstadoTorreActual();
  saveState();
  if (document.getElementById('tab-riego')?.classList.contains('active') && typeof calcularRiego === 'function') calcularRiego();
}

function actualizarVisibilidadPanelCalentadorConsigna() {
  const p = document.getElementById('panelMedirCalentadorConsigna');
  if (!p) return;
  const cfg = state.configTorre || {};
  const show = Array.isArray(cfg.equipamiento) && cfg.equipamiento.includes('calentador');
  p.style.display = show ? 'block' : 'none';
  cargarCalentadorConsignaMedicionesUI();
  applyMedirCollapseUI();
}

function ensureUIMedirCollapse() {
  if (!state.configTorre) state.configTorre = {};
  let u = state.configTorre.uiMedirCollapse;
  if (!u || typeof u !== 'object' || Array.isArray(u)) {
    u = {};
    state.configTorre.uiMedirCollapse = u;
  }
  return u;
}

function resolveMedirExpanded(key) {
  const ui = ensureUIMedirCollapse();
  if (key === 'recargaTotal') {
    return ui.recargaTotal !== undefined ? !!ui.recargaTotal : false;
  }
  if (key === 'recargaParcial') {
    return ui.recargaParcial !== undefined ? !!ui.recargaParcial : false;
  }
  if (key === 'recargaProxima') {
    return ui.recargaProxima !== undefined ? !!ui.recargaProxima : true;
  }
  if (key === 'luzOrigen') {
    return ui.luzOrigen !== undefined ? !!ui.luzOrigen : true;
  }
  if (key === 'interiorGrow') {
    return ui.interiorGrow !== undefined ? !!ui.interiorGrow : true;
  }
  if (key === 'calentadorRiego') {
    return ui.calentadorRiego !== undefined ? !!ui.calentadorRiego : true;
  }
  if (key === 'recargaVolAviso') {
    return ui.recargaVolAviso !== undefined ? !!ui.recargaVolAviso : false;
  }
  return true;
}

function applyMedirCollapseUI() {
  const rows = [
    { body: 'collapseBodyRecargaProxima', btn: 'btnCollapseRecargaProxima', key: 'recargaProxima' },
    { body: 'collapseBodyLuzOrigen', btn: 'btnCollapseLuzOrigen', key: 'luzOrigen' },
    { body: 'collapseBodyRecargaTotal', btn: 'btnCollapseRecargaTotal', key: 'recargaTotal' },
    { body: 'collapseBodyRecargaParcial', btn: 'btnCollapseRecargaParcial', key: 'recargaParcial' },
    { body: 'collapseBodyRecargaVolAviso', btn: 'btnCollapseRecargaVolAviso', key: 'recargaVolAviso' }
  ];
  for (let i = 0; i < rows.length; i++) {
    const body = document.getElementById(rows[i].body);
    const btn = document.getElementById(rows[i].btn);
    if (!body || !btn) continue;
    const exp = resolveMedirExpanded(rows[i].key);
    body.hidden = !exp;
    body.setAttribute('aria-hidden', exp ? 'false' : 'true');
    btn.setAttribute('aria-expanded', exp ? 'true' : 'false');
    btn.classList.toggle('is-collapsed', !exp);
    const titulo = btn.querySelector('.config-section-collapse-title')?.textContent?.trim() || 'sección';
    btn.setAttribute('aria-label', (exp ? 'Contraer: ' : 'Expandir: ') + titulo);
  }

  const intPanel = document.getElementById('panelConfigInteriorGrow');
  if (intPanel && intPanel.style.display !== 'none') {
    const body = document.getElementById('collapseBodyInteriorGrow');
    const btn = document.getElementById('btnCollapseInteriorGrow');
    if (body && btn) {
      const exp = resolveMedirExpanded('interiorGrow');
      body.hidden = !exp;
      body.setAttribute('aria-hidden', exp ? 'false' : 'true');
      btn.setAttribute('aria-expanded', exp ? 'true' : 'false');
      btn.classList.toggle('is-collapsed', !exp);
      const titulo = btn.querySelector('.config-section-collapse-title')?.textContent?.trim() || 'sección';
      btn.setAttribute('aria-label', (exp ? 'Contraer: ' : 'Expandir: ') + titulo);
    }
  }

  const calPanel = document.getElementById('panelMedirCalentadorConsigna');
  if (calPanel && calPanel.style.display !== 'none') {
    const body = document.getElementById('collapseBodyCalentadorRiego');
    const btn = document.getElementById('btnCollapseCalentadorRiego');
    if (body && btn) {
      const exp = resolveMedirExpanded('calentadorRiego');
      body.hidden = !exp;
      body.setAttribute('aria-hidden', exp ? 'false' : 'true');
      btn.setAttribute('aria-expanded', exp ? 'true' : 'false');
      btn.classList.toggle('is-collapsed', !exp);
      const titulo = btn.querySelector('.config-section-collapse-title')?.textContent?.trim() || 'sección';
      btn.setAttribute('aria-label', (exp ? 'Contraer: ' : 'Expandir: ') + titulo);
    }
  }
}

function getCollapseDomByKey(key) {
  const map = {
    recargaProxima: { body: 'collapseBodyRecargaProxima', btn: 'btnCollapseRecargaProxima' },
    luzOrigen: { body: 'collapseBodyLuzOrigen', btn: 'btnCollapseLuzOrigen' },
    recargaTotal: { body: 'collapseBodyRecargaTotal', btn: 'btnCollapseRecargaTotal' },
    recargaParcial: { body: 'collapseBodyRecargaParcial', btn: 'btnCollapseRecargaParcial' },
    interiorGrow: { body: 'collapseBodyInteriorGrow', btn: 'btnCollapseInteriorGrow' },
    calentadorRiego: { body: 'collapseBodyCalentadorRiego', btn: 'btnCollapseCalentadorRiego' },
    recargaVolAviso: { body: 'collapseBodyRecargaVolAviso', btn: 'btnCollapseRecargaVolAviso' },
  };
  return map[key] || null;
}

function focusFirstInCollapseBody(bodyEl) {
  if (!bodyEl) return;
  const first = bodyEl.querySelector(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (first && typeof first.focus === 'function') first.focus();
}

function toggleMedirCollapse(key) {
  const cur = resolveMedirExpanded(key);
  const next = !cur;
  ensureUIMedirCollapse()[key] = next;
  guardarEstadoTorreActual();
  saveState();
  applyMedirCollapseUI();
  const ids = getCollapseDomByKey(key);
  if (!ids) return;
  const btn = document.getElementById(ids.btn);
  const body = document.getElementById(ids.body);
  if (next && body && !body.hidden) {
    setTimeout(() => focusFirstInCollapseBody(body), 0);
    return;
  }
  if (!next && btn && typeof btn.focus === 'function') btn.focus();
}

function ensureSensoresHardware() {
  if (!state.configTorre) state.configTorre = {};
  let s = state.configTorre.sensoresHardware;
  if (!s || typeof s !== 'object') {
    s = { ec: false, ph: false, humedad: false };
    state.configTorre.sensoresHardware = s;
  }
  if (typeof s.ec !== 'boolean') s.ec = !!s.ec;
  if (typeof s.ph !== 'boolean') s.ph = !!s.ph;
  if (typeof s.humedad !== 'boolean') s.humedad = !!s.humedad;
  return s;
}

function persistLocalidadMeteo() {
  if (!state.configTorre) state.configTorre = {};
  const v = (document.getElementById('inputLocalidadMeteo')?.value || '').trim();
  state.configTorre.localidadMeteo = v;
  if (v) {
    try {
      delete state.configTorre.hcPlantillaAutogenerada;
    } catch (_) {}
  }
  invalidateMeteoNomiCache();
  guardarEstadoTorreActual();
  saveState();
  try { refreshUbicacionInstalacionUI(); } catch (_) {}
  try { updateTorreStats(); } catch (_) {}
  void geocodificarLocalidadMeteoParaAvisos();
}

/** Municipio para clima y avisos (cfg de instalación o activa). */
function textoLocalidadMeteoCfg(cfg) {
  const c = cfg || state.configTorre || {};
  const m = (c.localidadMeteo || '').trim();
  if (m) return m;
  const ci = (c.ciudad || '').trim();
  if (ci) return ci.split(',')[0].trim();
  return '';
}

/** Sincroniza líneas de ubicación en Inicio, Riego y estados derivados. */
function refreshUbicacionInstalacionUI() {
  const txt = textoLocalidadMeteoCfg();
  const dash = document.getElementById('dashLocalidadClimaText');
  const wrap = document.getElementById('dashLocalidadClimaWrap');
  if (dash) {
    dash.textContent =
      txt ||
      'Sin municipio para clima — en Medir, arriba del todo: «Municipio (clima y avisos)», o en el asistente (engranaje)';
    dash.classList.toggle('dash-localidad-clima-text--vacío', !txt);
  }
  if (wrap) wrap.classList.toggle('dash-localidad-clima-wrap--vacío', !txt);

  const riego = document.getElementById('riegoLocalidadLine');
  if (riego) {
    riego.textContent = '';
    const icon = document.createElement('span');
    icon.className = 'riego-localidad-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<svg class="hc-ico hc-ico--ubicacion-mapa" focusable="false" aria-hidden="true"><use href="#hc-i-pin-mapa"/></svg> ';
    const body = document.createElement('span');
    body.textContent = txt
      ? txt
      : 'Sin municipio — en Medir, bloque superior «Municipio (clima y avisos)», o asistente';
    if (!txt) body.classList.add('riego-localidad-line--vacío');
    riego.appendChild(icon);
    riego.appendChild(body);
  }
  try {
    refreshAvisoUbicacionExteriorPendiente();
  } catch (_) {}
}

/**
 * Aviso explícito en Inicio y Meteo si la instalación está en exterior y faltan datos para clima/coords guardados en la instalación activa.
 */
function refreshAvisoUbicacionExteriorPendiente() {
  const dashEl = document.getElementById('dashUbicacionExteriorPendiente');
  const meteoEl = document.getElementById('meteoUbicacionExteriorPendiente');
  if (!dashEl && !meteoEl) return;
  const cfg = state.configTorre || {};
  const interior =
    typeof instalacionEsUbicacionInterior === 'function' && instalacionEsUbicacionInterior(cfg);
  if (interior) {
    [dashEl, meteoEl].forEach(el => {
      if (!el) return;
      el.innerHTML = '';
      el.classList.add('setup-hidden');
    });
    return;
  }
  const mun = typeof textoLocalidadMeteoCfg === 'function' ? textoLocalidadMeteoCfg(cfg) : '';
  const faltaMun = !mun || !String(mun).trim();
  const lat = Number(cfg.lat);
  const lon = Number(cfg.lon);
  const faltaCoords = !Number.isFinite(lat) || !Number.isFinite(lon);
  const falta = faltaMun || faltaCoords;
  const partes = [];
  if (faltaMun) partes.push('el <strong>municipio</strong> (clima y avisos)');
  if (faltaCoords) partes.push('las <strong>coordenadas</strong> en el mapa del paso de ubicación');
  const msg = falta
    ? '<svg class="hc-ico hc-ico--inline" aria-hidden="true" focusable="false"><use href="#hc-i-pin-mapa"/></svg> ' +
      '<span><strong>Ubicación incompleta</strong> (instalación en exterior): indica ' +
      (partes.length === 2 ? partes.join(' y ') : partes[0]) +
      '. <strong>Medir</strong>, bloque superior, o <strong>asistente</strong> (engranaje) → ubicación.</span>'
    : '';
  [dashEl, meteoEl].forEach(el => {
    if (!el) return;
    el.innerHTML = msg;
    el.classList.toggle('setup-hidden', !falta);
  });
}

function etiquetaFuenteMeteo(src) {
  const s = String(src || 'open-meteo').toLowerCase();
  if (s === 'metno') return 'met.no + UV free';
  if (s === 'cache') return 'Caché local';
  return 'Open-Meteo';
}

function refreshMeteoFuenteActivaUI() {
  const txt = etiquetaFuenteMeteo(state && state._meteoFuenteActiva);
  const a = document.getElementById('meteoFuenteActiva');
  if (a) a.textContent = txt;
  const b = document.getElementById('configMeteoFuenteActiva');
  if (b) b.textContent = txt;
}

function usarMunicipioGrifoParaMeteo() {
  const n = state.configAguaMunicipio;
  if (!n) {
    showToast('No hay municipio del grifo guardado. Elige «Agua del grifo» y tu pueblo arriba, o escribe el municipio a mano.', true);
    return;
  }
  const el = document.getElementById('inputLocalidadMeteo');
  if (el) el.value = String(n).split(',')[0].trim();
  persistLocalidadMeteo();
  showToast('Municipio para avisos rellenado desde el grifo', false);
}

function cargarLocalidadMeteoUI() {
  const el = document.getElementById('inputLocalidadMeteo');
  if (!el) return;
  const v = (state.configTorre && state.configTorre.localidadMeteo) ? String(state.configTorre.localidadMeteo) : '';
  el.value = v;
  const btn = document.getElementById('btnMunicipioGrifoAMeteo');
  if (btn) {
    btn.classList.toggle('setup-hidden', !(state.configAgua === 'grifo' && state.configAguaMunicipio));
  }
  refreshMeteoFuenteActivaUI();
  if (v) void geocodificarLocalidadMeteoParaAvisos();
}

function cargarInteriorGrowUI() {
  if (!state.configTorre) state.configTorre = {};
  const cfg = state.configTorre;
  const tEl = document.getElementById('interiorTempC');
  const hEl = document.getElementById('interiorHumedadAmb');
  const cEl = document.getElementById('interiorCircAire');
  if (tEl) tEl.value = cfg.interiorTempC != null && cfg.interiorTempC !== '' ? cfg.interiorTempC : '';
  if (hEl) hEl.value = cfg.interiorHumedadAmbPct != null && cfg.interiorHumedadAmbPct !== '' ? cfg.interiorHumedadAmbPct : '';
  if (cEl) cEl.checked = !!cfg.interiorCirculacionAire;
  const luz = cfg.luz || 'led';
  const idLuz = {
    natural: 'opt-interior-luz-natural', led: 'opt-interior-luz-led', mixto: 'opt-interior-luz-mixto',
    fluorescente: 'opt-interior-luz-fluorescente', hps: 'opt-interior-luz-hps', sin_luz: 'opt-interior-luz-sin'
  };
  Object.keys(idLuz).forEach(k => {
    const el = document.getElementById(idLuz[k]);
    if (!el) return;
    const sel = k === luz;
    el.classList.toggle('selected', sel);
    el.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  const hHr = Math.max(12, Math.min(20, parseInt(String(cfg.horasLuz != null ? cfg.horasLuz : 16), 10) || 16));
  const hr = document.getElementById('interiorHorasLuz');
  const hv = document.getElementById('interiorHorasLuzVal');
  if (hr) hr.value = hHr;
  if (hv) hv.textContent = hHr + ' h';
  const v = cfg.interiorIntensidadLuz || 'media';
  ['baja', 'media', 'alta'].forEach(k => {
    const el = document.getElementById('opt-int-luz-' + k);
    if (!el) return;
    const sel = k === v;
    el.classList.toggle('selected', sel);
    el.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
}

function setInteriorLuzTipo(tipo) {
  if (!state.configTorre) state.configTorre = {};
  const ok = ['natural', 'led', 'mixto', 'fluorescente', 'hps', 'sin_luz'];
  state.configTorre.luz = ok.includes(tipo) ? tipo : 'led';
  cargarInteriorGrowUI();
  persistInteriorGrow();
}

function onInteriorHorasLuzRangeInput() {
  const el = document.getElementById('interiorHorasLuz');
  const v = document.getElementById('interiorHorasLuzVal');
  if (el && v) v.textContent = el.value + ' h';
  persistInteriorGrow();
}

function setInteriorIntensidadLuz(v) {
  if (!state.configTorre) state.configTorre = {};
  state.configTorre.interiorIntensidadLuz = v;
  cargarInteriorGrowUI();
  persistInteriorGrow();
}

function persistInteriorGrow() {
  if (!state.configTorre) state.configTorre = {};
  const cfg = state.configTorre;
  const tRaw = document.getElementById('interiorTempC')?.value;
  const hRaw = document.getElementById('interiorHumedadAmb')?.value;
  cfg.interiorTempC = tRaw === '' || tRaw == null ? null : parseFloat(String(tRaw).replace(',', '.'));
  cfg.interiorHumedadAmbPct = hRaw === '' || hRaw == null ? null : parseFloat(String(hRaw).replace(',', '.'));
  cfg.interiorCirculacionAire = !!document.getElementById('interiorCircAire')?.checked;
  const hzRaw = document.getElementById('interiorHorasLuz')?.value;
  let hz = hzRaw == null || hzRaw === '' ? null : parseInt(String(hzRaw), 10);
  if (!Number.isFinite(hz)) hz = cfg.horasLuz;
  cfg.horasLuz = hz == null ? 16 : Math.max(12, Math.min(20, hz));
  const idLuz = {
    natural: 'opt-interior-luz-natural', led: 'opt-interior-luz-led', mixto: 'opt-interior-luz-mixto',
    fluorescente: 'opt-interior-luz-fluorescente', hps: 'opt-interior-luz-hps', sin_luz: 'opt-interior-luz-sin'
  };
  let luzPick = cfg.luz || 'led';
  const orden = ['natural', 'led', 'mixto', 'fluorescente', 'hps', 'sin_luz'];
  for (let i = 0; i < orden.length; i++) {
    const el = document.getElementById(idLuz[orden[i]]);
    if (el && el.classList.contains('selected')) {
      luzPick = orden[i];
      break;
    }
  }
  cfg.luz = luzPick;
  if (!cfg.interiorIntensidadLuz) cfg.interiorIntensidadLuz = 'media';
  guardarEstadoTorreActual();
  saveState();
  if (document.getElementById('tab-riego')?.classList.contains('active')) calcularRiego();
}

function actualizarECBase() {
  const val = parseInt(document.getElementById('inputECBaseGrifo').value) || 850;
  if (state.configAgua === 'grifo') {
    CONFIG_AGUA.grifo.ecBase = val;
    state.configAguaEC = val;
    actualizarRangoEC();
    refreshConsejosSiVisible();
  }
}

function actualizarRangoEC() {
  const agua = CONFIG_AGUA[state.configAgua || 'destilada'];
  const ecBase = agua.ecBase;
  const margen = 1400 - ecBase;

  // Actualizar rango mostrado en mediciones si el agua es grifo
  const rangeEl = document.querySelector('#cardEC .param-range');
  if (rangeEl) {
    if (state.configAgua === 'grifo') {
      rangeEl.textContent = `Margen: ${ecBase + 300}-${ecBase + 400} µS/cm (base: ${ecBase})`;
    } else {
      rangeEl.textContent = '1300 – 1400 µS/cm';
    }
  }
}

function toggleMedirDwcConfigBlock(n) {
  const body = document.getElementById(n === 1 ? 'medirDwcBlock1Body' : 'medirDwcBlock2Body');
  const btn = document.getElementById(n === 1 ? 'btnMedirDwcBlock1' : 'btnMedirDwcBlock2');
  if (!body || !btn) return;
  const expanded = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  body.hidden = expanded;
  btn.classList.toggle('is-collapsed', expanded);
}

function initConfigUI() {
  const cfgTorre = state.configTorre || {};
  if (cfgTorre.operativa == null) cfgTorre.operativa = true;
  const cp = document.getElementById('configPanel');
  if (cp) cp.classList.toggle('config-panel--dwc', cfgTorre.tipoInstalacion === 'dwc');

  const b1 = document.getElementById('medirDwcBlock1Body');
  const b2 = document.getElementById('medirDwcBlock2Body');
  const btn1 = document.getElementById('btnMedirDwcBlock1');
  const btn2 = document.getElementById('btnMedirDwcBlock2');
  if (b1) b1.hidden = true;
  if (b2) b2.hidden = true;
  if (btn1) {
    btn1.setAttribute('aria-expanded', 'false');
    btn1.classList.add('is-collapsed');
  }
  if (btn2) {
    btn2.setAttribute('aria-expanded', 'false');
    btn2.classList.add('is-collapsed');
  }

  const agua = state.configAgua || 'destilada';
  const sustrato = state.configTorre?.sustrato || state.configSustrato || 'esponja';
  const authRememberSel = document.getElementById('authRememberSelect');
  if (authRememberSel) authRememberSel.value = String(getAuthRememberMinutes());

  ['destilada','osmosis','grifo'].forEach(t => {
    const el = document.getElementById('opt-' + t);
    if (!el) return;
    const sel = t === agua;
    el.classList.toggle('selected', sel);
    el.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  Object.keys(CONFIG_SUSTRATO).forEach(t => {
    const el = document.getElementById('opt-' + t);
    if (!el) return;
    const sel = t === normalizaSustratoKey(sustrato);
    el.classList.toggle('selected', sel);
    el.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
  cargarLocalidadMeteoUI();
  cargarUbicacionMedicionesUI();
  actualizarVisibilidadPanelInteriorGrow();
  actualizarVisibilidadPanelCalentadorConsigna();
  cargarInteriorGrowUI();
  applyMedirCollapseUI();

  syncMedirAguaResumen();
  syncMedirSustratoResumen();
  const chkA = document.getElementById('chkMedirCambiarAgua');
  const chkS = document.getElementById('chkMedirCambiarSustrato');
  const aguaIncompletaGrifo = agua === 'grifo' && !state.configAguaMunicipio && !(parseFloat(state.configAguaEC) > 0);
  if (chkA) {
    chkA.checked = !!aguaIncompletaGrifo;
    toggleMedirOpcionesAgua();
  }
  if (chkS) { chkS.checked = false; toggleMedirOpcionesSustrato(); }

  if (agua === 'grifo') {
    document.getElementById('warningGrifo')?.classList.add('show');
    document.getElementById('ecBaseGrifo')?.classList.add('show');
    const inpMuni = document.getElementById('inputBuscarMunicipio');
    if (state.configAguaMunicipio) {
      if (inpMuni) inpMuni.value = state.configAguaMunicipio;
      const data = AGUA_MUNICIPIOS[state.configAguaMunicipio];
      if (data) {
        const btn = document.getElementById('btnGeolocalizacion');
        if (btn) btn.style.display = 'none';
        seleccionarMunicipio(state.configAguaMunicipio, data.ec, data.dureza, data.nota);
      } else {
        if (state.configAguaEC) {
          const ecBF = document.getElementById('inputECBaseGrifo');
          if (ecBF) ecBF.value = state.configAguaEC;
          CONFIG_AGUA.grifo.ecBase = state.configAguaEC;
        }
        try {
          actualizarWarningGrifoSegunEstado();
        } catch (_) {}
      }
    } else {
      if (state.configAguaEC) {
        const ecBF = document.getElementById('inputECBaseGrifo');
        if (ecBF) ecBF.value = state.configAguaEC;
        CONFIG_AGUA.grifo.ecBase = state.configAguaEC;
      }
      try {
        actualizarWarningGrifoSegunEstado();
      } catch (_) {}
    }
  }
  if (document.getElementById('tab-mediciones')?.classList.contains('active') && typeof updateRecargaBar === 'function') {
    updateRecargaBar();
  }
  if (document.getElementById('tab-mediciones')?.classList.contains('active') && typeof actualizarResumenReposicionParcialUI === 'function') {
    actualizarResumenReposicionParcialUI();
  }
  if (typeof actualizarEstadoOperativaUI === 'function') {
    actualizarEstadoOperativaUI();
  }
  try {
    if (typeof actualizarBadgesNutriente === 'function') actualizarBadgesNutriente();
  } catch (_) {}
}


