exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  var body;
  try { body = JSON.parse(event.body); } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  var location = body.location || '';
  var month = body.month || 'March';
  if (!location.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Location is required' }) };
  }

  var prompt = [
    'You are an expert entomologist and pest control specialist.',
    'Location: ' + location + '. Month: ' + month + '.',
    'If this is a US zip code resolve it to city and state first.',
    '',
    'Return ONLY a raw JSON object, no markdown, no explanation.',
    '{',
    '  "location_display": "City, State",',
    '  "month": "' + month + '",',
    '  "activity_level": "High or Moderate or Low",',
    '  "alert": { "active": false, "title": "", "text": "" },',
    '  "pests": [',
    '    {',
    '      "name": "Pest name",',
    '      "search_term": "1-2 word photo search e.g. mosquito",',
    '      "category": "Biting Insect or Stinging Insect or Nuisance Pest or Tick or Arachnid or Flying Pest",',
    '      "severity": "High or Medium or Low",',
    '      "description": "2-3 sentences about this pest at this location this month.",',
    '      "peak_timing": "When most active",',
    '      "prevention_tips": ["tip 1", "tip 2", "tip 3"]',
    '    }',
    '  ]',
    '}',
    '',
    'Include 4-8 pests relevant to ' + location + ' in ' + month + '.',
    'Include lesser-known ones: sand fleas, no-see-ums, chiggers, deer flies where applicable.',
    'ONLY output the JSON object.'
  ].join('\n');

  try {
    var claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
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

    var claudeData = await claudeResp.json();
    if (!claudeResp.ok) {
      return {
        statusCode: claudeResp.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: claudeData.error || 'Claude API error' })
      };
    }

    var text = claudeData.content.map(function(b) {
      return b.type === 'text' ? b.text : '';
    }).join('');

    var match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No JSON in response' })
      };
    }

    var result;
    try { result = JSON.parse(match[0]); } catch(e) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'JSON parse failed: ' + e.message })
      };
    }

    var unsplashKey = process.env.UNSPLASH_ACCESS_KEY || '';
    result.debug_key_set = unsplashKey.length > 0;
    result.debug_key_prefix = unsplashKey.slice(0, 6);

    if (unsplashKey && result.pests && result.pests.length) {
      var imagePromises = result.pests.map(async function(pest) {
        try {
          var q = encodeURIComponent((pest.search_term || pest.name) + ' insect');
          var imgResp = await fetch(
            'https://api.unsplash.com/search/photos?query=' + q + '&per_page=1&orientation=landscape',
            { headers: { 'Authorization': 'Client-ID ' + unsplashKey } }
          );
          var imgData = await imgResp.json();
          pest.debug_img_status = imgResp.status;
          if (imgData.results && imgData.results.length > 0) {
            pest.image_url = imgData.results[0].urls.small;
            pest.image_credit = imgData.results[0].user.name;
          } else {
            pest.debug_img_error = JSON.stringify(imgData).slice(0, 150);
          }
        } catch(imgErr) {
          pest.debug_img_error = imgErr.message;
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
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message || 'Unknown error' })
    };
  }
};
