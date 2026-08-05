// data/worldCup2026Matches.js
//
// Dataset estático con los partidos de la Copa Mundial de la FIFA 2026 que se
// juegan en cada ciudad sede de EE. UU. (mismos slugs que SLUG_TO_QUERY en
// GooglePlacesService). Por ahora solo incluye la fase eliminatoria
// (Dieciseisavos en adelante), cuyo cruce de fechas/sede/ronda es información
// pública confirmada por la FIFA. Los partidos de fase de grupos pueden
// agregarse después con la misma forma (campo "teams" con nombres reales).
//
// Cuando un equipo todavía no está definido se usa una descripción del cruce
// (ej. "Ganador del Grupo L") en vez de "Por definir", para dar más contexto.

const WORLD_CUP_2026_MATCHES = [
  // Atlanta - Mercedes-Benz Stadium
  {
    id: 'm80',
    citySlug: 'atlanta',
    stadium: 'Mercedes-Benz Stadium',
    date: '2026-07-01',
    stage: 'Dieciseisavos de final',
    teams: { home: 'Ganador del Grupo L', away: '3.º mejor de los Grupos E, H, I, J o K' },
  },
  {
    id: 'm95',
    citySlug: 'atlanta',
    stadium: 'Mercedes-Benz Stadium',
    date: '2026-07-07',
    stage: 'Octavos de final',
    teams: { home: 'Ganador del Partido 86', away: 'Ganador del Partido 88' },
  },
  {
    id: 'm102',
    citySlug: 'atlanta',
    stadium: 'Mercedes-Benz Stadium',
    date: '2026-07-15',
    stage: 'Semifinal',
    teams: { home: 'Ganador del Partido 99', away: 'Ganador del Partido 100' },
  },

  // Boston - Gillette Stadium
  {
    id: 'm74',
    citySlug: 'boston',
    stadium: 'Gillette Stadium',
    date: '2026-06-29',
    stage: 'Dieciseisavos de final',
    teams: { home: 'Ganador del Grupo E', away: '3.º mejor de los Grupos A, B, C, D o F' },
  },
  {
    id: 'm97',
    citySlug: 'boston',
    stadium: 'Gillette Stadium',
    date: '2026-07-09',
    stage: 'Cuartos de final',
    teams: { home: 'Ganador del Partido 89', away: 'Ganador del Partido 90' },
  },

  // Dallas - AT&T Stadium
  {
    id: 'm78',
    citySlug: 'dallas',
    stadium: 'AT&T Stadium',
    date: '2026-06-30',
    stage: 'Dieciseisavos de final',
    teams: { home: '2.º del Grupo E', away: '2.º del Grupo I' },
  },
  {
    id: 'm88',
    citySlug: 'dallas',
    stadium: 'AT&T Stadium',
    date: '2026-07-03',
    stage: 'Dieciseisavos de final',
    teams: { home: '2.º del Grupo D', away: '2.º del Grupo G' },
  },
  {
    id: 'm93',
    citySlug: 'dallas',
    stadium: 'AT&T Stadium',
    date: '2026-07-06',
    stage: 'Octavos de final',
    teams: { home: 'Ganador del Partido 83', away: 'Ganador del Partido 84' },
  },
  {
    id: 'm101',
    citySlug: 'dallas',
    stadium: 'AT&T Stadium',
    date: '2026-07-14',
    stage: 'Semifinal',
    teams: { home: 'Ganador del Partido 97', away: 'Ganador del Partido 98' },
  },

  // Houston - NRG Stadium
  {
    id: 'm76',
    citySlug: 'houston',
    stadium: 'NRG Stadium',
    date: '2026-06-29',
    stage: 'Dieciseisavos de final',
    teams: { home: 'Ganador del Grupo C', away: '2.º del Grupo F' },
  },
  {
    id: 'm90',
    citySlug: 'houston',
    stadium: 'NRG Stadium',
    date: '2026-07-04',
    stage: 'Octavos de final',
    teams: { home: 'Ganador del Partido 73', away: 'Ganador del Partido 75' },
  },

  // Kansas City - Arrowhead Stadium
  {
    id: 'm87',
    citySlug: 'kansas-city',
    stadium: 'Arrowhead Stadium',
    date: '2026-07-03',
    stage: 'Dieciseisavos de final',
    teams: { home: 'Ganador del Grupo K', away: '3.º mejor de los Grupos D, E, I, J o L' },
  },
  {
    id: 'm100',
    citySlug: 'kansas-city',
    stadium: 'Arrowhead Stadium',
    date: '2026-07-11',
    stage: 'Cuartos de final',
    teams: { home: 'Ganador del Partido 95', away: 'Ganador del Partido 96' },
  },

  // Los Angeles - SoFi Stadium
  {
    id: 'm73',
    citySlug: 'los-angeles',
    stadium: 'SoFi Stadium',
    date: '2026-06-28',
    stage: 'Dieciseisavos de final',
    teams: { home: '2.º del Grupo A', away: '2.º del Grupo B' },
  },
  {
    id: 'm84',
    citySlug: 'los-angeles',
    stadium: 'SoFi Stadium',
    date: '2026-07-02',
    stage: 'Dieciseisavos de final',
    teams: { home: 'Ganador del Grupo H', away: '2.º del Grupo J' },
  },
  {
    id: 'm98',
    citySlug: 'los-angeles',
    stadium: 'SoFi Stadium',
    date: '2026-07-10',
    stage: 'Cuartos de final',
    teams: { home: 'Ganador del Partido 93', away: 'Ganador del Partido 94' },
  },

  // Miami - Hard Rock Stadium
  {
    id: 'm86',
    citySlug: 'miami',
    stadium: 'Hard Rock Stadium',
    date: '2026-07-03',
    stage: 'Dieciseisavos de final',
    teams: { home: 'Ganador del Grupo J', away: '2.º del Grupo H' },
  },
  {
    id: 'm99',
    citySlug: 'miami',
    stadium: 'Hard Rock Stadium',
    date: '2026-07-11',
    stage: 'Cuartos de final',
    teams: { home: 'Ganador del Partido 91', away: 'Ganador del Partido 92' },
  },
  {
    id: 'm103',
    citySlug: 'miami',
    stadium: 'Hard Rock Stadium',
    date: '2026-07-18',
    stage: 'Tercer lugar',
    teams: { home: 'Perdedor del Partido 101', away: 'Perdedor del Partido 102' },
  },

  // New York/New Jersey - MetLife Stadium
  {
    id: 'm77',
    citySlug: 'new-york',
    stadium: 'MetLife Stadium',
    date: '2026-06-30',
    stage: 'Dieciseisavos de final',
    teams: { home: 'Ganador del Grupo I', away: '3.º mejor de los Grupos C, D, F, G o H' },
  },
  {
    id: 'm91',
    citySlug: 'new-york',
    stadium: 'MetLife Stadium',
    date: '2026-07-05',
    stage: 'Octavos de final',
    teams: { home: 'Ganador del Partido 76', away: 'Ganador del Partido 78' },
  },
  {
    id: 'm104',
    citySlug: 'new-york',
    stadium: 'MetLife Stadium',
    date: '2026-07-19',
    stage: 'Final',
    teams: { home: 'Ganador del Partido 101', away: 'Ganador del Partido 102' },
  },

  // Filadelfia - Lincoln Financial Field
  {
    id: 'm89',
    citySlug: 'filadelfia',
    stadium: 'Lincoln Financial Field',
    date: '2026-07-04',
    stage: 'Octavos de final',
    teams: { home: 'Ganador del Partido 74', away: 'Ganador del Partido 77' },
  },

  // San Francisco Bay Area - Levi's Stadium
  {
    id: 'm81',
    citySlug: 'san-francisco',
    stadium: "Levi's Stadium",
    date: '2026-07-01',
    stage: 'Dieciseisavos de final',
    teams: { home: 'Ganador del Grupo D', away: '3.º mejor de los Grupos B, E, F, I o J' },
  },

  // Seattle - Lumen Field
  {
    id: 'm82',
    citySlug: 'seattle',
    stadium: 'Lumen Field',
    date: '2026-07-01',
    stage: 'Dieciseisavos de final',
    teams: { home: 'Ganador del Grupo G', away: '3.º mejor de los Grupos A, E, H, I o J' },
  },
  {
    id: 'm94',
    citySlug: 'seattle',
    stadium: 'Lumen Field',
    date: '2026-07-06',
    stage: 'Octavos de final',
    teams: { home: 'Ganador del Partido 81', away: 'Ganador del Partido 82' },
  },
];

export default WORLD_CUP_2026_MATCHES;
