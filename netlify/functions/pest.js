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

  // Curated Wikipedia article titles for accurate pest photos
  var WIKI_TITLES = {
    'mosquito': 'Mosquito',
    'aedes mosquito': 'Aedes aegypti',
    'tick': 'Tick',
    'deer tick': 'Ixodes scapularis',
    'black-legged tick': 'Ixodes scapularis',
    'american dog tick': 'Dermacentor variabilis',
    'lone star tick': 'Amblyomma americanum',
    'brown dog tick': 'Rhipicephalus sanguineus',
    'no-see-um': 'Ceratopogonidae',
    'biting midge': 'Ceratopogonidae',
    'sand flea': 'Tunga penetrans',
    'beach flea': 'Orchestia gammarellus',
    'chigger': 'Trombiculidae',
    'deer fly': 'Chrysops',
    'horse fly': 'Tabanidae',
    'black fly': 'Simuliidae',
    'stable fly': 'Stomoxys calcitrans',
    'fire ant': 'Solenopsis invicta',
    'ant': 'Ant',
    'carpenter ant': 'Camponotus',
    'wasp': 'Wasp',
    'yellow jacket': 'Vespula',
    'hornet': 'Vespa (genus)',
    'bald-faced hornet': 'Dolichovespula maculata',
    'honey bee': 'Apis mellifera',
    'bee': 'Bee',
    'gnat': 'Fungus gnat',
    'flea': 'Flea',
    'cat flea': 'Ctenocephalides felis',
    'bed bug': 'Cimex lectularius',
    'cockroach': 'Cockroach',
    'german cockroach': 'Blattella germanica',
    'spider': 'Spider',
    'brown recluse': 'Loxosceles reclusa',
    'black widow': 'Latrodectus',
    'wolf spider': 'Wolf spider',
    'scorpion': 'Scorpion',
    'centipede': 'Centipede',
    'millipede': 'Millipede',
    'stink bug': 'Halyomorpha halys',
    'boxelder bug': 'Boisea trivittata',
    'earwig': 'Earwig',
    'moth': 'Moth',
    'clothes moth': 'Tineola bisselliella',
    'beetle': 'Beetle',
    'japanese beetle': 'Popillia japonica',
    'cricket': 'Cricket (insect)',
    'caterpillar': 'Caterpillar',
    'aphid': 'Aphid',
    'whitefly': 'Whitefly',
    'mite': 'Mite',
    'louse': 'Louse',
    'head louse': 'Pediculus humanus capitis',
    'fly': 'Fly'
  };

  function getWikiTitle(pestName) {
    var lower = pestName.toLowerCase();
    if (WIKI_TITLES[lower]) return WIKI_TITLES[lower];
    var keys = Object.keys(WIKI_TITLES);
    for (var i = 0; i < keys.length; i++) {
      if (lower.indexOf(keys[i]) !== -1 || keys[i].indexOf(lower) !== -1) {
        return WIKI_TITLES[keys[i]];
      }
    }
    // Fallback: use pest name directly as Wikipedia title
    return pestName;
  }

  async function getWikiImage(pestName) {
    try {
      var title = getWikiTitle(pestName);
      var url = 'https://en.wikipedia.org/w/api.php?action=query&titles=' +
        encodeURIComponent(title) +
        '&prop=pageimages&format=json&pithumbsize=500&origin=*';
      var resp = await fetch(url);
      var data = await resp.json();
      var pages = data.query && data.query.pages;
      if (!pages) return null;
      var pageId = Object.keys(pages)[0];
      var page = pages[pageId];
      if (page && page.thumbnail && page.thumbnail.source) {
        return {
          url: page.thumbnail.source,
          credit: 'Wikipedia / Wikimedia Commons'
        };
      }
      return null;
    } catch(e) {
      return null;
    }
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

    if (result.pests && result.pests.length) {
      var imagePromises = result.pests.map(async function(pest) {
        var img = await getWikiImage(pest.name);
        if (img) {
          pest.image_url = img.url;
          pest.image_credit = img.credit;
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
