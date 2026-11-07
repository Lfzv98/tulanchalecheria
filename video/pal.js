// Paletas del día para el carrusel de la portada: amanecer, mediodía, tarde y atardecer
const PALS = {
  amanecer: { sky: ['#24345e', '#4d5f93', '#b98fb0', '#f3c2ad', '#ffe2c6'], sunx: .3, glow: ['rgba(255,236,220,.95)', 'rgba(255,205,180,.7)', 'rgba(250,170,170,.22)', 'rgba(240,160,160,0)'], sun: '#fff1e2',
    cl1: '255,206,200', cl2: '90,96,150', isl: ['rgba(126,120,170,.5)', 'rgba(116,110,160,.45)', 'rgba(80,82,130,.75)', 'rgba(46,52,92,.92)'],
    sea: ['#f2c7b4', '#b08fae', '#56679a', '#2c3b68', '#1b2648'], refl: 'rgba(255,214,196,.4)', gl1: '255,226,210', haze: '255,214,200', foam: '255,238,230' },
  mediodia: { sky: ['#1f6fb8', '#3f8fd0', '#7cbbe6', '#bfe2f4', '#e9f6fb'], sunx: .8, suny: .1, sunr: 38, sun: '#fffdf2',
    glow: ['rgba(255,255,245,.95)', 'rgba(255,252,230,.6)', 'rgba(255,250,220,.18)', 'rgba(255,250,220,0)'],
    cl1: '255,255,255', cl2: '160,190,220', isl: ['rgba(92,140,128,.55)', 'rgba(84,132,118,.55)', 'rgba(44,98,74,.88)', 'rgba(28,74,54,.96)'],
    sea: ['#8fd3df', '#43b5cc', '#1a93b1', '#0c6f92', '#075573'], refl: 'rgba(255,255,255,.18)', wave: '4,60,86', gl1: '255,255,250', gl2: '230,250,255', gl2a: .5,
    hull: '#f5f7fb', cab: '#e3e8f1', win: 'rgba(32,40,70,.78)', rim: 'rgba(255,255,255,.95)', rim2: 'rgba(200,210,226,.9)', shadow: '#04394f', gull: 'rgba(40,52,74,.8)', haze: '255,255,255', foam: '255,255,255', vig: .32 },
  tarde: { sky: ['#2a5f9e', '#4f86bf', '#9fc0d8', '#f2d6a8', '#ffe6b0'], sunx: .74, suny: .3, sunr: 42, sun: '#fff6d8',
    glow: ['rgba(255,248,220,.95)', 'rgba(255,230,170,.65)', 'rgba(255,210,140,.22)', 'rgba(255,200,130,0)'],
    cl1: '255,236,210', cl2: '120,140,180', isl: ['rgba(98,118,128,.55)', 'rgba(90,110,120,.5)', 'rgba(52,82,82,.85)', 'rgba(34,58,62,.95)'],
    sea: ['#f3d6a4', '#7fb3c2', '#2b7d9c', '#155b7c', '#0c425e'], refl: 'rgba(255,226,170,.38)', wave: '8,40,64', gl1: '255,240,200', gl2: '220,240,250', gl2a: .4,
    hull: '#eef1f6', cab: '#d9dfea', win: 'rgba(40,48,80,.75)', rim: 'rgba(255,236,200,.95)', rim2: 'rgba(255,230,190,.7)', shadow: '#07344c', gull: 'rgba(36,44,70,.8)', haze: '255,232,200', foam: '255,248,236', vig: .4 },
  atardecer: {}
};
window.PAL = PALS[location.search.slice(1).split('&')[0]] || {};
