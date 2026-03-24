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

  // Curated search terms that return accurate Unsplash photos
  var SEARCH_TERMS = {
    'mosquito': 'mosquito insect closeup',
    'tick': 'tick arachnid macro',
    'deer tick': 'deer tick ixodes macro',
    'black-legged tick': 'deer tick ixodes macro',
    'american dog tick': 'dog tick dermacentor macro',
    'lone star tick': 'lone star tick amblyomma',
    'no-see-um': 'biting midge ceratopogonidae insect',
    'biting midge': 'biting midge ceratopogonidae insect',
    'sand flea': 'sand flea beach insect',
    'chigger': 'chigger mite trombiculidae macro',
    'deer fly': 'deer fly chrysops insect',
    'horse fly': 'horse fly tabanidae insect',
    'black fly': 'black fly simuliidae insect',
    'fire ant': 'fire ant solenopsis macro',
    'ant': 'ant insect macro closeup',
    'wasp': 'wasp vespula insect macro',
    'yellow jacket': 'yellow jacket wasp insect',
    'hornet': 'hornet vespa insect macro',
    'bee': 'honey bee apis insect flower',
    'gnat': 'fungus gnat diptera insect',
    'flea': 'flea siphonaptera insect macro',
    'bed bug': 'bed bug cimex lectularius macro',
    'cockroach': 'cockroach blattodea insect macro',
    'spider': 'spider arachnid macro closeup',
    'brown recluse': 'brown recluse spider loxosceles',
    'black widow': 'black widow spider latrodectus',
    'scorpion': 'scorpion arachnid macro desert',
    'centipede': 'centipede chilopoda macro',
    'stink bug': 'stink bug halyomorpha insect',
    'boxelder bug': 'boxelder bug boisea insect',
    'moth': 'moth lepidoptera insect macro',
    'beetle': 'beetle coleoptera insect macro',
    'cricket': 'cricket gryllus insect macro',
    'caterpillar': 'caterpillar larva insect macro',
    'earwig': 'earwig forficula insect macro',
    'millipede': 'millipede diplopoda macro',
    'whitefly': 'whitefly aleyrodidae insect plant',
    'aphid': 'aphid plant lice insect macro',
    'mite': 'spider mite acari macro',
    'louse': 'louse pediculus insect macro',
    'fly': 'fly diptera insect macro'
  };

  function getSearchTerm(pestName) {
    var lower = pestName.toLowerCase();
    // Try exact match first
    if (SEARCH_TERMS[lower]) return SEARCH_TERMS[lower];
    // Try partial match
    var keys = Object.keys(SEARCH_TERMS);
    for (var i = 0; i < keys.length; i++) {
      if (lower.indexOf(keys[i]) !== -1 || keys[i].indexOf(lower) !== -1) {
        return SEARCH_TERMS[keys[i]];
      }
    }
    // Fallback: use pest name + insect macro
    return pestName + ' insect macro';
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

    if (unsplashKey && result.pests && result.pests.length) {
      var imagePromises = result.pests.map(async function(pest) {
        try {
          var searchTerm = getSearchTerm(pest.name);
          var q = encodeURIComponent(searchTerm);
          var imgResp = await fetch(
            'https://api.unsplash.com/search/photos?query=' + q + '&per_page=1&orientation=landscape',
            { headers: { 'Authorization': 'Client-ID ' + unsplashKey } }
          );
          var imgData = await imgResp.json();
          if (imgData.results && imgData.results.length > 0) {
            pest.image_url = imgData.results[0].urls.small;
            pest.image_credit = imgData.results[0].user.name;
          }
        } catch(imgErr) {
          // fail silently, card shows without image
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
