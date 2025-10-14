import axios from 'axios';

export async function recacheNoticia(slug) {
  const prerenderToken = 'rDjdSfG9AiLjP4fYB9Xd';
  const url = `https://maslatino.netlify.app/noticia/${slug}`;

  try {
    const res = await axios.post(
      'https://api.prerender.io/recache',
      { prerenderToken, url },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Prerender-Token': prerenderToken,
        },
      }
    );
    console.log(`✅ Prerender recache ok para ${slug}`);
  } catch (err) {
    console.error(`❌ Error al recachear ${slug}:`, err.message);
  }
}
