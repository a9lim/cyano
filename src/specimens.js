// Specimens — the membrane each organism preset puts under the microscope.
// A specimen fixes the frame drawn around the membrane (a thylakoid sac, a
// crista, a cell envelope), the complexes it carries in order along the cut,
// what each is called in that organism, and which membrane reactions it can
// run. Widths are footprints along the membrane in nanometres, so complexes
// sit at roughly true relative size (Goodsell's rule).
//
// Engine keys: psii ndh1 sdh pq cytb6f pc cytOx psi fd fnr atpSyn br nnt ucp.
// Others are drawn but not part of the chain: lhcii (antenna trimers).

/** Footprint along the membrane, nm. */
export const WIDTH = {
    psii: 21, lhcii: 7.5, ndh1: 18, sdh: 7, pq: 4, cytb6f: 10, pc: 4, cytOx: 10,
    psi: 20, fd: 3, fnr: 6, atpSyn: 11, br: 33, nnt: 10, ucp: 4,
};

const N_THYL = {
    psii: 'PSII', lhcii: 'LHCII', ndh1: 'NDH-1', sdh: 'SDH', pq: 'PQ', cytb6f: 'cyt b₆f', pc: 'PC',
    cytOx: 'cyt oxidase', psi: 'PSI', fd: 'Fd', fnr: 'FNR', atpSyn: 'ATP synthase', br: 'BR', nnt: 'NNT', ucp: 'UCP',
};

export const SPECIMENS = {
    thylakoid: {
        name: 'Cyanobacterial thylakoid',
        frame: 'sac', lipid: 'galacto', antenna: 'phycobilisome', psiTrimer: true,
        sides: { top: 'cytoplasm', lumen: 'thylakoid lumen', below: 'cytoplasm' },
        order: ['psii', 'ndh1', 'sdh', 'pq', 'cytb6f', 'pc', 'cytOx', 'psi', 'fd', 'fnr', 'atpSyn', 'nnt'],
        names: N_THYL,
        can: { photo: true, cyclic: true, resp: true, nnt: true, brAuto: false },
        where: 'in the thylakoid lumen',
        say: 'respiration and photosynthesis share one membrane, its plastoquinone and its plastocyanin',
    },
    chloroplast: {
        name: 'Chloroplast thylakoid',
        frame: 'granum', lipid: 'galacto', antenna: 'lhcii', psiTrimer: false,
        sides: { top: 'stroma', lumen: 'thylakoid lumen', below: 'stroma' },
        // Reversed so the photosystem II end sits under the granum, on the right
        order: ['atpSyn', 'fnr', 'fd', 'psi', 'pc', 'cytb6f', 'pq', 'psii', 'lhcii', 'lhcii'],
        names: N_THYL,
        can: { photo: true, cyclic: true, resp: false, nnt: false, brAuto: false },
        where: 'in the thylakoid lumen',
        say: 'photosystem II packs into the stacked granum, photosystem I and ATP synthase into the stroma lamella',
    },
    cristae: {
        name: 'Mitochondrial crista',
        frame: 'cristae', lipid: 'ester', antenna: null, psiTrimer: false,
        sides: { top: 'matrix', lumen: 'crista lumen', below: 'matrix' },
        // The tip, lined with ATP synthase dimers, is on the left
        order: ['atpSyn', 'nnt', 'ucp', 'ndh1', 'sdh', 'pq', 'cytb6f', 'pc', 'cytOx'],
        names: { ...N_THYL, ndh1: 'complex I', sdh: 'complex II', pq: 'UQ', cytb6f: 'complex III', pc: 'cyt c', cytOx: 'complex IV' },
        can: { photo: false, cyclic: false, resp: true, nnt: true, brAuto: false },
        where: 'in the crista lumen',
        say: 'the respiratory chain lines the flat face and ATP synthase dimers bend the tip',
    },
    plasma: {
        name: 'Anaerobe plasma membrane',
        frame: 'wall', lipid: 'ester', antenna: null, psiTrimer: false,
        sides: { top: 'cell wall', lumen: 'outside', below: 'cytoplasm' },
        order: ['atpSyn', 'nnt'],
        names: N_THYL,
        can: { photo: false, cyclic: false, resp: false, nnt: true, brAuto: false },
        where: 'outside the membrane',
        say: 'no chain pumps here, so every ATP is made in the cytoplasm',
    },
    purple: {
        name: 'Halophile purple membrane',
        frame: 'slayer', lipid: 'ether', antenna: null, psiTrimer: false,
        sides: { top: 'S-layer', lumen: 'outside', below: 'cytoplasm' },
        order: ['br', 'atpSyn', 'ndh1', 'sdh', 'pq', 'cytb6f', 'pc', 'cytOx'],
        names: { ...N_THYL, br: 'bacteriorhodopsin', ndh1: 'NDH', pq: 'MK', cytb6f: 'cyt bc', pc: 'halocyanin', cytOx: 'cyt ba₃' },
        can: { photo: false, cyclic: false, resp: true, nnt: false, brAuto: true },
        where: 'outside the cell',
        say: 'bacteriorhodopsin, packed in a crystalline patch, pumps a proton for each photon',
    },
    composite: {
        name: 'Composite membrane',
        frame: 'sac', lipid: 'ester', antenna: null, psiTrimer: false,
        sides: { top: 'outside', lumen: 'lumen', below: 'cytoplasm' },
        order: ['psii', 'ndh1', 'sdh', 'pq', 'cytb6f', 'pc', 'cytOx', 'psi', 'fd', 'fnr', 'atpSyn', 'br', 'nnt', 'ucp'],
        names: N_THYL,
        can: { photo: true, cyclic: true, resp: true, nnt: true, brAuto: false },
        where: 'in the lumen',
        say: 'every complex the model knows, on one membrane',
    },
};

/** Which specimen each organism preset shows. Custom shows the composite. */
export const SPECIMEN_OF = {
    cyanobacterium: 'thylakoid', plantChloroplast: 'chloroplast', animalCell: 'cristae',
    obligateAnaerobe: 'plasma', archaeon: 'purple', custom: 'composite',
};

/** Which reactions a complex fires when clicked: [dispatch key, step]. */
export const CLICK = {
    psii: ['etc_photo', 0], ndh1: ['etc_resp', 0], sdh: ['etc_resp', 1], psi: ['etc_cyclic', 0],
    atpSyn: ['atp_syn', 0], br: ['br', 0], nnt: ['nnt', 0], ucp: ['ucp', 0],
};

/** Whether the specimen's membrane can run a clicked reaction at all. */
export function specimenCan(spec, key) {
    if (key === 'etc_photo') return spec.can.photo;
    if (key === 'etc_cyclic') return spec.can.cyclic;
    if (key === 'etc_resp') return spec.can.resp;
    return true;
}
