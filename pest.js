export default async function handler(req, res) {
if (req.method !== ‘POST’) {
return res.status(405).json({ error: ‘Method Not Allowed’ });
}

var body = req.body;
if (!body || !body.location) {
return res.status(400).json({ error: ‘Location is required’ });
}

var location = body.location || ‘’;
var month = body.month || ‘March’;

// Resolve zip code to accurate city/state via Zippopotam.us
async function resolveZip(input) {
var trimmed = input.trim();
if (!/^\d{5}$/.test(trimmed)) return trimmed; // not a zip, return as-is
try {
var resp = await fetch(‘https://api.zippopotam.us/us/’ + trimmed);
if (!resp.ok) return trimmed;
var data = await resp.json();
if (data.places && data.places.length > 0) {
var place = data.places[0];
return place[‘place name’] + ‘, ’ + place[‘state abbreviation’] + ’ (’ + trimmed + ‘)’;
}
return trimmed;
} catch(e) {
return trimmed;
}
}

// Resolve location before passing to Claude
location = await resolveZip(location);

async function getINatImage(pestName) {
try {
var q = encodeURIComponent(pestName);
var url = ‘https://api.inaturalist.org/v1/taxa?q=’ + q + ‘&per_page=1&rank=species,genus,family’;
var resp = await fetch(url, {
headers: { ‘Accept’: ‘application/json’ }
});
var data = await resp.json();
if (data.results && data.results.length > 0) {
var taxon = data.results[0];
var result = {
scientific_name: taxon.name || null,
credit: null,
url: null
};
if (taxon.default_photo && taxon.default_photo.medium_url) {
result.url = taxon.default_photo.medium_url;
result.credit = taxon.default_photo.attribution || ‘iNaturalist’;
}
return result;
}
return null;
} catch(e) {
return null;
}
}

var prompt = [
‘You are an expert entomologist and pest control specialist.’,
‘Location: ’ + location + ‘. Month: ’ + month + ‘.’,
‘If this is a US zip code resolve it to city and state first.’,
‘’,
‘Return ONLY a raw JSON object, no markdown, no explanation.’,
‘{’,
’  “location_display”: “City, State”,’,
’  “month”: “’ + month + ‘”,’,
’  “activity_level”: “High or Moderate or Low”,’,
’  “alert”: { “active”: false, “title”: “”, “text”: “” },’,
’  “pests”: [’,
’    {’,
’      “name”: “Pest name”,’,
’      “category”: “Biting Insect or Stinging Insect or Nuisance Pest or Tick or Arachnid or Flying Pest”,’,
’      “severity”: “High or Medium or Low”,’,
’      “description”: “2-3 sentences about this pest at this location this month.”,’,
’      “peak_timing”: “When most active”,’,
’      “prevention_tips”: [“tip 1”, “tip 2”, “tip 3”]’,
’    }’,
’  ]’,
‘}’,
‘’,
‘Include 4-8 pests relevant to ’ + location + ’ in ’ + month + ‘.’,
‘Include lesser-known ones: sand fleas, no-see-ums, chiggers, deer flies where applicable.’,
‘ONLY output the JSON object.’
].join(’\n’);

try {
var claudeResp = await fetch(‘https://api.anthropic.com/v1/messages’, {
method: ‘POST’,
headers: {
‘Content-Type’: ‘application/json’,
‘anthropic-version’: ‘2023-06-01’,
‘x-api-key’: process.env.ANTHROPIC_API_KEY
},
body: JSON.stringify({
model: ‘claude-haiku-4-5-20251001’,
max_tokens: 4000,
messages: [{ role: ‘user’, content: prompt }]
})
});

```
var claudeData = await claudeResp.json();
if (!claudeResp.ok) {
  return res.status(claudeResp.status).json({ error: claudeData.error || 'Claude API error' });
}

var text = claudeData.content.map(function(b) {
  return b.type === 'text' ? b.text : '';
}).join('');

var match = text.match(/\{[\s\S]*\}/);
if (!match) {
  return res.status(500).json({ error: 'No JSON in response' });
}

var result;
try { result = JSON.parse(match[0]); } catch(e) {
  return res.status(500).json({ error: 'JSON parse failed: ' + e.message });
}

if (result.pests && result.pests.length) {
  var imagePromises = result.pests.map(async function(pest) {
    var img = await getINatImage(pest.name);
    if (img) {
      if (img.url) {
        pest.image_url = img.url;
        pest.image_credit = img.credit;
      }
      if (img.scientific_name) {
        pest.scientific_name = img.scientific_name;
      }
    }
    return pest;
  });
  result.pests = await Promise.all(imagePromises);
}

return res.status(200).json(result);
```

} catch(e) {
return res.status(500).json({ error: e.message || ‘Unknown error’ });
}
}
