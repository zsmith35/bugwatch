exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try { body = JSON.parse(event.body); } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const location = body.location || '';
  const month = body.month || 'March';
  if (!location.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Location is required' }) };
  }

  const lines = [
    'You are an expert entomologist and pest control specialist.',
    'The user wants to know about pest and bug activity at: ' + location,
    'for the month of: ' + month,
    'If the input looks like a US zip code (5 digits), resolve it to the correct city and state.',
    '',
    'Return ONLY a valid JSON object with no extra text, explanation, or markdown formatting.',
    'The JSON must use double quotes and match this exact structure:',
    '{',
    '"location_display": "Readable location name (City, State or Park Name)",',
    '"month": "' + month + '",',
    '"activity_level": "High or Moderate or Low",',
    '"alert": {',
    '  "active": false,',
    '  "title": "",',
    '  "text": ""',
    '},',
    '"pests": [',
    '  {',
    '    "name": "Common name of pest",',
    '    "search_term": "simple 1-2 word search term for finding a photo of this pest e.g. mosquito insect",',
    '    "category": "One of: Biting Insect, Stinging Insect, Nuisance Pest, Tick or Arachnid, Flying Pest",',
    '    "severity": "High or Medium or Low",',
    '    "description": "2-3 sentence description specific to this location and time of year.",',
    '    "peak_timing": "When they are most active this month",',
    '    "prevention_tips": ["tip one", "tip two", "tip three"]',
    '  }',
    ']',
    '}',
    '',
    'Rules:',
    '- Include 4 to 8 pests that are genuinely present in this region during ' + month,
    '- Include lesser-known but impactful pests like sand fleas, no-see-ums, chiggers, deer flies, biting midges',
    '- Set alert.active to true and fill in title and text if there is a noteworthy pest health risk',
    '- ONLY output the JSON object. Nothing before it. Nothing after it.'
  ];

  const prompt = lines.join('\n');

  try {
    // Step 1: Get pest data from Claude
    const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': process.env.ANTHROPIC_API_KEY
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const claudeData = await claudeResp.json();
    if (!claudeResp.ok) {
      return { statusCode: claudeResp.status, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: claudeData.error || 'Claude API error' }) };
    }

    const text = claudeData.content.map(b => b.type === 'text' ? b.text : '').join('');
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return { statusCode: 500, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No JSON in model response' }) };
    }

    let result;
    try { result = JSON.parse(match[0]); } catch(e) {
      return { statusCode: 500, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'JSON parse failed: ' + e.message }) };
    }

    // Step 2: Fetch Unsplash images for each pest in parallel
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    if (unsplashKey && result.pests && result.pests.length) {
      const imagePromises = result.pests.map(async function(pest) {
        try {
          const q = encodeURIComponent((pest.search_term || pest.name) + ' insect macro');
          const imgResp = await fetch(
            'https://api.unsplash.com/search/photos?query=' + q + '&per_page=1&orientation=landscape',
            { headers: { 'Authorization': 'Client-ID ' + unsplashKey } }
          );
          const imgData = await imgResp.json();
          if (imgData.results && imgData.results.length > 0) {
            pest.image_url = imgData.results[0].urls.small;
            pest.image_credit = imgData.results[0].user.name;
          }
        } catch(e) {
          // Image fetch failed silently - card will show without image
        }
        return pest;
      });
      result.pests = await Promise.all(imagePromises);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };

  } catch(e) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message || 'Unknown error' }) };
  }
};
