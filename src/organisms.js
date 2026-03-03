// ─── Organism Presets ───
export const ORGANISMS = {
    cyanobacterium: {
        name: 'Cyanobacterium',
        desc: 'Photosynthetic prokaryote — all pathways available',
        pathways: { glycolysis: true, ppp: true, calvin: true, krebs: true, betaox: true },
        environment: { light: true, oxygen: true },
        initialRatios: { atp: 0.9, nadh: 0.1, nadph: 0.1, fadh2: 0.1 },
    },
    animalCell: {
        name: 'Animal Cell',
        desc: 'Heterotrophic — no photosynthesis or carbon fixation',
        pathways: { glycolysis: true, ppp: true, calvin: false, krebs: true, betaox: true },
        environment: { light: false, oxygen: true },
        initialRatios: { atp: 0.9, nadh: 0.1, nadph: 0.1, fadh2: 0.1 },
        lockedReason: { calvin: 'Animal cells lack RuBisCO and photosystems' },
    },
    obligateAnaerobe: {
        name: 'Obligate Anaerobe',
        desc: 'Fermentation only — no oxidative phosphorylation',
        pathways: { glycolysis: true, ppp: false, calvin: false, krebs: false, betaox: false },
        environment: { light: false, oxygen: false },
        initialRatios: { atp: 0.5, nadh: 0.5, nadph: 0.1, fadh2: 0.1 },
        lockedReason: {
            ppp: 'Simplified anaerobe model',
            calvin: 'No photosynthetic machinery',
            krebs: 'O\u2082 required for oxidative metabolism',
            betaox: 'O\u2082 required for \u03B2-oxidation',
        },
    },
    plantChloroplast: {
        name: 'Plant Chloroplast',
        desc: 'Light reactions and carbon fixation only',
        pathways: { glycolysis: false, ppp: false, calvin: true, krebs: false, betaox: false },
        environment: { light: true, oxygen: true },
        initialRatios: { atp: 0.3, nadh: 0.1, nadph: 0.5, fadh2: 0.1 },
        lockedReason: {
            glycolysis: 'Chloroplast does not perform glycolysis',
            ppp: 'PPP occurs in cytoplasm, not chloroplast',
            krebs: 'Krebs cycle occurs in mitochondria',
            betaox: '\u03B2-oxidation occurs in mitochondria',
        },
    },
    archaeon: {
        name: 'Archaeon',
        desc: 'Uses bacteriorhodopsin for light-driven proton pumping',
        pathways: { glycolysis: true, ppp: false, calvin: false, krebs: true, betaox: true },
        environment: { light: true, oxygen: false },
        initialRatios: { atp: 0.7, nadh: 0.2, nadph: 0.1, fadh2: 0.1 },
        lockedReason: {
            ppp: 'Simplified archaeal model',
            calvin: 'No photosynthetic carbon fixation',
        },
    },
};
