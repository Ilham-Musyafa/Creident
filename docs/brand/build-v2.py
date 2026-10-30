"""Run with /usr/bin/python3 docs/brand/build-v2.py from repository root.
Uses preinstalled fontTools + Brotli only. PNG exports use browser canvas, separately.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
out=Path('public/brand/v2');out.mkdir(parents=True,exist_ok=True)
f=instantiateVariableFont(TTFont('src/fonts/outfit-latin-wght-normal.woff2'),{'wght':700},inplace=False)
g=f.getGlyphSet();c=f.getBestCmap()
def glyph(ch):
 p=SVGPathPen(g);g[c[ord(ch)]].draw(p);return p.getCommands()
def word(color,check,mark=False,gap=52):
 # Small marks keep a raster-safe optical gap floor.
 if mark: gap=max(gap,85)
 # Reference letter stroke ~130 font units; check 108 (83%), gap B=52 (40%).
 check_path='M450 110 525 40 700 225'
 defs=f'<defs><mask id="ct"><rect x="-100" y="-100" width="1100" height="1100" fill="white"/><rect x="430" y="-60" width="400" height="230" fill="black"/><path d="{check_path}" fill="none" stroke="black" stroke-width="{108+2*gap}" stroke-linecap="round" stroke-linejoin="round"/></mask><mask id="dt"><rect x="-100" y="-100" width="1000" height="1000" fill="white"/><rect x="390" y="-50" width="240" height="220" rx="45" fill="black"/></mask></defs>'
 art=f'<path d="{glyph("C")}" fill="{color}" mask="url(#ct)"/><path d="{check_path}" fill="none" stroke="{check}" stroke-width="108" stroke-linecap="round" stroke-linejoin="round"/>'
 x=f['hmtx'][c[67]][0]-10
 if not mark:
  for ch in 'reident':
   shape=f'<path d="{glyph(ch)}" fill="{color}"'+(' mask="url(#dt)"' if ch=='d' else '')+'/>'
   if ch=='d':shape+=f'<path d="M463 220V130Q465 38 408 58Q380 65 350 100" fill="none" stroke="{color}" stroke-width="105" stroke-linecap="round" stroke-linejoin="round"/>'
   if ch=='d': shape+=f'<circle cx="450" cy="100" r="26" fill="{color}"/>'
   art+=f'<g transform="translate({x} 0)">{shape}</g>';x+=f['hmtx'][c[ord(ch)]][0]-10
 w=48 if mark else (x+55)*.05
 transform='translate(3 41) scale(.055 -.055)' if mark else 'translate(0 40) scale(.05 -.05)'
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} 48" role="img" aria-label="Creident"><title>Creident</title>{defs}<g transform="{transform}">{art}</g></svg>'
for name,color,check,mark in [('wordmark-light','#0B1F4B','#3B82F6',False),('wordmark-dark','#FFFFFF','#93C5FD',False),('wordmark-mono-navy','#0B1F4B','#0B1F4B',False),('wordmark-mono-white','#FFFFFF','#FFFFFF',False),('mark','#0B1F4B','#3B82F6',True),('mark-dark','#FFFFFF','#93C5FD',True)]: (out/f'{name}.svg').write_text(word(color,check,mark))
def icon(bg,light=False,sapphire=False,maskable=False):
 mark=word('#FFFFFF' if light else '#0B1F4B','#FFFFFF' if sapphire else '#93C5FD' if light else '#3B82F6',True)
 inner=mark[mark.index('<defs>'):mark.rfind('</svg>')]
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><title>Creident app icon</title><rect width="48" height="48" rx="{0 if maskable else 10.56}" fill="{bg}"/><g transform="translate(7.2 7.2) scale(.7)">{inner}</g></svg>'
for n,b,l,s in [('navy','#0B1F4B',True,False),('white','#FFFFFF',False,False),('sapphire','#3B82F6',True,True)]: (out/f'app-icon-{n}.svg').write_text(icon(b,l,s))
(out/'favicon.svg').write_text(word('#0B1F4B','#3B82F6',True))
(out/'maskable-source.svg').write_text(icon('#0B1F4B',True,False,True))

# Diagnostic options use identical artwork, varying only the exclusion gap.
fix=Path('docs/brand/fix');fix.mkdir(parents=True,exist_ok=True)
for letter,gap in [('a',39),('b',52),('c',65)]:
 (fix/f'spacing-{letter}.svg').write_text(word('#0B1F4B','#3B82F6',gap=gap))
 (fix/f'spacing-{letter}-dark.svg').write_text(word('#FFFFFF','#93C5FD',gap=gap))
