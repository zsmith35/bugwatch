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
      var resp = await fetch('https://api.zippopotam.us/us/' + trimmed);
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
    'aphids': { id: 47803, slug: 'aphididae' },
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
    'clothes moth': { id: 128635, slug: 'tineola-bisselliella' },
    'cockroach': { id: 47822, slug: 'blattodea' },
    'cockroaches': { id: 47822, slug: 'blattodea' },
    'copperhead': { id: 73741, slug: 'agkistrodon-contortrix' },
    'coral snake': { id: 85563, slug: 'micrurus' },
    'cottonmouth': { id: 73740, slug: 'agkistrodon-piscivorus' },
    'cow parsnip': { id: 126272, slug: 'heracleum-maximum' },
    'coyote': { id: 41975, slug: 'canis-latrans' },
    'cricket': { id: 47978, slug: 'gryllidae' },
    'crickets': { id: 47978, slug: 'gryllidae' },
    'crocodile': { id: 26393, slug: 'crocodylus' },
    'culex mosquito': { id: 128671, slug: 'culex' },
    'deer flies': { id: 128513, slug: 'chrysops' },
    'deer fly': { id: 128513, slug: 'chrysops' },
    'deer tick': { id: 119775, slug: 'ixodes-scapularis' },
    'dust mite': { id: 128615, slug: 'dermatophagoides' },
    'earwig': { id: 47428, slug: 'dermaptera' },
    'earwigs': { id: 47428, slug: 'dermaptera' },
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
    'jellyfish sting': { id: 47534, slug: 'medusozoa' },
    'ladybug': { id: 128627, slug: 'coccinellidae' },
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
    'spurge': { id: 126275, slug: 'euphorbia' },
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

  var PAIN_INDEX = {
    'alligator': { score: 9, label: 'Extreme', type: 'bite', duration: 'permanent', medical: true },
    'american alligator': { score: 9, label: 'Extreme', type: 'bite', duration: 'permanent', medical: true },
    'american dog tick': { score: 2, label: 'Mild', type: 'bite', duration: 'hours', medical: true },
    'ant': { score: 2, label: 'Mild', type: 'sting', duration: 'minutes', medical: false },
    'ants': { score: 2, label: 'Mild', type: 'sting', duration: 'minutes', medical: false },
    'bald-faced hornet': { score: 5, label: 'Moderate', type: 'sting', duration: 'minutes', medical: false },
    'bed bug': { score: 2, label: 'Mild', type: 'bite', duration: 'hours', medical: false },
    'bed bugs': { score: 2, label: 'Mild', type: 'bite', duration: 'hours', medical: false },
    'bee': { score: 4, label: 'Moderate', type: 'sting', duration: 'minutes', medical: false },
    'biting midge': { score: 2, label: 'Mild', type: 'bite', duration: 'hours', medical: false },
    'biting midges': { score: 2, label: 'Mild', type: 'bite', duration: 'hours', medical: false },
    'black flies': { score: 2, label: 'Mild', type: 'bite', duration: 'hours', medical: false },
    'black fly': { score: 2, label: 'Mild', type: 'bite', duration: 'hours', medical: false },
    'black widow': { score: 8, label: 'Severe', type: 'venom', duration: 'hours', medical: true },
    'black-legged tick': { score: 2, label: 'Mild', type: 'bite', duration: 'hours', medical: true },
    'box jellyfish': { score: 10, label: 'Extreme', type: 'venom', duration: 'hours', medical: true },
    'brown recluse': { score: 7, label: 'Intense', type: 'venom', duration: 'weeks', medical: true },
    'bullet ant': { score: 10, label: 'Extreme', type: 'sting', duration: 'hours', medical: true },
    'bumble bee': { score: 4, label: 'Moderate', type: 'sting', duration: 'minutes', medical: false },
    'cactus': { score: 2, label: 'Mild', type: 'puncture', duration: 'hours', medical: false },
    'carpenter ant': { score: 2, label: 'Mild', type: 'bite', duration: 'minutes', medical: false },
    'carpenter bee': { score: 3, label: 'Mild', type: 'sting', duration: 'minutes', medical: false },
    'caterpillar': { score: 3, label: 'Mild', type: 'sting', duration: 'hours', medical: false },
    'caterpillars': { score: 3, label: 'Mild', type: 'sting', duration: 'hours', medical: false },
    'centipede': { score: 4, label: 'Moderate', type: 'bite', duration: 'hours', medical: false },
    'centipedes': { score: 4, label: 'Moderate', type: 'bite', duration: 'hours', medical: false },
    'chigger': { score: 2, label: 'Mild', type: 'bite', duration: 'days', medical: false },
    'chiggers': { score: 2, label: 'Mild', type: 'bite', duration: 'days', medical: false },
    'cicada killer': { score: 4, label: 'Moderate', type: 'sting', duration: 'minutes', medical: false },
    'copperhead': { score: 5, label: 'Moderate', type: 'venom', duration: 'days', medical: true },
    'coral snake': { score: 9, label: 'Extreme', type: 'venom', duration: 'hours', medical: true },
    'cottonmouth': { score: 7, label: 'Intense', type: 'venom', duration: 'days', medical: true },
    'cow parsnip': { score: 5, label: 'Moderate', type: 'contact', duration: 'days', medical: false },
    'crocodile': { score: 10, label: 'Extreme', type: 'bite', duration: 'permanent', medical: true },
    'deer flies': { score: 3, label: 'Mild', type: 'bite', duration: 'minutes', medical: false },
    'deer fly': { score: 3, label: 'Mild', type: 'bite', duration: 'minutes', medical: false },
    'deer tick': { score: 2, label: 'Mild', type: 'bite', duration: 'hours', medical: true },
    'eastern coral snake': { score: 9, label: 'Extreme', type: 'venom', duration: 'hours', medical: true },
    'eastern diamondback rattlesnake': { score: 9, label: 'Extreme', type: 'venom', duration: 'days', medical: true },
    'feral pig': { score: 8, label: 'Severe', type: 'bite', duration: 'permanent', medical: true },
    'fire ant': { score: 3, label: 'Mild', type: 'sting', duration: 'minutes', medical: false },
    'fire ants': { score: 3, label: 'Mild', type: 'sting', duration: 'minutes', medical: false },
    'fire coral': { score: 4, label: 'Moderate', type: 'contact', duration: 'hours', medical: false },
    'flea': { score: 2, label: 'Mild', type: 'bite', duration: 'hours', medical: false },
    'fleas': { score: 2, label: 'Mild', type: 'bite', duration: 'hours', medical: false },
    'giant hogweed': { score: 8, label: 'Severe', type: 'contact', duration: 'weeks', medical: true },
    'gila monster': { score: 7, label: 'Intense', type: 'venom', duration: 'hours', medical: true },
    'gnat': { score: 1, label: 'Minimal', type: 'bite', duration: 'hours', medical: false },
    'gnats': { score: 1, label: 'Minimal', type: 'bite', duration: 'hours', medical: false },
    'harvester ant': { score: 6, label: 'Intense', type: 'sting', duration: 'hours', medical: false },
    'hobo spider': { score: 4, label: 'Moderate', type: 'bite', duration: 'hours', medical: false },
    'honey bee': { score: 4, label: 'Moderate', type: 'sting', duration: 'minutes', medical: false },
    'hornet': { score: 5, label: 'Moderate', type: 'sting', duration: 'minutes', medical: false },
    'hornets': { score: 5, label: 'Moderate', type: 'sting', duration: 'minutes', medical: false },
    'horse flies': { score: 4, label: 'Moderate', type: 'bite', duration: 'minutes', medical: false },
    'horse fly': { score: 4, label: 'Moderate', type: 'bite', duration: 'minutes', medical: false },
    'io moth caterpillar': { score: 5, label: 'Moderate', type: 'sting', duration: 'hours', medical: false },
    'jellyfish': { score: 4, label: 'Moderate', type: 'sting', duration: 'hours', medical: false },
    'leech': { score: 1, label: 'Minimal', type: 'bite', duration: 'minutes', medical: false },
    'leeches': { score: 1, label: 'Minimal', type: 'bite', duration: 'minutes', medical: false },
    'lionfish': { score: 6, label: 'Intense', type: 'sting', duration: 'hours', medical: true },
    'lone star tick': { score: 2, label: 'Mild', type: 'bite', duration: 'hours', medical: true },
    'man o war': { score: 8, label: 'Severe', type: 'sting', duration: 'hours', medical: true },
    'manchineel': { score: 9, label: 'Extreme', type: 'contact', duration: 'days', medical: true },
    'mite': { score: 1, label: 'Minimal', type: 'bite', duration: 'hours', medical: false },
    'mites': { score: 1, label: 'Minimal', type: 'bite', duration: 'hours', medical: false },
    'mosquito': { score: 1, label: 'Minimal', type: 'bite', duration: 'hours', medical: false },
    'mosquitoes': { score: 1, label: 'Minimal', type: 'bite', duration: 'hours', medical: false },
    'nettle': { score: 3, label: 'Mild', type: 'contact', duration: 'hours', medical: false },
    'no-see-um': { score: 2, label: 'Mild', type: 'bite', duration: 'hours', medical: false },
    'no-see-ums': { score: 2, label: 'Mild', type: 'bite', duration: 'hours', medical: false },
    'paper wasp': { score: 5, label: 'Moderate', type: 'sting', duration: 'minutes', medical: false },
    'poison ivy': { score: 4, label: 'Moderate', type: 'contact', duration: 'weeks', medical: false },
    'poison oak': { score: 4, label: 'Moderate', type: 'contact', duration: 'weeks', medical: false },
    'poison sumac': { score: 5, label: 'Moderate', type: 'contact', duration: 'weeks', medical: true },
    'portuguese man o war': { score: 8, label: 'Severe', type: 'sting', duration: 'hours', medical: true },
    'prickly pear': { score: 2, label: 'Mild', type: 'puncture', duration: 'hours', medical: false },
    'puss caterpillar': { score: 8, label: 'Severe', type: 'sting', duration: 'hours', medical: true },
    'rattlesnake': { score: 8, label: 'Severe', type: 'venom', duration: 'days', medical: true },
    'rattlesnakes': { score: 8, label: 'Severe', type: 'venom', duration: 'days', medical: true },
    'red paper wasp': { score: 6, label: 'Intense', type: 'sting', duration: 'minutes', medical: false },
    'saddleback caterpillar': { score: 6, label: 'Intense', type: 'sting', duration: 'hours', medical: false },
    'sand flea': { score: 2, label: 'Mild', type: 'bite', duration: 'hours', medical: false },
    'scabies mite': { score: 3, label: 'Mild', type: 'bite', duration: 'weeks', medical: true },
    'scorpion': { score: 6, label: 'Intense', type: 'sting', duration: 'hours', medical: true },
    'scorpions': { score: 6, label: 'Intense', type: 'sting', duration: 'hours', medical: true },
    'sea lice': { score: 2, label: 'Mild', type: 'sting', duration: 'days', medical: false },
    'sea urchin': { score: 3, label: 'Mild', type: 'puncture', duration: 'days', medical: false },
    'sea urchins': { score: 3, label: 'Mild', type: 'puncture', duration: 'days', medical: false },
    'small bee': { score: 2, label: 'Mild', type: 'sting', duration: 'minutes', medical: false },
    'snake': { score: 5, label: 'Moderate', type: 'venom', duration: 'hours', medical: true },
    'snapping turtle': { score: 5, label: 'Moderate', type: 'bite', duration: 'minutes', medical: true },
    'spider': { score: 3, label: 'Mild', type: 'bite', duration: 'hours', medical: false },
    'spiders': { score: 3, label: 'Mild', type: 'bite', duration: 'hours', medical: false },
    'stable fly': { score: 3, label: 'Mild', type: 'bite', duration: 'minutes', medical: false },
    'stinging nettle': { score: 3, label: 'Mild', type: 'contact', duration: 'hours', medical: false },
    'stingray': { score: 6, label: 'Intense', type: 'sting', duration: 'hours', medical: true },
    'stingrays': { score: 6, label: 'Intense', type: 'sting', duration: 'hours', medical: true },
    'sweat bee': { score: 2, label: 'Mild', type: 'sting', duration: 'minutes', medical: false },
    'tarantula hawk': { score: 9, label: 'Extreme', type: 'sting', duration: 'minutes', medical: true },
    'tent caterpillar': { score: 2, label: 'Mild', type: 'contact', duration: 'hours', medical: false },
    'tick': { score: 1, label: 'Minimal', type: 'bite', duration: 'hours', medical: false },
    'ticks': { score: 1, label: 'Minimal', type: 'bite', duration: 'hours', medical: false },
    'timber rattlesnake': { score: 8, label: 'Severe', type: 'venom', duration: 'days', medical: true },
    'urban digger bee': { score: 2, label: 'Mild', type: 'sting', duration: 'minutes', medical: false },
    'velvet ant': { score: 7, label: 'Intense', type: 'sting', duration: 'hours', medical: false },
    'warrior wasp': { score: 10, label: 'Extreme', type: 'sting', duration: 'hours', medical: true },
    'wasp': { score: 4, label: 'Moderate', type: 'sting', duration: 'minutes', medical: false },
    'wasps': { score: 4, label: 'Moderate', type: 'sting', duration: 'minutes', medical: false },
    'water moccasin': { score: 7, label: 'Intense', type: 'venom', duration: 'days', medical: true },
    'western diamondback rattlesnake': { score: 8, label: 'Severe', type: 'venom', duration: 'days', medical: true },
    'wild boar': { score: 8, label: 'Severe', type: 'bite', duration: 'permanent', medical: true },
    'wild parsnip': { score: 6, label: 'Intense', type: 'contact', duration: 'weeks', medical: true },
    'wolf spider': { score: 3, label: 'Mild', type: 'bite', duration: 'hours', medical: false },
    'yellow jacket': { score: 5, label: 'Moderate', type: 'sting', duration: 'minutes', medical: false },
    'yellow jackets': { score: 5, label: 'Moderate', type: 'sting', duration: 'minutes', medical: false },
    'yellow sac spider': { score: 4, label: 'Moderate', type: 'bite', duration: 'hours', medical: false }
  };

  function getTaxon(name) {
    var lower = name.toLowerCase().trim();
    if (TAXON_MAP[lower]) return TAXON_MAP[lower];
    var keys = Object.keys(TAXON_MAP);
    for (var i = 0; i < keys.length; i++) {
      if (lower.indexOf(keys[i]) !== -1 || keys[i].indexOf(lower) !== -1) {
        return TAXON_MAP[keys[i]];
      }
    }
    return null;
  }

  function getPainRating(name) {
    var lower = name.toLowerCase().trim();
    if (PAIN_INDEX[lower]) return PAIN_INDEX[lower];
    var keys = Object.keys(PAIN_INDEX);
    for (var i = 0; i < keys.length; i++) {
      if (lower.indexOf(keys[i]) !== -1 || keys[i].indexOf(lower) !== -1) {
        return PAIN_INDEX[keys[i]];
      }
    }
    return null;
  }

  async function getINatData(name) {
    try {
      var taxon = getTaxon(name);
      if (taxon) {
        var resp = await fetch('https://api.inaturalist.org/v1/taxa/' + taxon.id, {
          headers: { 'Accept': 'application/json' }
        });
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
        var resp2 = await fetch('https://api.inaturalist.org/v1/taxa?q=' + encodeURIComponent(name) + '&per_page=1', {
          headers: { 'Accept': 'application/json' }
        });
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

  location = await resolveZip(location);

  var prompt = [
    'You are an expert in regional wildlife hazards, entomology, herpetology, and botany.',
    'Location: ' + location + '. Month: ' + month + '.',
    '',
    'List ALL types of natural hazards a visitor should watch out for at this location during ' + month + '.',
    'This includes: biting and stinging insects, ticks, arachnids, venomous snakes, dangerous reptiles,',
    'stinging or toxic plants, marine hazards (jellyfish, stingrays, sea lice), slugs, snails,',
    'stinging caterpillars, leeches, and any other relevant wildlife hazards specific to this region.',
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
    '      "description": "2-3 sentences about this hazard at this location this month.",',
    '      "peak_timing": "When most active or prevalent",',
    '      "prevention_tips": ["tip 1", "tip 2", "tip 3"]',
    '    }',
    '  ]',
    '}',
    '',
    'Include 5-10 hazards most relevant to ' + location + ' in ' + month + '.',
    'Prioritize hazards that are surprising or lesser-known.',
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
    result.pests = await Promise.all(items.map(async function(item) {
      var inat = await getINatData(item.name);
      if (inat) {
        if (inat.image_url) { item.image_url = inat.image_url; item.image_credit = inat.image_credit; }
        if (inat.scientific_name) { item.scientific_name = inat.scientific_name; }
        if (inat.taxon_id) { item.taxon_id = inat.taxon_id; item.taxon_slug = inat.taxon_slug; }
      }
      var pain = getPainRating(item.name);
      if (pain) {
        item.pain_score = pain.score;
        item.pain_label = pain.label;
        item.pain_type = pain.type;
        item.pain_duration = pain.duration;
        item.pain_medical = pain.medical;
      }
      return item;
    }));
    delete result.hazards;

    return res.status(200).json(result);

  } catch(e) {
    return res.status(500).json({ error: e.message || 'Unknown error' });
  }
}
