export interface GlossaryTerm {
  term: string;
  anchor: string;   // kebab-case, used as #anchor and aria-label
  definition: string;  // plain text, 1–3 sentences
  seeAlso?: string[];  // other anchor strings
}

export const glossaryTerms: GlossaryTerm[] = [
  {
    term: 'AFSL',
    anchor: 'afsl',
    definition:
      'Australian Financial Services Licence. A licence issued by ASIC that authorises a person or entity to operate a financial services business, including offering racehorse syndicate shares to the public. Every syndicator must hold an AFSL or operate as an authorised representative of an AFSL holder.',
    seeAlso: ['pds', 'syndicator'],
  },
  {
    term: 'Barrier draw',
    anchor: 'barrier-draw',
    definition:
      'The process — usually conducted by ballot — that determines which gate (barrier) each horse starts from in a race. Lower barrier numbers (inside draws) are generally considered advantageous in shorter races run on tighter tracks.',
    seeAlso: ['barrier-trial'],
  },
  {
    term: 'Barrier trial',
    anchor: 'barrier-trial',
    definition:
      'A non-racing event where horses practice jumping from starting barriers and galloping over a short distance. Barrier trials are used to qualify unraced horses for race day and to assess fitness after a spell. They carry no betting or official prize money.',
    seeAlso: ['gallop'],
  },
  {
    term: 'Benchmark race',
    anchor: 'benchmark',
    definition:
      'A race classification used in Australia where horses are eligible to enter if their official rating is at or below the nominated benchmark number (e.g., Benchmark 64, Benchmark 78). As a horse wins and earns ratings points, it is promoted to higher benchmarks.',
    seeAlso: ['ratings-race'],
  },
  {
    term: 'Black type',
    anchor: 'black-type',
    definition:
      'A term from bloodstock catalogues indicating a horse has won or placed in a Group or Listed race. Black type in a horse\'s pedigree increases the value of its offspring. Owning a black-type performer is a significant achievement.',
    seeAlso: ['group-race', 'listed-race'],
  },
  {
    term: 'Blinkers',
    anchor: 'blinkers',
    definition:
      'A piece of equipment placed over a horse\'s head to restrict its peripheral vision. Used to help horses focus and reduce distraction during a race. The addition or removal of blinkers is noted on a race card and often signals a change in training approach.',
  },
  {
    term: 'BOBS',
    anchor: 'bobs',
    definition:
      'Breeders and Owners Bonus Scheme. A NSW bonus prizemoney program that adds substantial extra payments when eligible NSW-bred horses win or place in qualifying country and provincial races. Horses can hold BOBS Gold (breeder nomination) or BOBS Silver (owner nomination).',
    seeAlso: ['vobis', 'qtis', 'mmrs'],
  },
  {
    term: 'Dam',
    anchor: 'dam',
    definition:
      'The mother of a horse. When reading a pedigree, the dam is listed after the sire. The dam\'s racing record and breeding history significantly influence a yearling\'s sale price and expected ability.',
    seeAlso: ['sire', 'dam-sire'],
  },
  {
    term: 'Dam sire',
    anchor: 'dam-sire',
    definition:
      'The sire of the dam — effectively the horse\'s maternal grandfather. The dam sire is an important part of a horse\'s pedigree and is used by bloodstock analysts to assess compatibility (nick) with the sire.',
    seeAlso: ['dam', 'sire'],
  },
  {
    term: 'Fixed odds',
    anchor: 'fixed-odds',
    definition:
      'A betting format where the odds at which you back a horse are locked in at the time you place your bet, regardless of what the market does afterwards. If you bet $10 at $5.00 fixed odds, you receive $50 if the horse wins, regardless of the final tote dividend.',
    seeAlso: ['tote', 'tab'],
  },
  {
    term: 'Foal date',
    anchor: 'foal-date',
    definition:
      'The date a horse was born. In Australia, all thoroughbreds share a universal birthday of 1 August — meaning a horse born in September is officially a "yearling" the following August, regardless of its actual age in months.',
  },
  {
    term: 'Gallop',
    anchor: 'gallop',
    definition:
      'A horse\'s fastest gait. In a racing context, a "gallop" also refers to a workout where a horse is taken through faster paces during morning track exercise. Trackwork gallops are used by trainers to assess fitness and prepare a horse for race day.',
    seeAlso: ['barrier-trial'],
  },
  {
    term: 'Group 1 / Group 2 / Group 3',
    anchor: 'group-race',
    definition:
      'The three tiers of Group races — the highest level of thoroughbred racing in Australia and internationally. Group 1 races are the most prestigious and carry the largest prizemoney. Placing in a Group race gives a horse "black type" which adds significant value to its breeding career.',
    seeAlso: ['black-type', 'listed-race'],
  },
  {
    term: 'Heavy track',
    anchor: 'heavy-track',
    definition:
      'A track condition rating indicating saturated going. Australian racecourses use a scale from Firm 1 (very fast) to Heavy 10 (extremely wet and slow). Heavy tracks favour horses that handle soft going and can significantly affect race times and results.',
    seeAlso: ['wet-track'],
  },
  {
    term: 'Inglis',
    anchor: 'inglis',
    definition:
      'William Inglis and Son, one of Australia\'s two major thoroughbred auction houses (the other being Magic Millions). Inglis conducts major yearling sales at Riverside Stables in Sydney, including the Premier Sale and the Easter Sale, which are the benchmarks for high-end yearling prices in NSW.',
    seeAlso: ['magic-millions'],
  },
  {
    term: 'Listed race',
    anchor: 'listed-race',
    definition:
      'A race ranked just below Group 3 in the Australian racing hierarchy. Winning or placing in a Listed race earns a horse black type and adds to its pedigree value, though it is a step below the Group race category.',
    seeAlso: ['group-race', 'black-type'],
  },
  {
    term: 'Magic Millions',
    anchor: 'magic-millions',
    definition:
      'Magic Millions Pty Ltd, a thoroughbred auction company based on the Gold Coast. Best known for the January Gold Coast Sales and the associated Magic Millions Race Series, which includes the Magic Millions 2YO Classic and 3YO Guineas — two of the richest races for young horses in the world.',
    seeAlso: ['mmrs', 'inglis'],
  },
  {
    term: 'MMRS',
    anchor: 'mmrs',
    definition:
      'Magic Millions Race Series. A bonus prizemoney scheme operated by Magic Millions for horses sold through their auctions. Nominated horses are eligible for the Magic Millions Gold Coast Carnival races in January, including the $2,000,000 2YO Classic and $2,000,000 3YO Guineas.',
    seeAlso: ['magic-millions', 'bobs', 'vobis', 'qtis'],
  },
  {
    term: 'Objection',
    anchor: 'objection',
    definition:
      'A formal challenge lodged by a jockey or trainer after a race, alleging interference or a rule breach by another horse. An objection triggers a stewards inquiry. If upheld, placings may be amended. Objections are lodged immediately after a race.',
    seeAlso: ['protest', 'stewards'],
  },
  {
    term: 'PDS',
    anchor: 'pds',
    definition:
      'Product Disclosure Statement. A legally required document that must be issued before any offer of a racehorse syndicate share to retail investors in Australia. The PDS must disclose all fees, the horse\'s purchase price, the syndicate structure, the syndicator\'s AFSL details, and the risks of ownership.',
    seeAlso: ['afsl', 'syndicator'],
  },
  {
    term: 'Principal racing authority',
    anchor: 'principal-racing-authority',
    definition:
      'The governing body for thoroughbred racing in each Australian state. Racing Victoria governs Victoria; Racing NSW governs New South Wales; Racing Queensland governs Queensland, and so on. Each authority sets the rules, issues licences, and manages integrity for racing in its state.',
    seeAlso: ['racing-australia'],
  },
  {
    term: 'Prizemoney',
    anchor: 'prizemoney',
    definition:
      'Money paid to the connections of a horse (owners, trainer, jockey) when it wins or places in a race. Prizemoney is funded by wagering revenue and state authority minimum guarantee schemes. Owners receive their proportional share after trainer (10%) and jockey (5%) deductions.',
    seeAlso: ['share'],
  },
  {
    term: 'Protest',
    anchor: 'protest',
    definition:
      'A challenge to a race result lodged directly with race stewards, usually by a connections\' representative rather than the jockey. A protest can relate to interference, track condition, or equipment irregularities. Similar in effect to an objection.',
    seeAlso: ['objection', 'stewards'],
  },
  {
    term: 'QTIS',
    anchor: 'qtis',
    definition:
      'Queensland Thoroughbred Incentive Scheme. A bonus prizemoney program run by Racing Queensland for Queensland-foaled horses. QTIS Gold and standard nominations provide bonus payments when eligible horses win or place in qualifying Queensland races.',
    seeAlso: ['bobs', 'vobis', 'mmrs'],
  },
  {
    term: 'Racing Australia',
    anchor: 'racing-australia',
    definition:
      'The national body for thoroughbred racing in Australia that maintains the Australian Stud Book, registers owners and horses, and sets uniform national rules of racing. Every racehorse owner must register with Racing Australia and the relevant state principal racing authority.',
    seeAlso: ['principal-racing-authority'],
  },
  {
    term: 'Ratings race',
    anchor: 'ratings-race',
    definition:
      'A race where horses are handicapped based on their official Racing Australia rating. Horses earn rating points when they win or place; these points determine which races they are eligible to enter. A higher-rated horse may be excluded from lower-grade races.',
    seeAlso: ['benchmark'],
  },
  {
    term: '2yo',
    anchor: '2yo',
    definition:
      'Two-year-old. The age classification for a horse that is in its second year of age (from 1 August). Two-year-olds are the youngest horses to race in Australia and often compete in sprint races from spring through to the following autumn.',
    seeAlso: ['foal-date', 'yearling', '3yo'],
  },
  {
    term: '3yo',
    anchor: '3yo',
    definition:
      'Three-year-old. The age classification for a horse entering its third year. Three-year-olds are eligible for the classic spring races — including the Victoria Derby, the Caulfield Cup, and the Melbourne Cup for staying-bred types — which are the most prestigious races for this age group.',
    seeAlso: ['2yo', 'foal-date'],
  },
  {
    term: 'Raceday',
    anchor: 'raceday',
    definition:
      'A scheduled day of horse racing at an accredited racecourse. As a registered owner, you receive mounting yard access and owners enclosure entry for races in which your horse is declared. Raceday is the central experience of thoroughbred ownership.',
  },
  {
    term: 'Share',
    anchor: 'share',
    definition:
      'A percentage interest in a racehorse syndicate. Owning a 5% share means you contribute 5% of costs and receive 5% of prizemoney. Shares are offered under a Product Disclosure Statement and governed by a syndicate deed.',
    seeAlso: ['syndicate', 'pds'],
  },
  {
    term: 'Sire',
    anchor: 'sire',
    definition:
      'The father of a horse. The sire\'s racing record and breeding success significantly influence the value and expected ability of its offspring. Horses by fashionable sires command premium prices at yearling sales.',
    seeAlso: ['dam', 'dam-sire'],
  },
  {
    term: 'Stewards',
    anchor: 'stewards',
    definition:
      'Race day officials appointed by the principal racing authority to enforce the rules of racing. Stewards monitor race day conduct, investigate objections and protests, conduct swab testing, and can suspend or disqualify horses, jockeys, and trainers for rule breaches.',
    seeAlso: ['objection', 'protest', 'principal-racing-authority'],
  },
  {
    term: 'Strapper',
    anchor: 'strapper',
    definition:
      'A stablehand responsible for the day-to-day care of one or more racehorses — feeding, grooming, rugging, and leading the horse to the track. The strapper is often the person who leads the horse in the mounting yard on race day.',
  },
  {
    term: 'Syndicate',
    anchor: 'syndicate',
    definition:
      'A group of people who collectively own a horse through a legally structured arrangement governed by a syndicate deed and a Product Disclosure Statement. Syndicates allow multiple owners to share the cost and experience of racehorse ownership.',
    seeAlso: ['syndicator', 'pds', 'share'],
  },
  {
    term: 'Syndicator',
    anchor: 'syndicator',
    definition:
      'A licensed entity that puts together and manages a racehorse syndicate. The syndicator must hold an AFSL, issue a PDS for each horse, collect owner contributions, distribute prizemoney, and communicate with syndicate members. The syndicator is the legal manager of the syndicate.',
    seeAlso: ['afsl', 'pds', 'syndicate'],
  },
  {
    term: 'TAB',
    anchor: 'tab',
    definition:
      'Totalisator Agency Board. The state-licensed wagering operator in each Australian state. In practice, TAB is the dominant retail and online wagering operator in Australia, accepting bets on thoroughbred, harness, and greyhound racing as well as sports.',
    seeAlso: ['tote', 'fixed-odds'],
  },
  {
    term: 'Tote',
    anchor: 'tote',
    definition:
      'A pool-based betting system where all bets on a race are collected into a pool, the track take is deducted, and the remainder is divided among winning ticket holders. Tote dividends fluctuate based on how much money is bet on each runner, unlike fixed odds which are locked in at time of bet.',
    seeAlso: ['tab', 'fixed-odds'],
  },
  {
    term: 'Trainer',
    anchor: 'trainer',
    definition:
      'A licensed professional responsible for preparing a racehorse for competition. The trainer manages the horse\'s fitness, diet, race schedule, and jockey bookings, and typically charges a weekly fee plus a percentage of prizemoney (usually 10% of connections\' share).',
    seeAlso: ['syndicator', 'strapper'],
  },
  {
    term: 'VOBIS',
    anchor: 'vobis',
    definition:
      'Victorian Owners and Breeders Incentive Scheme. A bonus prizemoney program run by Racing Victoria for Victorian-sired or Victorian-bred horses. VOBIS Gold and standard tiers provide substantial bonus payments when eligible horses win or place in qualifying Victorian races.',
    seeAlso: ['bobs', 'qtis', 'mmrs'],
  },
  {
    term: 'Weanling',
    anchor: 'weanling',
    definition:
      'A young horse that has been weaned from its mother, typically at 4–6 months of age. Weanlings are sometimes sold at auction but are more commonly retained by studs and offered as yearlings the following year.',
    seeAlso: ['yearling', 'foal-date'],
  },
  {
    term: 'Wet track',
    anchor: 'wet-track',
    definition:
      'A general term for a racecourse with a surface rating of Soft or below. Wet tracks favour horses with high knee action and good balance in the ground, and can produce very different race results compared to firm going. Always check the track condition when your horse is declared.',
    seeAlso: ['heavy-track'],
  },
  {
    term: 'Yearling',
    anchor: 'yearling',
    definition:
      'A horse in its first official year of age — from 1 August of the year of birth through to 31 July of the following year. Most thoroughbred syndication occurs at the yearling stage, after the horse has been purchased at a yearling sale. This is when the journey to race day begins.',
    seeAlso: ['weanling', '2yo', 'foal-date'],
  },
];
