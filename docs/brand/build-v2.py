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
def word(color,check,mark=False):
 defs='<defs><mask id="ct"><rect x="-100" y="-100" width="1000" height="1000" fill="white"/><rect x="420" y="-40" width="400" height="225" fill="black"/></mask><mask id="dt"><rect x="-100" y="-100" width="1000" height="1000" fill="white"/><rect x="420" y="-65" width="200" height="160" rx="55" fill="black"/></mask></defs>'
 art=f'<path d="{glyph("C")}" fill="{color}" mask="url(#ct)"/><path d="M400 100 475 25 670 220" fill="none" stroke="{check}" stroke-width="88" stroke-linecap="round" stroke-linejoin="round"/>'
 x=f['hmtx'][c[67]][0]-10
 if not mark:
  for ch in 'reident':
   shape=f'<path d="{glyph(ch)}" fill="{color}"'+(' mask="url(#dt)"' if ch=='d' else '')+'/>'
   if ch=='d':shape+=f'<path d="M463 200V115Q463 35 400 68L350 100" fill="none" stroke="{color}" stroke-width="105" stroke-linecap="round" stroke-linejoin="round"/>'
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
