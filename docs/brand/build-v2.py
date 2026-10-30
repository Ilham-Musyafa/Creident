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
def word(color,check,mark=False,gap=17):
 # Small marks keep a raster-safe optical gap floor.
 if mark: gap=max(gap,24)
 # BK1c: compact inner check, thin 17-unit separation; custom outward d tail.
 check_path='M420 110 490 25 650 195'
 defs=f'<defs><mask id="ct"><rect x="-100" y="-100" width="1100" height="1100" fill="white"/><rect x="430" y="-60" width="400" height="310" fill="black"/><path d="{check_path}" fill="none" stroke="black" stroke-width="{95+2*gap}" stroke-linecap="round" stroke-linejoin="round"/></mask><mask id="dt"><rect x="-100" y="-100" width="1000" height="1000" fill="white"/><path d="M370 -80H650V210L440 280 370 200Z" fill="black"/></mask></defs>'
 art=f'<path d="{glyph("C")}" fill="{color}" mask="url(#ct)"/><path d="{check_path}" fill="none" stroke="{check}" stroke-width="95" stroke-linecap="round" stroke-linejoin="round"/>'
 x=f['hmtx'][c[67]][0]-10
 if not mark:
  for ch in 'reident':
   shape=f'<path d="{glyph(ch)}" fill="{color}"'+(' mask="url(#dt)"' if ch=='d' else '')+'/>'
   if ch=='d':shape+=f'<path d="M350 135 490 15" fill="none" stroke="{color}" stroke-width="130" stroke-linecap="round" stroke-linejoin="round"/>'
   art+=f'<g transform="translate({x} 0)">{shape}</g>';x+=f['hmtx'][c[ord(ch)]][0]-10
 w=48 if mark else (x+55)*.05
 transform='translate(3 41) scale(.055 -.055)' if mark else 'translate(0 40) scale(.05 -.05)'
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} 48" role="img" aria-label="Creident"><title>Creident</title>{defs}<g transform="{transform}">{art}</g></svg>'
for name,color,check,mark in [('wordmark-light','#0B1F4B','#3B82F6',False),('wordmark-dark','#FFFFFF','#FFFFFF',False),('wordmark-mono-navy','#0B1F4B','#0B1F4B',False),('wordmark-mono-white','#FFFFFF','#FFFFFF',False),('mark','#0B1F4B','#3B82F6',True),('mark-dark','#FFFFFF','#93C5FD',True)]: (out/f'{name}.svg').write_text(word(color,check,mark))
def icon(bg,light=False,sapphire=False,maskable=False):
 mark=word('#FFFFFF' if light else '#0B1F4B','#FFFFFF' if sapphire else '#93C5FD' if light else '#3B82F6',True)
 inner=mark[mark.index('<defs>'):mark.rfind('</svg>')]
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><title>Creident app icon</title><rect width="48" height="48" rx="{0 if maskable else 10.56}" fill="{bg}"/><g transform="translate(7.2 7.2) scale(.7)">{inner}</g></svg>'
for n,b,l,s in [('navy','#0B1F4B',True,False),('white','#FFFFFF',False,False),('sapphire','#3B82F6',True,True)]: (out/f'app-icon-{n}.svg').write_text(icon(b,l,s))
(out/'favicon.svg').write_text(word('#0B1F4B','#3B82F6',True))
(out/'maskable-source.svg').write_text(icon('#0B1F4B',True,False,True))
