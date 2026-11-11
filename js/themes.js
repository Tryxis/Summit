/*
  DESIGN REGISTRY. The switcher is built from these lists; the first entry of each is the default.

  To add a design:
    1. Copy css/theme-alpine.css to css/theme-<id>.css, change the selector to [data-theme="<id>"], restyle.
    2. Add a <link> for it in index.html (before hero.css).
    3. Add an entry to SUMMIT_THEMES below.

  Theme fields
    id      matches data-theme in your CSS; also used in the ?style=<id> share link
    label   text on the switcher button
    color   optional, sets the default browser UI colour (meta theme-color)
    palettes optional palette presets with id, label, swatch color, and optional themeColor (?palette=<id>)
    copy    optional text swaps for elements marked data-copy="key" in index.html.
            Anything not listed keeps the default text from the HTML.
    onEnter / onLeave   optional functions for design-specific JS. They receive <html>.

  Every palette keeps the page monochrome and takes its accents from the brand palette:
    paper #F3F6F4   olive #7D8D39   moss #5B6E2C   ember #FF5A22

  Hero variants (SUMMIT_HEROES) are independent of the design and set data-hero (?hero=<id>).
  Their CSS lives in css/hero.css.

  Markup hooks a design can style: .stage .bar .bar-inner .nav .navl .brand .hero .hero-inner .hero-mark
  .wm-svg (full-width SVG wordmark, hidden by default) .wm-text (HTML wordmark: .word .sub .coord, hidden by default)
  .contours (canvas, hidden by default) .section .section-head .aside (hidden by default)
  .barbers .barber .pic .poster (4:5 poster) .medal (round portrait, hidden by default) .idx (hidden by default)
  .who .name .handle .book .arr .reels .reel .rail-meta (hidden by default)
  .visit .addr .street .city .postcode .visit-links .vlink .k (small label) .v (main label) .map .foot .foot-inner
  .minibar .mini-book .cta .cta-primary .cta-ghost
*/
window.SUMMIT_THEMES = [
  {
    id: 'swiss', label: 'Swiss', color: '#F3F6F4',
    palettes: [
      { id: 'ember', label: 'Ember', color: 'linear-gradient(135deg, #F3F6F4 50%, #FF5A22 50%)', themeColor: '#F3F6F4' },
      { id: 'moss', label: 'Moss', color: 'linear-gradient(135deg, #F3F6F4 50%, #5B6E2C 50%)', themeColor: '#F3F6F4' },
      { id: 'olive', label: 'Olive', color: 'linear-gradient(135deg, #F3F6F4 50%, #7D8D39 50%)', themeColor: '#F3F6F4' },
      { id: 'ink', label: 'Ink', color: 'linear-gradient(135deg, #0E100E 50%, #FF5A22 50%)', themeColor: '#0E100E' }
    ],
    copy: { street: '7 Cross St', city: 'Newcastle', directions: 'Directions', 'cta-find': 'Visit' }
  },
  {
    id: 'alpine', label: 'Alpine', color: '#0E100E',
    palettes: [
      { id: 'summit', label: 'Summit', color: 'linear-gradient(135deg, #0E100E 50%, #7D8D39 50%)', themeColor: '#0E100E' },
      { id: 'ember', label: 'Ember', color: 'linear-gradient(135deg, #0E100E 50%, #FF5A22 50%)', themeColor: '#0E100E' },
      { id: 'graphite', label: 'Graphite', color: 'linear-gradient(135deg, #1A1C1B 50%, #F3F6F4 50%)', themeColor: '#1A1C1B' },
      { id: 'snow', label: 'Snow', color: 'linear-gradient(135deg, #F3F6F4 50%, #5B6E2C 50%)', themeColor: '#F3F6F4' }
    ],
    copy: {
      'barbers-title': 'The barbers', 'visit-title': 'Base camp', 'work-title': 'In the chair',
      instagram: '@summit.barberstudio', 'cta-book': 'Book a chair', 'cta-find': 'Base camp'
    }
  }
];

window.SUMMIT_HEROES = [
  { id: 'cinema', label: 'Cinema' },
  { id: 'knockout', label: 'Knockout' },
  { id: 'geometry', label: 'Geometry' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'duotone', label: 'Duotone' },
  { id: 'classic', label: 'Classic' }
];
