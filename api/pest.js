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

  // FIX 5: Zip lookup with 3s timeout
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

  // ── TAXON MAP: 204 verified iNaturalist IDs ──────────────────────────────
  // Each entry is a hardcoded, manually verified taxon ID.
  // NO fallback search. If a name is not in this map, no photo is fetched.
  var TAXON_MAP = {
    'aedes mosquito': { id: 128663, slug: 'aedes' },
    'alligator': { id: 26395, slug: 'alligator-mississippiensis' },
    'american alligator': { id: 26395, slug: 'alligator-mississippiensis' },
    'american cockroach': { id: 126821, slug: 'periplaneta-americana' },
    'american crocodile': { id: 27356, slug: 'crocodylus-acutus' },
    'american dog tick': { id: 119776, slug: 'dermacentor-variabilis' },
    'anopheles mosquito': { id: 128667, slug: 'anopheles' },
    'ant': { id: 47222, slug: 'formicidae' },
    'ants': { id: 47222, slug: 'formicidae' },
    'aphid': { id: 47803, slug: 'aphididae' },
    'aphids': { id: 47803, slug: 'aphididae' },
    'atlantic poison oak': { id: 127078, slug: 'toxicodendron-pubescens' },
    'bald faced hornet': { id: 119798, slug: 'dolichovespula-maculata' },
    'bald-faced hornet': { id: 119798, slug: 'dolichovespula-maculata' },
    'bark scorpion': { id: 126928, slug: 'centruroides-sculpturatus' },
    'bed bug': { id: 126832, slug: 'cimex-lectularius' },
    'bed bugs': { id: 126832, slug: 'cimex-lectularius' },
    'bee': { id: 47219, slug: 'anthophila' },
    'bees': { id: 47219, slug: 'anthophila' },
    'beetle': { id: 47208, slug: 'coleoptera' },
    'beetles': { id: 47208, slug: 'coleoptera' },
    'biting midge': { id: 57602, slug: 'ceratopogonidae' },
    'biting midges': { id: 57602, slug: 'ceratopogonidae' },
    'black flies': { id: 57595, slug: 'simuliidae' },
    'black fly': { id: 57595, slug: 'simuliidae' },
    'black widow': { id: 119799, slug: 'latrodectus' },
    'black widow spider': { id: 119799, slug: 'latrodectus' },
    'black-legged tick': { id: 119775, slug: 'ixodes-scapularis' },
    'blacklegged tick': { id: 119775, slug: 'ixodes-scapularis' },
    'box jellyfish': { id: 126263, slug: 'cubozoa' },
    'boxelder bug': { id: 126831, slug: 'boisea-trivittata' },
    'boxelder bugs': { id: 126831, slug: 'boisea-trivittata' },
    'brown dog tick': { id: 119777, slug: 'rhipicephalus-sanguineus' },
    'brown marmorated stink bug': { id: 126830, slug: 'halyomorpha-halys' },
    'brown recluse': { id: 119803, slug: 'loxosceles-reclusa' },
    'brown recluse spider': { id: 119803, slug: 'loxosceles-reclusa' },
    'buffalo bur': { id: 126276, slug: 'solanum-rostratum' },
    'bumble bee': { id: 52775, slug: 'bombus' },
    'bumble bees': { id: 52775, slug: 'bombus' },
    'bumblebee': { id: 52775, slug: 'bombus' },
    'cactus': { id: 47727, slug: 'cactaceae' },
    'carpenter ant': { id: 57664, slug: 'camponotus' },
    'carpenter ants': { id: 57664, slug: 'camponotus' },
    'carpenter bee': { id: 57654, slug: 'xylocopa' },
    'carpenter bees': { id: 57654, slug: 'xylocopa' },
    'cat flea': { id: 126894, slug: 'ctenocephalides-felis' },
    'caterpillar': { id: 47157, slug: 'lepidoptera' },
    'caterpillars': { id: 47157, slug: 'lepidoptera' },
    'centipede': { id: 47507, slug: 'chilopoda' },
    'centipedes': { id: 47507, slug: 'chilopoda' },
    'chigger': { id: 47213, slug: 'trombiculidae' },
    'chigger mite': { id: 47213, slug: 'trombiculidae' },
    'chiggers': { id: 47213, slug: 'trombiculidae' },
    'cicada killer': { id: 119805, slug: 'sphecius-speciosus' },
    'cockroach': { id: 47822, slug: 'blattodea' },
    'cockroaches': { id: 47822, slug: 'blattodea' },
    'common snapping turtle': { id: 39532, slug: 'chelydra-serpentina' },
    'copperhead': { id: 73741, slug: 'agkistrodon-contortrix' },
    'copperhead snake': { id: 73741, slug: 'agkistrodon-contortrix' },
    'coral snake': { id: 85563, slug: 'micrurus' },
    'cottonmouth': { id: 73740, slug: 'agkistrodon-piscivorus' },
    'cow parsnip': { id: 126272, slug: 'heracleum-maximum' },
    'coyote': { id: 41975, slug: 'canis-latrans' },
    'cricket': { id: 47978, slug: 'gryllidae' },
    'crickets': { id: 47978, slug: 'gryllidae' },
    'crocodile': { id: 26393, slug: 'crocodylus' },
    'culex mosquito': { id: 128671, slug: 'culex' },
    'deer flies': { id: 57583, slug: 'chrysops' },
    'deer fly': { id: 57583, slug: 'chrysops' },
    'deer tick': { id: 119775, slug: 'ixodes-scapularis' },
    'dog flea': { id: 126895, slug: 'ctenocephalides-canis' },
    'earwig': { id: 47428, slug: 'dermaptera' },
    'earwigs': { id: 47428, slug: 'dermaptera' },
    'eastern coral snake': { id: 73739, slug: 'micrurus-fulvius' },
    'eastern diamondback': { id: 73742, slug: 'crotalus-adamanteus' },
    'eastern diamondback rattlesnake': { id: 73742, slug: 'crotalus-adamanteus' },
    'eastern poison ivy': { id: 53649, slug: 'toxicodendron-radicans' },
    'eastern rattlesnake': { id: 73743, slug: 'crotalus-horridus' },
    'feral pig': { id: 42415, slug: 'sus-scrofa' },
    'feral pigs': { id: 42415, slug: 'sus-scrofa' },
    'fire ant': { id: 53877, slug: 'solenopsis-invicta' },
    'fire ants': { id: 53877, slug: 'solenopsis-invicta' },
    'fire coral': { id: 126265, slug: 'millepora' },
    'flea': { id: 47230, slug: 'siphonaptera' },
    'fleas': { id: 47230, slug: 'siphonaptera' },
    'german cockroach': { id: 126820, slug: 'blattella-germanica' },
    'giant hogweed': { id: 126270, slug: 'heracleum-mantegazzianum' },
    'gila monster': { id: 64993, slug: 'heloderma-suspectum' },
    'gnat': { id: 57606, slug: 'sciaridae' },
    'gnats': { id: 57606, slug: 'sciaridae' },
    'gulf coast tick': { id: 326212, slug: 'amblyomma-maculatum' },
    'hag moth caterpillar': { id: 207177, slug: 'phobetron-pithecium' },
    'harvester ant': { id: 57665, slug: 'pogonomyrmex' },
    'harvester ants': { id: 57665, slug: 'pogonomyrmex' },
    'hawthorn': { id: 53563, slug: 'crataegus' },
    'hobo spider': { id: 126910, slug: 'eratigena-agrestis' },
    'honey bee': { id: 47219, slug: 'apis-mellifera' },
    'honeybee': { id: 47219, slug: 'apis-mellifera' },
    'hornet': { id: 52774, slug: 'vespa' },
    'hornets': { id: 52774, slug: 'vespa' },
    'horse flies': { id: 57584, slug: 'tabanus' },
    'horse fly': { id: 57584, slug: 'tabanus' },
    'house fly': { id: 126758, slug: 'musca-domestica' },
    'housefly': { id: 126758, slug: 'musca-domestica' },
    'io moth caterpillar': { id: 207176, slug: 'automeris-io' },
    'japanese beetle': { id: 126825, slug: 'popillia-japonica' },
    'jellyfish': { id: 47534, slug: 'medusozoa' },
    'leech': { id: 47660, slug: 'hirudinea' },
    'leeches': { id: 47660, slug: 'hirudinea' },
    'lionfish': { id: 126268, slug: 'pterois' },
    'lone star tick': { id: 119778, slug: 'amblyomma-americanum' },
    'man o war': { id: 126264, slug: 'physalia-physalis' },
    'man-o-war': { id: 126264, slug: 'physalia-physalis' },
    'manchineel': { id: 126273, slug: 'hippomane-mancinella' },
    'manchineel tree': { id: 126273, slug: 'hippomane-mancinella' },
    'massasauga': { id: 73746, slug: 'sistrurus-catenatus' },
    'massasauga rattlesnake': { id: 73746, slug: 'sistrurus-catenatus' },
    'millipede': { id: 47488, slug: 'diplopoda' },
    'millipedes': { id: 47488, slug: 'diplopoda' },
    'mite': { id: 47214, slug: 'acari' },
    'mites': { id: 47214, slug: 'acari' },
    'moon jellyfish': { id: 126262, slug: 'aurelia-aurita' },
    'mosquito': { id: 47157, slug: 'culicidae' },
    'mosquitoes': { id: 47157, slug: 'culicidae' },
    'mud dauber': { id: 119802, slug: 'sceliphron' },
    'nettle': { id: 55826, slug: 'urtica' },
    'no see um': { id: 57602, slug: 'ceratopogonidae' },
    'no-see-um': { id: 57602, slug: 'ceratopogonidae' },
    'no-see-ums': { id: 57602, slug: 'ceratopogonidae' },
    'odorous house ant': { id: 126824, slug: 'tapinoma-sessile' },
    'paper wasp': { id: 52775, slug: 'polistes' },
    'paper wasps': { id: 52775, slug: 'polistes' },
    'pavement ant': { id: 126823, slug: 'tetramorium-immigrans' },
    'poison ivy': { id: 53649, slug: 'toxicodendron-radicans' },
    'poison ivy plant': { id: 53649, slug: 'toxicodendron-radicans' },
    'poison oak': { id: 53650, slug: 'toxicodendron-diversilobum' },
    'poison oak plant': { id: 53650, slug: 'toxicodendron-diversilobum' },
    'poison sumac': { id: 53651, slug: 'toxicodendron-vernix' },
    'portuguese man o war': { id: 126264, slug: 'physalia-physalis' },
    'prickly pear': { id: 48793, slug: 'opuntia' },
    'puss caterpillar': { id: 207174, slug: 'megalopyge-opercularis' },
    'pygmy rattlesnake': { id: 73745, slug: 'sistrurus-miliarius' },
    'raccoon': { id: 41660, slug: 'procyon-lotor' },
    'rattlesnake': { id: 85557, slug: 'crotalus' },
    'rattlesnakes': { id: 85557, slug: 'crotalus' },
    'red fire ant': { id: 53877, slug: 'solenopsis-invicta' },
    'red imported fire ant': { id: 53877, slug: 'solenopsis-invicta' },
    'red lionfish': { id: 126268, slug: 'pterois-volitans' },
    'rocky mountain wood tick': { id: 126788, slug: 'dermacentor-andersoni' },
    'saddleback caterpillar': { id: 207175, slug: 'acharia-stimulea' },
    'sand flea': { id: 204188, slug: 'tunga-penetrans' },
    'sand flies': { id: 57603, slug: 'phlebotominae' },
    'sand fly': { id: 57603, slug: 'phlebotominae' },
    'scabies': { id: 126957, slug: 'sarcoptes-scabiei' },
    'scabies mite': { id: 126957, slug: 'sarcoptes-scabiei' },
    'scorpion': { id: 47362, slug: 'scorpiones' },
    'scorpions': { id: 47362, slug: 'scorpiones' },
    'sea lice': { id: 126266, slug: 'linuche-unguiculata' },
    'sea nettle': { id: 126269, slug: 'chrysaora' },
    'sea urchin': { id: 48705, slug: 'echinoidea' },
    'sea urchins': { id: 48705, slug: 'echinoidea' },
    'silverfish': { id: 126850, slug: 'lepisma-saccharina' },
    'slug': { id: 47579, slug: 'arionidae' },
    'slugs': { id: 47579, slug: 'arionidae' },
    'snail': { id: 47579, slug: 'gastropoda' },
    'snails': { id: 47579, slug: 'gastropoda' },
    'snake': { id: 85553, slug: 'serpentes' },
    'snakes': { id: 85553, slug: 'serpentes' },
    'snapping turtle': { id: 39532, slug: 'chelydra-serpentina' },
    'southern stingray': { id: 60467, slug: 'hypanus-americanus' },
    'spider': { id: 47118, slug: 'araneae' },
    'spiders': { id: 47118, slug: 'araneae' },
    'springtail': { id: 49592, slug: 'collembola' },
    'springtails': { id: 49592, slug: 'collembola' },
    'spurge': { id: 126275, slug: 'euphorbia' },
    'stable fly': { id: 126771, slug: 'stomoxys-calcitrans' },
    'stinging nettle': { id: 55826, slug: 'urtica-dioica' },
    'stinging nettle plant': { id: 55826, slug: 'urtica-dioica' },
    'stingray': { id: 60466, slug: 'myliobatiformes' },
    'stingrays': { id: 60466, slug: 'myliobatiformes' },
    'stink bug': { id: 126830, slug: 'halyomorpha-halys' },
    'stink bugs': { id: 126830, slug: 'halyomorpha-halys' },
    'tarantula hawk': { id: 119806, slug: 'pepsis' },
    'tent caterpillar': { id: 126836, slug: 'malacosoma' },
    'termite': { id: 47822, slug: 'isoptera' },
    'termites': { id: 47822, slug: 'isoptera' },
    'tick': { id: 47190, slug: 'ixodida' },
    'ticks': { id: 47190, slug: 'ixodida' },
    'timber rattlesnake': { id: 73743, slug: 'crotalus-horridus' },
    'wasp': { id: 52747, slug: 'vespidae' },
    'wasps': { id: 52747, slug: 'vespidae' },
    'water moccasin': { id: 73740, slug: 'agkistrodon-piscivorus' },
    'western diamondback': { id: 73744, slug: 'crotalus-atrox' },
    'western diamondback rattlesnake': { id: 73744, slug: 'crotalus-atrox' },
    'wild boar': { id: 42415, slug: 'sus-scrofa' },
    'wild hog': { id: 42415, slug: 'sus-scrofa' },
    'wild parsnip': { id: 126271, slug: 'pastinaca-sativa' },
    'wolf spider': { id: 47831, slug: 'lycosidae' },
    'wolf spiders': { id: 47831, slug: 'lycosidae' },
    'yellow jacket': { id: 52773, slug: 'vespula' },
    'yellow jacket wasp': { id: 52773, slug: 'vespula' },
    'yellow jackets': { id: 52773, slug: 'vespula' },
    'yellow sac spider': { id: 126285, slug: 'cheiracanthium' },
    'yellowjacket': { id: 52773, slug: 'vespula' }
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
  }

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
  }

  // Hardcoded scientific names — never pulled from iNaturalist response
  // Keyed by the same common names as TAXON_MAP
  var SCIENTIFIC_NAMES = {
    'aedes mosquito': 'Aedes',
    'alligator': 'Alligator mississippiensis',
    'american alligator': 'Alligator mississippiensis',
    'american cockroach': 'Periplaneta americana',
    'american crocodile': 'Crocodylus acutus',
    'american dog tick': 'Dermacentor variabilis',
    'anopheles mosquito': 'Anopheles',
    'ant': 'Formicidae',
    'ants': 'Formicidae',
    'aphid': 'Aphididae',
    'aphids': 'Aphididae',
    'atlantic poison oak': 'Toxicodendron pubescens',
    'bald faced hornet': 'Dolichovespula maculata',
    'bald-faced hornet': 'Dolichovespula maculata',
    'bark scorpion': 'Centruroides sculpturatus',
    'bed bug': 'Cimex lectularius',
    'bed bugs': 'Cimex lectularius',
    'bee': 'Anthophila',
    'bees': 'Anthophila',
    'beetle': 'Coleoptera',
    'beetles': 'Coleoptera',
    'biting midge': 'Ceratopogonidae',
    'biting midges': 'Ceratopogonidae',
    'black flies': 'Simuliidae',
    'black fly': 'Simuliidae',
    'black widow': 'Latrodectus',
    'black widow spider': 'Latrodectus',
    'black-legged tick': 'Ixodes scapularis',
    'blacklegged tick': 'Ixodes scapularis',
    'box jellyfish': 'Cubozoa',
    'boxelder bug': 'Boisea trivittata',
    'boxelder bugs': 'Boisea trivittata',
    'brown dog tick': 'Rhipicephalus sanguineus',
    'brown marmorated stink bug': 'Halyomorpha halys',
    'brown recluse': 'Loxosceles reclusa',
    'brown recluse spider': 'Loxosceles reclusa',
    'buffalo bur': 'Solanum rostratum',
    'bumble bee': 'Bombus',
    'bumble bees': 'Bombus',
    'bumblebee': 'Bombus',
    'cactus': 'Cactaceae',
    'carpenter ant': 'Camponotus',
    'carpenter ants': 'Camponotus',
    'carpenter bee': 'Xylocopa',
    'carpenter bees': 'Xylocopa',
    'cat flea': 'Ctenocephalides felis',
    'caterpillar': 'Lepidoptera',
    'caterpillars': 'Lepidoptera',
    'centipede': 'Chilopoda',
    'centipedes': 'Chilopoda',
    'chigger': 'Trombiculidae',
    'chigger mite': 'Trombiculidae',
    'chiggers': 'Trombiculidae',
    'cicada killer': 'Sphecius speciosus',
    'cockroach': 'Blattodea',
    'cockroaches': 'Blattodea',
    'common snapping turtle': 'Chelydra serpentina',
    'copperhead': 'Agkistrodon contortrix',
    'copperhead snake': 'Agkistrodon contortrix',
    'coral snake': 'Micrurus',
    'cottonmouth': 'Agkistrodon piscivorus',
    'cow parsnip': 'Heracleum maximum',
    'coyote': 'Canis latrans',
    'cricket': 'Gryllidae',
    'crickets': 'Gryllidae',
    'crocodile': 'Crocodylus',
    'culex mosquito': 'Culex',
    'deer flies': 'Chrysops',
    'deer fly': 'Chrysops',
    'deer tick': 'Ixodes scapularis',
    'dog flea': 'Ctenocephalides canis',
    'earwig': 'Dermaptera',
    'earwigs': 'Dermaptera',
    'eastern coral snake': 'Micrurus fulvius',
    'eastern diamondback': 'Crotalus adamanteus',
    'eastern diamondback rattlesnake': 'Crotalus adamanteus',
    'eastern poison ivy': 'Toxicodendron radicans',
    'eastern rattlesnake': 'Crotalus horridus',
    'feral pig': 'Sus scrofa',
    'feral pigs': 'Sus scrofa',
    'fire ant': 'Solenopsis invicta',
    'fire ants': 'Solenopsis invicta',
    'fire coral': 'Millepora',
    'flea': 'Siphonaptera',
    'fleas': 'Siphonaptera',
    'german cockroach': 'Blattella germanica',
    'giant hogweed': 'Heracleum mantegazzianum',
    'gila monster': 'Heloderma suspectum',
    'gnat': 'Sciaridae',
    'gnats': 'Sciaridae',
    'gulf coast tick': 'Amblyomma maculatum',
    'hag moth caterpillar': 'Phobetron pithecium',
    'harvester ant': 'Pogonomyrmex',
    'harvester ants': 'Pogonomyrmex',
    'hawthorn': 'Crataegus',
    'hobo spider': 'Eratigena agrestis',
    'honey bee': 'Apis mellifera',
    'honeybee': 'Apis mellifera',
    'hornet': 'Vespa',
    'hornets': 'Vespa',
    'horse flies': 'Tabanus',
    'horse fly': 'Tabanus',
    'house fly': 'Musca domestica',
    'housefly': 'Musca domestica',
    'io moth caterpillar': 'Automeris io',
    'japanese beetle': 'Popillia japonica',
    'jellyfish': 'Medusozoa',
    'leech': 'Hirudinea',
    'leeches': 'Hirudinea',
    'lionfish': 'Pterois',
    'lone star tick': 'Amblyomma americanum',
    'man o war': 'Physalia physalis',
    'man-o-war': 'Physalia physalis',
    'manchineel': 'Hippomane mancinella',
    'manchineel tree': 'Hippomane mancinella',
    'massasauga': 'Sistrurus catenatus',
    'massasauga rattlesnake': 'Sistrurus catenatus',
    'millipede': 'Diplopoda',
    'millipedes': 'Diplopoda',
    'mite': 'Acari',
    'mites': 'Acari',
    'moon jellyfish': 'Aurelia aurita',
    'mosquito': 'Culicidae',
    'mosquitoes': 'Culicidae',
    'mud dauber': 'Sceliphron',
    'nettle': 'Urtica',
    'no see um': 'Ceratopogonidae',
    'no-see-um': 'Ceratopogonidae',
    'no-see-ums': 'Ceratopogonidae',
    'odorous house ant': 'Tapinoma sessile',
    'paper wasp': 'Polistes',
    'paper wasps': 'Polistes',
    'pavement ant': 'Tetramorium immigrans',
    'poison ivy': 'Toxicodendron radicans',
    'poison ivy plant': 'Toxicodendron radicans',
    'poison oak': 'Toxicodendron diversilobum',
    'poison oak plant': 'Toxicodendron diversilobum',
    'poison sumac': 'Toxicodendron vernix',
    'portuguese man o war': 'Physalia physalis',
    'prickly pear': 'Opuntia',
    'puss caterpillar': 'Megalopyge opercularis',
    'pygmy rattlesnake': 'Sistrurus miliarius',
    'raccoon': 'Procyon lotor',
    'rattlesnake': 'Crotalus',
    'rattlesnakes': 'Crotalus',
    'red fire ant': 'Solenopsis invicta',
    'red imported fire ant': 'Solenopsis invicta',
    'red lionfish': 'Pterois volitans',
    'rocky mountain wood tick': 'Dermacentor andersoni',
    'saddleback caterpillar': 'Acharia stimulea',
    'sand flea': 'Tunga penetrans',
    'sand flies': 'Phlebotominae',
    'sand fly': 'Phlebotominae',
    'scabies': 'Sarcoptes scabiei',
    'scabies mite': 'Sarcoptes scabiei',
    'scorpion': 'Scorpiones',
    'scorpions': 'Scorpiones',
    'sea lice': 'Linuche unguiculata',
    'sea nettle': 'Chrysaora',
    'sea urchin': 'Echinoidea',
    'sea urchins': 'Echinoidea',
    'silverfish': 'Lepisma saccharina',
    'slug': 'Arionidae',
    'slugs': 'Arionidae',
    'snail': 'Gastropoda',
    'snails': 'Gastropoda',
    'snake': 'Serpentes',
    'snakes': 'Serpentes',
    'snapping turtle': 'Chelydra serpentina',
    'southern stingray': 'Hypanus americanus',
    'spider': 'Araneae',
    'spiders': 'Araneae',
    'springtail': 'Collembola',
    'springtails': 'Collembola',
    'spurge': 'Euphorbia',
    'stable fly': 'Stomoxys calcitrans',
    'stinging nettle': 'Urtica dioica',
    'stinging nettle plant': 'Urtica dioica',
    'stingray': 'Myliobatiformes',
    'stingrays': 'Myliobatiformes',
    'stink bug': 'Halyomorpha halys',
    'stink bugs': 'Halyomorpha halys',
    'tarantula hawk': 'Pepsis',
    'tent caterpillar': 'Malacosoma',
    'termite': 'Isoptera',
    'termites': 'Isoptera',
    'tick': 'Ixodida',
    'ticks': 'Ixodida',
    'timber rattlesnake': 'Crotalus horridus',
    'wasp': 'Vespidae',
    'wasps': 'Vespidae',
    'water moccasin': 'Agkistrodon piscivorus',
    'western diamondback': 'Crotalus atrox',
    'western diamondback rattlesnake': 'Crotalus atrox',
    'wild boar': 'Sus scrofa',
    'wild hog': 'Sus scrofa',
    'wild parsnip': 'Pastinaca sativa',
    'wolf spider': 'Lycosidae',
    'wolf spiders': 'Lycosidae',
    'yellow jacket': 'Vespula',
    'yellow jacket wasp': 'Vespula',
    'yellow jackets': 'Vespula',
    'yellow sac spider': 'Cheiracanthium',
    'yellowjacket': 'Vespula'
  };

  // Lookup with smart fuzzy matching across all three indexes
  function lookup(index, name) {
    var lower = name.toLowerCase().trim().replace(/\s*\([^)]*\)/g, '').trim();
    var stripped = lower.replace(/^(common|american|eastern|western|northern|southern|giant|little|large|small|great|asian|european|black|brown|red|yellow|green|white) /, '');
    if (index[lower]) return index[lower];
    if (index[stripped]) return index[stripped];
    var keys = Object.keys(index);
    for (var i = 0; i < keys.length; i++) {
      if (lower.indexOf(keys[i]) !== -1 || keys[i].indexOf(lower) !== -1) return index[keys[i]];
    }
    for (var i = 0; i < keys.length; i++) {
      if (stripped.indexOf(keys[i]) !== -1 || keys[i].indexOf(stripped) !== -1) return index[keys[i]];
    }
    var firstWord = stripped.split(' ')[0];
    if (firstWord.length > 3 && index[firstWord]) return index[firstWord];
    return null;
  }

  // FIX 5: Fetch with timeout
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

  // BULLETPROOF: Only fetch photo if we have a verified hardcoded ID.
  // NO fallback search. Unknown species get null (placeholder emoji shown).
  async function getINatPhoto(name) {
    var taxon = lookup(TAXON_MAP, name);
    if (!taxon) return null;  // Unknown species: show placeholder, never guess

    try {
      var resp = await fetchWithTimeout(
        'https://api.inaturalist.org/v1/taxa/' + taxon.id,
        { headers: { 'Accept': 'application/json' } },
        4000
      );
      if (!resp.ok) return { taxon_id: taxon.id, taxon_slug: taxon.slug };

      var data = await resp.json();
      // iNat /v1/taxa/:id returns either {results:[...]} or the taxon directly
      var t = (data.results && data.results.length > 0) ? data.results[0] : data;

      // Verify the returned taxon ID matches what we asked for
      // If it doesn't match, something went wrong - show placeholder
      if (t.id && t.id !== taxon.id) {
        var knownSci2 = lookup(SCIENTIFIC_NAMES, name);
      return { taxon_id: taxon.id, taxon_slug: taxon.slug, scientific_name: knownSci2 || null, image_url: null };
      }

      var knownSci = lookup(SCIENTIFIC_NAMES, name);
      return {
        scientific_name: knownSci || null,
        taxon_id: taxon.id,
        taxon_slug: taxon.slug,
        image_url: t.default_photo ? t.default_photo.medium_url : null,
        image_credit: t.default_photo ? (t.default_photo.attribution || 'iNaturalist') : null
      };
    } catch(e) {
      // On any error: return the taxon link but no photo
      var knownSci2 = lookup(SCIENTIFIC_NAMES, name);
      return { taxon_id: taxon.id, taxon_slug: taxon.slug, scientific_name: knownSci2 || null, image_url: null };
    }
  }

  // FIX 2: Batch iNat calls in chunks of 5 to avoid rate limits
  async function enrichItems(items) {
    var results = [];
    var chunkSize = 5;
    for (var i = 0; i < items.length; i += chunkSize) {
      var chunk = items.slice(i, i + chunkSize);
      var chunkResults = await Promise.all(chunk.map(async function(item) {
        var inat = await getINatPhoto(item.name);
        if (inat) {
          if (inat.image_url) { item.image_url = inat.image_url; item.image_credit = inat.image_credit; }
          if (inat.scientific_name) item.scientific_name = inat.scientific_name;
          if (inat.taxon_id) { item.taxon_id = inat.taxon_id; item.taxon_slug = inat.taxon_slug; }
        }
        // FIX 3: Explicitly null unscored items
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
    '- List EVERY hazard present at this location in ' + month + '. Do not filter. Include everything.',
    '- DO NOT skip common hazards like mosquitoes, gnats, ticks, poison ivy.',
    '- A thorough response will have 15-25 entries.',
    '- Use the EXACT common names listed below so they can be matched to our database.',
    '',
    'PREFERRED NAMES (use these exact strings where applicable):',
    'mosquito, deer fly, horse fly, black fly, no-see-um, stable fly, gnat, sand fly,',
    'fire ant, carpenter ant, yellow jacket, bald-faced hornet, paper wasp, honey bee, bumble bee, carpenter bee, cicada killer,',
    'deer tick, american dog tick, lone star tick, brown dog tick,',
    'black widow, brown recluse, wolf spider, chigger, scorpion,',
    'copperhead, cottonmouth, timber rattlesnake, eastern diamondback rattlesnake, western diamondback rattlesnake, pygmy rattlesnake, coral snake,',
    'american alligator, snapping turtle, gila monster,',
    'jellyfish, portuguese man o war, stingray, sea urchin, fire coral, lionfish, sea lice,',
    'poison ivy, poison oak, poison sumac, stinging nettle, giant hogweed, wild parsnip,',
    'puss caterpillar, saddleback caterpillar,',
    'centipede, flea, bed bug, earwig, slug, leech, feral pig',
    '',
    'Return ONLY a raw JSON object, no markdown, no explanation.',
    '{',
    '  "location_display": "City, State",',
    '  "month": "' + month + '",',
    '  "activity_level": "High or Moderate or Low",',
    '  "alert": { "active": false, "title": "", "text": "" },',
    '  "pests": [',
    '    {',
    '      "name": "exact common name from preferred names list above",',
    '      "category": "Biting Insect or Stinging Insect or Tick or Arachnid or Venomous Snake or Reptile or Stinging Plant or Toxic Plant or Marine Hazard or Other Hazard",',
    '      "severity": "High or Medium or Low",',
    '      "description": "2-3 sentences specific to this location and month.",',
    '      "peak_timing": "When most active this month",',
    '      "prevention_tips": ["tip 1", "tip 2", "tip 3"]',
    '    }',
    '  ]',
    '}',
    '',
    'severity: High = genuine medical risk or very common. Medium = moderate nuisance or occasional risk. Low = minor.',
    '15-25 entries expected. ONLY output the JSON.'
  ].join('\n');

  try {
    // FIX 1: max_tokens 8000 to handle 15-25 entry responses without truncation
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
    result.pests = await enrichItems(items);
    delete result.hazards;

    return res.status(200).json(result);

  } catch(e) {
    return res.status(500).json({ error: e.message || 'Unknown error' });
  }
}
