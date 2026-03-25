export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  var body = req.body;
  if (!body || !body.location) {
    return res.status(400).json({ error: 'Location is required' });
  }

  var location = body.location || '';
  var month = body.month || 'March';

  async function resolveZip(input) {
    var trimmed = input.trim();
    if (!/^\d{5}$/.test(trimmed)) return trimmed;
    try {
      var controller = new AbortController();
      var timer = setTimeout(function(){ controller.abort(); }, 3000);
      var resp = await fetch('https://api.zippopotam.us/us/' + trimmed, { signal: controller.signal });
      clearTimeout(timer);
      if (!resp.ok) return trimmed;
      var data = await resp.json();
      if (data.places && data.places.length > 0) {
        var place = data.places[0];
        return place['place name'] + ', ' + place['state abbreviation'];
      }
      return trimmed;
    } catch(e) { return trimmed; }
  }

  var TAXON_MAP = {
    'aedes mosquito': { id: 128663, slug: 'aedes' },
    'alligator': { id: 26395, slug: 'alligator-mississippiensis' },
    'american alligator': { id: 26395, slug: 'alligator-mississippiensis' },
    'american cockroach': { id: 128621, slug: 'periplaneta-americana' },
    'american dog tick': { id: 119776, slug: 'dermacentor-variabilis' },
    'ant': { id: 47221, slug: 'formicidae' },
    'ants': { id: 47221, slug: 'formicidae' },
    'aphid': { id: 47803, slug: 'aphididae' },
    'bald-faced hornet': { id: 119798, slug: 'dolichovespula-maculata' },
    'bed bug': { id: 128632, slug: 'cimex-lectularius' },
    'bed bugs': { id: 128632, slug: 'cimex-lectularius' },
    'bee': { id: 47219, slug: 'anthophila' },
    'beetle': { id: 47208, slug: 'coleoptera' },
    'beetles': { id: 47208, slug: 'coleoptera' },
    'biting midge': { id: 128556, slug: 'ceratopogonidae' },
    'biting midges': { id: 128556, slug: 'ceratopogonidae' },
    'black flies': { id: 128550, slug: 'simuliidae' },
    'black fly': { id: 128550, slug: 'simuliidae' },
    'black widow': { id: 119799, slug: 'latrodectus' },
    'black-legged tick': { id: 119775, slug: 'ixodes-scapularis' },
    'blacklegged tick': { id: 119775, slug: 'ixodes-scapularis' },
    'box jellyfish': { id: 126262, slug: 'cubozoa' },
    'boxelder bug': { id: 128631, slug: 'boisea-trivittata' },
    'boxelder bugs': { id: 128631, slug: 'boisea-trivittata' },
    'brown dog tick': { id: 119777, slug: 'rhipicephalus-sanguineus' },
    'brown recluse': { id: 119803, slug: 'loxosceles-reclusa' },
    'buffalo bur': { id: 126276, slug: 'solanum-rostratum' },
    'bumble bee': { id: 52775, slug: 'bombus' },
    'cactus': { id: 47727, slug: 'cactaceae' },
    'carpenter ant': { id: 128570, slug: 'camponotus' },
    'carpenter ants': { id: 128570, slug: 'camponotus' },
    'carpenter bee': { id: 128600, slug: 'xylocopa' },
    'cat flea': { id: 128677, slug: 'ctenocephalides-felis' },
    'caterpillar': { id: 47157, slug: 'lepidoptera' },
    'caterpillars': { id: 47157, slug: 'lepidoptera' },
    'centipede': { id: 47506, slug: 'chilopoda' },
    'centipedes': { id: 47506, slug: 'chilopoda' },
    'chigger': { id: 128680, slug: 'trombiculidae' },
    'chiggers': { id: 128680, slug: 'trombiculidae' },
    'cicada killer': { id: 119805, slug: 'sphecius-speciosus' },
    'cockroach': { id: 47822, slug: 'blattodea' },
    'cockroaches': { id: 47822, slug: 'blattodea' },
    'copperhead': { id: 73741, slug: 'agkistrodon-contortrix' },
    'coral snake': { id: 85563, slug: 'micrurus' },
    'cottonmouth': { id: 73740, slug: 'agkistrodon-piscivorus' },
    'cow parsnip': { id: 126272, slug: 'heracleum-maximum' },
    'coyote': { id: 41975, slug: 'canis-latrans' },
    'cricket': { id: 47978, slug: 'gryllidae' },
    'crocodile': { id: 26393, slug: 'crocodylus' },
    'culex mosquito': { id: 128671, slug: 'culex' },
    'deer flies': { id: 128513, slug: 'chrysops' },
    'deer fly': { id: 128513, slug: 'chrysops' },
    'deer tick': { id: 119775, slug: 'ixodes-scapularis' },
    'dust mite': { id: 128615, slug: 'dermatophagoides' },
    'earwig': { id: 47428, slug: 'dermaptera' },
    'eastern coral snake': { id: 73739, slug: 'micrurus-fulvius' },
    'eastern diamondback rattlesnake': { id: 73742, slug: 'crotalus-adamanteus' },
    'feral pig': { id: 42415, slug: 'sus-scrofa' },
    'fire ant': { id: 53877, slug: 'solenopsis-invicta' },
    'fire ants': { id: 53877, slug: 'solenopsis-invicta' },
    'fire coral': { id: 126264, slug: 'millepora' },
    'flea': { id: 47229, slug: 'siphonaptera' },
    'fleas': { id: 47229, slug: 'siphonaptera' },
    'german cockroach': { id: 128620, slug: 'blattella-germanica' },
    'giant hogweed': { id: 126270, slug: 'heracleum-mantegazzianum' },
    'gila monster': { id: 64993, slug: 'heloderma-suspectum' },
    'gnat': { id: 128559, slug: 'sciaridae' },
    'gnats': { id: 128559, slug: 'sciaridae' },
    'hobo spider': { id: 128610, slug: 'eratigena-agrestis' },
    'honey bee': { id: 47219, slug: 'apis-mellifera' },
    'hornet': { id: 52774, slug: 'vespa' },
    'hornets': { id: 52774, slug: 'vespa' },
    'horse flies': { id: 128514, slug: 'tabanus' },
    'horse fly': { id: 128514, slug: 'tabanus' },
    'house fly': { id: 128541, slug: 'musca-domestica' },
    'io moth caterpillar': { id: 207176, slug: 'automeris-io' },
    'japanese beetle': { id: 128625, slug: 'popillia-japonica' },
    'jellyfish': { id: 47534, slug: 'medusozoa' },
    'leech': { id: 47660, slug: 'hirudinea' },
    'leeches': { id: 47660, slug: 'hirudinea' },
    'lionfish': { id: 126265, slug: 'pterois' },
    'lone star tick': { id: 119778, slug: 'amblyomma-americanum' },
    'man o war': { id: 126263, slug: 'physalia-physalis' },
    'manchineel': { id: 126273, slug: 'hippomane-mancinella' },
    'millipede': { id: 47487, slug: 'diplopoda' },
    'millipedes': { id: 47487, slug: 'diplopoda' },
    'mite': { id: 47204, slug: 'acari' },
    'mites': { id: 47204, slug: 'acari' },
    'mosquito': { id: 47157, slug: 'culicidae' },
    'mosquitoes': { id: 47157, slug: 'culicidae' },
    'moth': { id: 47157, slug: 'lepidoptera' },
    'moths': { id: 47157, slug: 'lepidoptera' },
    'nettle': { id: 55826, slug: 'urtica' },
    'no-see-um': { id: 128556, slug: 'ceratopogonidae' },
    'no-see-ums': { id: 128556, slug: 'ceratopogonidae' },
    'paper wasp': { id: 52775, slug: 'polistes' },
    'poison ivy': { id: 53649, slug: 'toxicodendron-radicans' },
    'poison oak': { id: 53650, slug: 'toxicodendron-diversilobum' },
    'poison sumac': { id: 53651, slug: 'toxicodendron-vernix' },
    'portuguese man o war': { id: 126263, slug: 'physalia-physalis' },
    'prickly pear': { id: 48793, slug: 'opuntia' },
    'puss caterpillar': { id: 207174, slug: 'megalopyge-opercularis' },
    'raccoon': { id: 41660, slug: 'procyon-lotor' },
    'rattlesnake': { id: 85557, slug: 'crotalus' },
    'rattlesnakes': { id: 85557, slug: 'crotalus' },
    'saddleback caterpillar': { id: 207175, slug: 'acharia-stimulea' },
    'sand flea': { id: 128679, slug: 'tunga-penetrans' },
    'scabies mite': { id: 126957, slug: 'sarcoptes-scabiei' },
    'scorpion': { id: 47361, slug: 'scorpiones' },
    'scorpions': { id: 47361, slug: 'scorpiones' },
    'sea lice': { id: 126266, slug: 'linuche-unguiculata' },
    'sea urchin': { id: 48705, slug: 'echinoidea' },
    'sea urchins': { id: 48705, slug: 'echinoidea' },
    'silverfish': { id: 128650, slug: 'lepisma-saccharina' },
    'slug': { id: 47579, slug: 'arionidae' },
    'slugs': { id: 47579, slug: 'arionidae' },
    'snail': { id: 47579, slug: 'gastropoda' },
    'snails': { id: 47579, slug: 'gastropoda' },
    'snake': { id: 85553, slug: 'serpentes' },
    'snakes': { id: 85553, slug: 'serpentes' },
    'snapping turtle': { id: 39532, slug: 'chelydra-serpentina' },
    'spider': { id: 47118, slug: 'araneae' },
    'spiders': { id: 47118, slug: 'araneae' },
    'stable fly': { id: 128551, slug: 'stomoxys-calcitrans' },
    'stinging nettle': { id: 55826, slug: 'urtica-dioica' },
    'stingray': { id: 60466, slug: 'myliobatiformes' },
    'stingrays': { id: 60466, slug: 'myliobatiformes' },
    'stink bug': { id: 128630, slug: 'halyomorpha-halys' },
    'stink bugs': { id: 128630, slug: 'halyomorpha-halys' },
    'tarantula hawk': { id: 119806, slug: 'pepsis' },
    'tent caterpillar': { id: 128636, slug: 'malacosoma' },
    'termite': { id: 47822, slug: 'isoptera' },
    'termites': { id: 47822, slug: 'isoptera' },
    'tick': { id: 47190, slug: 'ixodida' },
    'ticks': { id: 47190, slug: 'ixodida' },
    'timber rattlesnake': { id: 73743, slug: 'crotalus-horridus' },
    'wasp': { id: 52747, slug: 'vespidae' },
    'wasps': { id: 52747, slug: 'vespidae' },
    'water moccasin': { id: 73740, slug: 'agkistrodon-piscivorus' },
    'western diamondback rattlesnake': { id: 73744, slug: 'crotalus-atrox' },
    'wild boar': { id: 42415, slug: 'sus-scrofa' },
    'wild parsnip': { id: 126271, slug: 'pastinaca-sativa' },
    'wolf spider': { id: 47831, slug: 'lycosidae' },
    'yellow jacket': { id: 52773, slug: 'vespula' },
    'yellow jackets': { id: 52773, slug: 'vespula' },
    'yellow sac spider': { id: 126285, slug: 'cheiracanthium' }
  };

  var DANGER_INDEX = {
    'aedes mosquito': { score: 8, label: 'Severe Danger', type: 'disease vector', duration: 'hours', medical: true },
    'alligator': { score: 9, label: 'Extreme Danger', type: 'bite/roll', duration: 'permanent', medical: true },
    'american alligator': { score: 9, label: 'Extreme Danger', type: 'bite/roll', duration: 'permanent', medical: true },
    'american dog tick': { score: 7, label: 'High Danger', type: 'disease vector', duration: 'hours', medical: true },
    'ant': { score: 2, label: 'Low', type: 'bite/sting', duration: 'minutes', medical: false },
    'ants': { score: 2, label: 'Low', type: 'bite/sting', duration: 'minutes', medical: false },
    'bald-faced hornet': { score: 5, label: 'Moderate', type: 'venom sting', duration: 'minutes', medical: true },
    'bed bug': { score: 2, label: 'Low', type: 'bite', duration: 'hours', medical: false },
    'bed bugs': { score: 2, label: 'Low', type: 'bite', duration: 'hours', medical: false },
    'bee': { score: 4, label: 'Moderate', type: 'venom sting', duration: 'minutes', medical: true },
    'biting midge': { score: 2, label: 'Low', type: 'bite', duration: 'hours', medical: false },
    'biting midges': { score: 2, label: 'Low', type: 'bite', duration: 'hours', medical: false },
    'black flies': { score: 4, label: 'Moderate', type: 'disease vector', duration: 'hours', medical: false },
    'black fly': { score: 4, label: 'Moderate', type: 'disease vector', duration: 'hours', medical: false },
    'black widow': { score: 8, label: 'Severe Danger', type: 'neurotoxin', duration: 'hours', medical: true },
    'black-legged tick': { score: 7, label: 'High Danger', type: 'disease vector', duration: 'hours', medical: true },
    'blacklegged tick': { score: 7, label: 'High Danger', type: 'disease vector', duration: 'hours', medical: true },
    'box jellyfish': { score: 10, label: 'Extreme Danger', type: 'cardiotoxin', duration: 'minutes', medical: true },
    'brown recluse': { score: 7, label: 'High Danger', type: 'necrotic venom', duration: 'weeks', medical: true },
    'bullet ant': { score: 5, label: 'Moderate', type: 'venom sting', duration: 'hours', medical: false },
    'bumble bee': { score: 3, label: 'Low-Moderate', type: 'venom sting', duration: 'minutes', medical: false },
    'cactus': { score: 2, label: 'Low', type: 'spine puncture', duration: 'hours', medical: false },
    'carpenter ant': { score: 1, label: 'Minimal', type: 'bite', duration: 'minutes', medical: false },
    'carpenter bee': { score: 2, label: 'Low', type: 'venom sting', duration: 'minutes', medical: false },
    'cat flea': { score: 3, label: 'Low-Moderate', type: 'bite', duration: 'hours', medical: false },
    'caterpillar': { score: 2, label: 'Low', type: 'irritant hairs', duration: 'hours', medical: false },
    'caterpillars': { score: 2, label: 'Low', type: 'irritant hairs', duration: 'hours', medical: false },
    'centipede': { score: 3, label: 'Low-Moderate', type: 'bite', duration: 'hours', medical: false },
    'centipedes': { score: 3, label: 'Low-Moderate', type: 'bite', duration: 'hours', medical: false },
    'chigger': { score: 2, label: 'Low', type: 'bite', duration: 'days', medical: false },
    'chiggers': { score: 2, label: 'Low', type: 'bite', duration: 'days', medical: false },
    'cicada killer': { score: 3, label: 'Low-Moderate', type: 'venom sting', duration: 'minutes', medical: false },
    'copperhead': { score: 5, label: 'Moderate', type: 'hemotoxin', duration: 'days', medical: true },
    'coral snake': { score: 9, label: 'Extreme Danger', type: 'neurotoxin', duration: 'hours', medical: true },
    'cottonmouth': { score: 7, label: 'High Danger', type: 'hemotoxin', duration: 'days', medical: true },
    'cow parsnip': { score: 4, label: 'Moderate', type: 'phototoxic sap', duration: 'days', medical: false },
    'coyote': { score: 5, label: 'Moderate', type: 'bite', duration: 'hours', medical: true },
    'crocodile': { score: 10, label: 'Extreme Danger', type: 'bite/roll', duration: 'permanent', medical: true },
    'deer flies': { score: 2, label: 'Low', type: 'bite', duration: 'minutes', medical: false },
    'deer fly': { score: 2, label: 'Low', type: 'bite', duration: 'minutes', medical: false },
    'deer tick': { score: 7, label: 'High Danger', type: 'disease vector', duration: 'hours', medical: true },
    'eastern coral snake': { score: 9, label: 'Extreme Danger', type: 'neurotoxin', duration: 'hours', medical: true },
    'eastern diamondback rattlesnake': { score: 9, label: 'Extreme Danger', type: 'hemotoxin', duration: 'days', medical: true },
    'feral pig': { score: 8, label: 'Severe Danger', type: 'tusk/bite', duration: 'permanent', medical: true },
    'fire ant': { score: 4, label: 'Moderate', type: 'venom sting', duration: 'minutes', medical: false },
    'fire ants': { score: 4, label: 'Moderate', type: 'venom sting', duration: 'minutes', medical: false },
    'fire coral': { score: 3, label: 'Low-Moderate', type: 'nematocyst', duration: 'hours', medical: false },
    'flea': { score: 4, label: 'Moderate', type: 'disease vector', duration: 'hours', medical: false },
    'fleas': { score: 4, label: 'Moderate', type: 'disease vector', duration: 'hours', medical: false },
    'giant hogweed': { score: 8, label: 'Severe Danger', type: 'phototoxic sap', duration: 'weeks', medical: true },
    'gila monster': { score: 7, label: 'High Danger', type: 'venom', duration: 'hours', medical: true },
    'gnat': { score: 1, label: 'Minimal', type: 'bite', duration: 'hours', medical: false },
    'gnats': { score: 1, label: 'Minimal', type: 'bite', duration: 'hours', medical: false },
    'hobo spider': { score: 3, label: 'Low-Moderate', type: 'bite', duration: 'hours', medical: false },
    'honey bee': { score: 4, label: 'Moderate', type: 'venom sting', duration: 'minutes', medical: true },
    'hornet': { score: 5, label: 'Moderate', type: 'venom sting', duration: 'minutes', medical: true },
    'hornets': { score: 5, label: 'Moderate', type: 'venom sting', duration: 'minutes', medical: true },
    'horse flies': { score: 2, label: 'Low', type: 'bite', duration: 'minutes', medical: false },
    'horse fly': { score: 2, label: 'Low', type: 'bite', duration: 'minutes', medical: false },
    'io moth caterpillar': { score: 3, label: 'Low-Moderate', type: 'venomous spine', duration: 'hours', medical: false },
    'jellyfish': { score: 4, label: 'Moderate', type: 'nematocyst sting', duration: 'hours', medical: false },
    'leech': { score: 1, label: 'Minimal', type: 'bite', duration: 'minutes', medical: false },
    'leeches': { score: 1, label: 'Minimal', type: 'bite', duration: 'minutes', medical: false },
    'lionfish': { score: 6, label: 'High Danger', type: 'spine venom', duration: 'hours', medical: true },
    'lone star tick': { score: 6, label: 'High Danger', type: 'disease vector', duration: 'hours', medical: true },
    'man o war': { score: 7, label: 'High Danger', type: 'venom sting', duration: 'hours', medical: true },
    'manchineel': { score: 9, label: 'Extreme Danger', type: 'multiple toxins', duration: 'days', medical: true },
    'millipede': { score: 1, label: 'Minimal', type: 'secretion', duration: 'hours', medical: false },
    'millipedes': { score: 1, label: 'Minimal', type: 'secretion', duration: 'hours', medical: false },
    'mite': { score: 2, label: 'Low', type: 'bite', duration: 'hours', medical: false },
    'mites': { score: 2, label: 'Low', type: 'bite', duration: 'hours', medical: false },
    'mosquito': { score: 7, label: 'High Danger', type: 'disease vector', duration: 'hours', medical: true },
    'mosquitoes': { score: 7, label: 'High Danger', type: 'disease vector', duration: 'hours', medical: true },
    'nettle': { score: 2, label: 'Low', type: 'formic acid', duration: 'hours', medical: false },
    'no-see-um': { score: 2, label: 'Low', type: 'bite', duration: 'hours', medical: false },
    'no-see-ums': { score: 2, label: 'Low', type: 'bite', duration: 'hours', medical: false },
    'paper wasp': { score: 4, label: 'Moderate', type: 'venom sting', duration: 'minutes', medical: true },
    'poison ivy': { score: 4, label: 'Moderate', type: 'urushiol contact', duration: 'weeks', medical: false },
    'poison oak': { score: 4, label: 'Moderate', type: 'urushiol contact', duration: 'weeks', medical: false },
    'poison sumac': { score: 5, label: 'Moderate', type: 'urushiol contact', duration: 'weeks', medical: true },
    'portuguese man o war': { score: 7, label: 'High Danger', type: 'venom sting', duration: 'hours', medical: true },
    'prickly pear': { score: 2, label: 'Low', type: 'spine/glochid', duration: 'hours', medical: false },
    'puss caterpillar': { score: 6, label: 'High Danger', type: 'venomous spine', duration: 'hours', medical: true },
    'raccoon': { score: 5, label: 'Moderate', type: 'bite/scratch', duration: 'hours', medical: true },
    'rattlesnake': { score: 8, label: 'Severe Danger', type: 'hemotoxin', duration: 'days', medical: true },
    'rattlesnakes': { score: 8, label: 'Severe Danger', type: 'hemotoxin', duration: 'days', medical: true },
    'saddleback caterpillar': { score: 4, label: 'Moderate', type: 'venomous spine', duration: 'hours', medical: false },
    'sand flea': { score: 2, label: 'Low', type: 'bite', duration: 'hours', medical: false },
    'sand fly': { score: 5, label: 'Moderate', type: 'disease vector', duration: 'hours', medical: true },
    'scabies mite': { score: 4, label: 'Moderate', type: 'infestation', duration: 'weeks', medical: true },
    'scorpion': { score: 7, label: 'High Danger', type: 'neurotoxin', duration: 'hours', medical: true },
    'scorpions': { score: 7, label: 'High Danger', type: 'neurotoxin', duration: 'hours', medical: true },
    'sea lice': { score: 2, label: 'Low', type: 'nematocyst', duration: 'days', medical: false },
    'sea urchin': { score: 3, label: 'Low-Moderate', type: 'puncture/venom', duration: 'days', medical: false },
    'sea urchins': { score: 3, label: 'Low-Moderate', type: 'puncture/venom', duration: 'days', medical: false },
    'slug': { score: 2, label: 'Low', type: 'indirect/mucus', duration: 'hours', medical: false },
    'slugs': { score: 2, label: 'Low', type: 'indirect/mucus', duration: 'hours', medical: false },
    'snake': { score: 5, label: 'Moderate', type: 'envenomation', duration: 'hours', medical: true },
    'snapping turtle': { score: 4, label: 'Moderate', type: 'bite', duration: 'minutes', medical: true },
    'spider': { score: 2, label: 'Low', type: 'bite', duration: 'hours', medical: false },
    'spiders': { score: 2, label: 'Low', type: 'bite', duration: 'hours', medical: false },
    'stable fly': { score: 2, label: 'Low', type: 'bite', duration: 'minutes', medical: false },
    'stinging nettle': { score: 2, label: 'Low', type: 'formic acid', duration: 'hours', medical: false },
    'stingray': { score: 6, label: 'High Danger', type: 'venom/laceration', duration: 'hours', medical: true },
    'stingrays': { score: 6, label: 'High Danger', type: 'venom/laceration', duration: 'hours', medical: true },
    'tarantula hawk': { score: 5, label: 'Moderate', type: 'venom sting', duration: 'minutes', medical: false },
    'tent caterpillar': { score: 1, label: 'Minimal', type: 'irritant hairs', duration: 'hours', medical: false },
    'tick': { score: 6, label: 'High Danger', type: 'disease vector', duration: 'hours', medical: true },
    'ticks': { score: 6, label: 'High Danger', type: 'disease vector', duration: 'hours', medical: true },
    'timber rattlesnake': { score: 8, label: 'Severe Danger', type: 'hemotoxin', duration: 'days', medical: true },
    'wasp': { score: 4, label: 'Moderate', type: 'venom sting', duration: 'minutes', medical: true },
    'wasps': { score: 4, label: 'Moderate', type: 'venom sting', duration: 'minutes', medical: true },
    'water moccasin': { score: 7, label: 'High Danger', type: 'hemotoxin', duration: 'days', medical: true },
    'western diamondback rattlesnake': { score: 8, label: 'Severe Danger', type: 'hemotoxin', duration: 'days', medical: true },
    'wild boar': { score: 8, label: 'Severe Danger', type: 'tusk/bite', duration: 'permanent', medical: true },
    'wild parsnip': { score: 6, label: 'High Danger', type: 'phototoxic sap', duration: 'weeks', medical: true },
    'wolf spider': { score: 2, label: 'Low', type: 'bite', duration: 'hours', medical: false },
    'yellow jacket': { score: 5, label: 'Moderate', type: 'venom sting', duration: 'minutes', medical: true },
    'yellow jackets': { score: 5, label: 'Moderate', type: 'venom sting', duration: 'minutes', medical: true },
    'yellow sac spider': { score: 3, label: 'Low-Moderate', type: 'bite', duration: 'hours', medical: false }
  };

  var PAIN_INDEX = {
    'alligator': { score: 9, label: 'Extreme' },
    'american alligator': { score: 9, label: 'Extreme' },
    'american dog tick': { score: 1, label: 'Minimal' },
    'ant': { score: 2, label: 'Mild' },
    'ants': { score: 2, label: 'Mild' },
    'bald-faced hornet': { score: 5, label: 'Moderate' },
    'bed bug': { score: 2, label: 'Mild' },
    'bed bugs': { score: 2, label: 'Mild' },
    'bee': { score: 4, label: 'Moderate' },
    'biting midge': { score: 2, label: 'Mild' },
    'biting midges': { score: 2, label: 'Mild' },
    'black flies': { score: 2, label: 'Mild' },
    'black fly': { score: 2, label: 'Mild' },
    'black widow': { score: 5, label: 'Moderate' },
    'black-legged tick': { score: 1, label: 'Minimal' },
    'box jellyfish': { score: 8, label: 'Severe' },
    'brown recluse': { score: 4, label: 'Moderate' },
    'bullet ant': { score: 10, label: 'Extreme' },
    'bumble bee': { score: 4, label: 'Moderate' },
    'cactus': { score: 2, label: 'Mild' },
    'carpenter ant': { score: 2, label: 'Mild' },
    'carpenter bee': { score: 3, label: 'Mild' },
    'caterpillar': { score: 2, label: 'Mild' },
    'caterpillars': { score: 2, label: 'Mild' },
    'centipede': { score: 5, label: 'Moderate' },
    'centipedes': { score: 5, label: 'Moderate' },
    'chigger': { score: 2, label: 'Mild' },
    'chiggers': { score: 2, label: 'Mild' },
    'cicada killer': { score: 4, label: 'Moderate' },
    'copperhead': { score: 5, label: 'Moderate' },
    'coral snake': { score: 3, label: 'Mild' },
    'cottonmouth': { score: 6, label: 'Intense' },
    'cow parsnip': { score: 4, label: 'Moderate' },
    'coyote': { score: 5, label: 'Moderate' },
    'crocodile': { score: 10, label: 'Extreme' },
    'deer flies': { score: 3, label: 'Mild' },
    'deer fly': { score: 3, label: 'Mild' },
    'deer tick': { score: 1, label: 'Minimal' },
    'eastern coral snake': { score: 3, label: 'Mild' },
    'eastern diamondback rattlesnake': { score: 7, label: 'Intense' },
    'feral pig': { score: 8, label: 'Severe' },
    'fire ant': { score: 3, label: 'Mild' },
    'fire ants': { score: 3, label: 'Mild' },
    'fire coral': { score: 3, label: 'Mild' },
    'flea': { score: 2, label: 'Mild' },
    'fleas': { score: 2, label: 'Mild' },
    'giant hogweed': { score: 7, label: 'Intense' },
    'gila monster': { score: 7, label: 'Intense' },
    'gnat': { score: 1, label: 'Minimal' },
    'gnats': { score: 1, label: 'Minimal' },
    'harvester ant': { score: 6, label: 'Intense' },
    'hobo spider': { score: 3, label: 'Mild' },
    'honey bee': { score: 4, label: 'Moderate' },
    'hornet': { score: 5, label: 'Moderate' },
    'hornets': { score: 5, label: 'Moderate' },
    'horse flies': { score: 4, label: 'Moderate' },
    'horse fly': { score: 4, label: 'Moderate' },
    'io moth caterpillar': { score: 5, label: 'Moderate' },
    'jellyfish': { score: 4, label: 'Moderate' },
    'leech': { score: 1, label: 'Minimal' },
    'leeches': { score: 1, label: 'Minimal' },
    'lionfish': { score: 7, label: 'Intense' },
    'lone star tick': { score: 1, label: 'Minimal' },
    'man o war': { score: 7, label: 'Intense' },
    'manchineel': { score: 8, label: 'Severe' },
    'millipede': { score: 1, label: 'Minimal' },
    'millipedes': { score: 1, label: 'Minimal' },
    'mite': { score: 1, label: 'Minimal' },
    'mites': { score: 1, label: 'Minimal' },
    'mosquito': { score: 1, label: 'Minimal' },
    'mosquitoes': { score: 1, label: 'Minimal' },
    'nettle': { score: 3, label: 'Mild' },
    'no-see-um': { score: 2, label: 'Mild' },
    'no-see-ums': { score: 2, label: 'Mild' },
    'paper wasp': { score: 5, label: 'Moderate' },
    'poison ivy': { score: 3, label: 'Mild' },
    'poison oak': { score: 3, label: 'Mild' },
    'poison sumac': { score: 4, label: 'Moderate' },
    'portuguese man o war': { score: 7, label: 'Intense' },
    'prickly pear': { score: 2, label: 'Mild' },
    'puss caterpillar': { score: 9, label: 'Extreme' },
    'raccoon': { score: 4, label: 'Moderate' },
    'rattlesnake': { score: 6, label: 'Intense' },
    'rattlesnakes': { score: 6, label: 'Intense' },
    'red paper wasp': { score: 6, label: 'Intense' },
    'saddleback caterpillar': { score: 6, label: 'Intense' },
    'sand flea': { score: 2, label: 'Mild' },
    'scabies mite': { score: 2, label: 'Mild' },
    'scorpion': { score: 6, label: 'Intense' },
    'scorpions': { score: 6, label: 'Intense' },
    'sea lice': { score: 2, label: 'Mild' },
    'sea urchin': { score: 3, label: 'Mild' },
    'sea urchins': { score: 3, label: 'Mild' },
    'slug': { score: 1, label: 'Minimal' },
    'slugs': { score: 1, label: 'Minimal' },
    'small bee': { score: 2, label: 'Mild' },
    'snake': { score: 5, label: 'Moderate' },
    'snapping turtle': { score: 6, label: 'Intense' },
    'spider': { score: 2, label: 'Mild' },
    'spiders': { score: 2, label: 'Mild' },
    'stable fly': { score: 3, label: 'Mild' },
    'stinging nettle': { score: 3, label: 'Mild' },
    'stingray': { score: 8, label: 'Severe' },
    'stingrays': { score: 8, label: 'Severe' },
    'sweat bee': { score: 2, label: 'Mild' },
    'tarantula hawk': { score: 9, label: 'Extreme' },
    'tent caterpillar': { score: 1, label: 'Minimal' },
    'tick': { score: 1, label: 'Minimal' },
    'ticks': { score: 1, label: 'Minimal' },
    'timber rattlesnake': { score: 6, label: 'Intense' },
    'velvet ant': { score: 7, label: 'Intense' },
    'warrior wasp': { score: 10, label: 'Extreme' },
    'wasp': { score: 4, label: 'Moderate' },
    'wasps': { score: 4, label: 'Moderate' },
    'water moccasin': { score: 6, label: 'Intense' },
    'western diamondback rattlesnake': { score: 6, label: 'Intense' },
    'wild boar': { score: 8, label: 'Severe' },
    'wild parsnip': { score: 5, label: 'Moderate' },
    'wolf spider': { score: 3, label: 'Mild' },
    'yellow jacket': { score: 5, label: 'Moderate' },
    'yellow jackets': { score: 5, label: 'Moderate' },
    'yellow sac spider': { score: 3, label: 'Mild' }
  };

  function lookup(index, name) {
    // Clean name: strip parentheticals like "(Culex species)" and lowercase
    var lower = name.toLowerCase().trim().replace(/\s*\([^)]*\)/g, '').trim();
    // Also strip descriptors like "common ", "american ", "eastern " for broader matching
    var stripped = lower.replace(/^(common|american|eastern|western|northern|southern|giant|little|large|small|great|asian|european|black|brown|red|yellow|green|white) /, '');

    if (index[lower]) return index[lower];
    if (index[stripped]) return index[stripped];

    var keys = Object.keys(index);
    // Exact substring match
    for (var i = 0; i < keys.length; i++) {
      if (lower.indexOf(keys[i]) !== -1 || keys[i].indexOf(lower) !== -1) return index[keys[i]];
    }
    // Try stripped name
    for (var i = 0; i < keys.length; i++) {
      if (stripped.indexOf(keys[i]) !== -1 || keys[i].indexOf(stripped) !== -1) return index[keys[i]];
    }
    // Try first word only (e.g. "mosquito" from "mosquito larvae")
    var firstWord = stripped.split(' ')[0];
    if (firstWord.length > 3 && index[firstWord]) return index[firstWord];
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] === firstWord) return index[keys[i]];
    }
    return null;
  }

  // FIX 5: Fetch with timeout via AbortController
  async function fetchWithTimeout(url, options, ms) {
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, ms);
    try {
      var r = await fetch(url, Object.assign({}, options, { signal: controller.signal }));
      clearTimeout(timer);
      return r;
    } catch(e) {
      clearTimeout(timer);
      throw e;
    }
  }

  async function getINatData(name) {
    try {
      var taxon = lookup(TAXON_MAP, name);
      if (taxon) {
        var resp = await fetchWithTimeout(
          'https://api.inaturalist.org/v1/taxa/' + taxon.id,
          { headers: { 'Accept': 'application/json' } },
          4000  // 4s timeout per request
        );
        var data = await resp.json();
        var t = data.results ? data.results[0] : data;
        if (t) {
          return {
            scientific_name: t.name || null,
            taxon_id: taxon.id,
            taxon_slug: taxon.slug,
            image_url: t.default_photo ? t.default_photo.medium_url : null,
            image_credit: t.default_photo ? (t.default_photo.attribution || 'iNaturalist') : null
          };
        }
        return { taxon_id: taxon.id, taxon_slug: taxon.slug, scientific_name: null, image_url: null, image_credit: null };
      } else {
        var resp2 = await fetchWithTimeout(
          'https://api.inaturalist.org/v1/taxa?q=' + encodeURIComponent(name) + '&per_page=1',
          { headers: { 'Accept': 'application/json' } },
          4000
        );
        var data2 = await resp2.json();
        if (data2.results && data2.results.length > 0) {
          var t2 = data2.results[0];
          return {
            scientific_name: t2.name || null,
            taxon_id: t2.id || null,
            taxon_slug: t2.slug || null,
            image_url: t2.default_photo ? t2.default_photo.medium_url : null,
            image_credit: t2.default_photo ? (t2.default_photo.attribution || 'iNaturalist') : null
          };
        }
      }
      return null;
    } catch(e) { return null; }
  }

  // FIX 2: Batch iNat calls in chunks of 5 to avoid rate limits
  async function batchInatLookups(items) {
    var results = [];
    var chunkSize = 5;
    for (var i = 0; i < items.length; i += chunkSize) {
      var chunk = items.slice(i, i + chunkSize);
      var chunkResults = await Promise.all(chunk.map(async function(item) {
        var inat = await getINatData(item.name);
        if (inat) {
          if (inat.image_url) { item.image_url = inat.image_url; item.image_credit = inat.image_credit; }
          if (inat.scientific_name) item.scientific_name = inat.scientific_name;
          if (inat.taxon_id) { item.taxon_id = inat.taxon_id; item.taxon_slug = inat.taxon_slug; }
        }
        // FIX 3: Explicitly set danger_score to null if not found, so UI can distinguish unscored
        var danger = lookup(DANGER_INDEX, item.name);
        if (danger) {
          item.danger_score = danger.score;
          item.danger_label = danger.label;
          item.danger_type = danger.type;
          item.danger_duration = danger.duration;
          item.danger_medical = danger.medical;
        } else {
          item.danger_score = null;
        }
        var pain = lookup(PAIN_INDEX, item.name);
        if (pain) {
          item.pain_score = pain.score;
          item.pain_label = pain.label;
        } else {
          item.pain_score = null;
        }
        return item;
      }));
      results = results.concat(chunkResults);
    }
    return results;
  }

  location = await resolveZip(location);

  var prompt = [
    'You are a comprehensive regional hazard expert. Your job is to produce an EXHAUSTIVE list of every natural hazard present at a location.',
    'Location: ' + location + '. Month: ' + month + '.',
    '',
    'RULES:',
    '- List EVERY hazard present at this location in ' + month + '. Do not filter or prioritize. Include everything.',
    '- DO NOT skip common hazards like mosquitoes, gnats, ticks, poison ivy just because they are obvious.',
    '- DO NOT limit the list. A thorough response will have 15-25 entries.',
    '- For each category below, include ALL species/types that are present in this region this month.',
    '',
    'CATEGORIES TO COVER (include all that apply):',
    'BITING INSECTS: mosquitoes, gnats, no-see-ums, biting midges, deer flies, horse flies, black flies, stable flies, sand flies, springtails',
    'STINGING INSECTS: wasps, yellow jackets, hornets, paper wasps, bald-faced hornets, honey bees, bumble bees, carpenter bees, fire ants, harvester ants, cicada killers, mud daubers',
    'TICKS: deer tick/black-legged tick, american dog tick, lone star tick, brown dog tick, gulf coast tick - include all with range in this area',
    'ARACHNIDS: black widow, brown recluse, wolf spider, hobo spider, yellow sac spider, scorpions, chiggers, mites, scabies',
    'VENOMOUS SNAKES: copperhead, cottonmouth, rattlesnakes (all species), coral snake - include all with range overlap',
    'REPTILES: alligators, snapping turtles, gila monster - where applicable',
    'STINGING/TOXIC PLANTS: poison ivy, poison oak, poison sumac, stinging nettle, wild parsnip, giant hogweed, cow parsnip, buffalo bur, hawthorn, manchineel, prickly plants',
    'STINGING CATERPILLARS: puss caterpillar, saddleback caterpillar, io moth caterpillar, hag moth caterpillar - where applicable',
    'MARINE HAZARDS: jellyfish, portuguese man o war, stingrays, sea urchins, fire coral, lionfish, sea lice - where applicable',
    'OTHER: centipedes, leeches, bed bugs, fleas, earwigs, millipedes, slugs, snapping turtles, feral pigs',
    '',
    'Return ONLY a raw JSON object, no markdown, no explanation.',
    '{',
    '  "location_display": "City, State",',
    '  "month": "' + month + '",',
    '  "activity_level": "High or Moderate or Low",',
    '  "alert": { "active": false, "title": "", "text": "" },',
    '  "pests": [',
    '    {',
    '      "name": "Common name",',
    '      "category": "Biting Insect or Stinging Insect or Tick or Arachnid or Venomous Snake or Reptile or Stinging Plant or Toxic Plant or Marine Hazard or Other Hazard",',
    '      "severity": "High or Medium or Low",',
    '      "description": "2-3 sentences specific to this location and month.",',
    '      "peak_timing": "When most active this month",',
    '      "prevention_tips": ["tip 1", "tip 2", "tip 3"]',
    '    }',
    '  ]',
    '}',
    '',
    'severity rules: High = genuine medical risk or very common encounter. Medium = moderate nuisance or occasional medical risk. Low = minor nuisance, rare encounter.',
    'Include ALL hazards present. 15-25 entries expected. ONLY output the JSON.'
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
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    var claudeData = await claudeResp.json();
    if (!claudeResp.ok) {
      return res.status(claudeResp.status).json({ error: claudeData.error || 'Claude API error' });
    }

    var text = claudeData.content.map(function(b) {
      return b.type === 'text' ? b.text : '';
    }).join('');

    var match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'No JSON in response' });

    var result;
    try { result = JSON.parse(match[0]); } catch(e) {
      return res.status(500).json({ error: 'JSON parse failed: ' + e.message });
    }

    var items = result.pests || result.hazards || [];
    result.pests = await batchInatLookups(items);
    delete result.hazards;

    return res.status(200).json(result);

  } catch(e) {
    return res.status(500).json({ error: e.message || 'Unknown error' });
  }
}
