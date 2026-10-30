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
 # Outfit was already 700 in BK1c; keep requested weight and loosen tracking.
 # Clip the C terminal independently; never knock out a check-shaped halo.
 check_path='M470 100 540 30 690 180'
 defs='<defs><clipPath id="ct"><path d="M-100 -100H580L280 200H1000V1000H-100Z"/></clipPath><clipPath id="dt"><path d="M-100 -100H390V160H650V1000H-100Z"/></clipPath></defs>'
 art=f'<path d="{glyph("C")}" fill="{color}" clip-path="url(#ct)"/><path d="{check_path}" fill="none" stroke="{check}" stroke-width="95" stroke-linecap="round" stroke-linejoin="round"/>'
 x=f['hmtx'][c[67]][0]+5
 if not mark:
  for ch in 'reident':
   shape=f'<path d="{glyph(ch)}" fill="{color}"'+(' clip-path="url(#dt)"' if ch=='d' else '')+'/>'
   if ch=='d':shape+=f'<path d="M440 160V125Q440 60 505 60H520" fill="none" stroke="{color}" stroke-width="120" stroke-linecap="round" stroke-linejoin="round"/>'
   art+=f'<g transform="translate({x} 0)">{shape}</g>';x+=f['hmtx'][c[ord(ch)]][0]+5
 w=48 if mark else (x+55)*.05
 transform='translate(3 41) scale(.055 -.055)' if mark else 'translate(0 40) scale(.05 -.05)'
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} 48" role="img" aria-label="Creident"><title>Creident</title>{defs}<g transform="{transform}">{art}</g></svg>'
for name,color,check,mark in [('wordmark-light','#0B1F4B','#3B82F6',False),('wordmark-dark','#FFFFFF','#FFFFFF',False),('wordmark-mono-navy','#0B1F4B','#0B1F4B',False),('wordmark-mono-white','#FFFFFF','#FFFFFF',False),('mark','#0B1F4B','#3B82F6',True),('mark-dark','#FFFFFF','#93C5FD',True)]: (out/f'{name}.svg').write_text(word(color,check,mark))
def icon(bg,light=False,sapphire=False,maskable=False):
 mark=word('#FFFFFF' if light else '#0B1F4B','#FFFFFF' if sapphire else '#93C5FD' if light else '#3B82F6',True)
 inner=mark[mark.index('<defs>'):mark.rfind('</svg>')]
 border='<rect x=".35" y=".35" width="47.3" height="47.3" rx="10.21" fill="none" stroke="#E5E7EB" stroke-width=".7"/>' if bg=='#FFFFFF' else ''
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><title>Creident app icon</title><rect width="48" height="48" rx="{0 if maskable else 10.56}" fill="{bg}"/>{border}<g transform="translate(7.2 7.2) scale(.7)">{inner}</g></svg>'
for n,b,l,s in [('navy','#0B1F4B',True,False),('white','#FFFFFF',False,False),('sapphire','#3B82F6',True,True)]: (out/f'app-icon-{n}.svg').write_text(icon(b,l,s))
(out/'favicon.svg').write_text(word('#0B1F4B','#3B82F6',True))
(out/'maskable-source.svg').write_text(icon('#0B1F4B',True,False,True))
