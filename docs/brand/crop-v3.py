"""Crop approved board as-is with installed Pillow; run from repository root."""
from PIL import Image,ImageDraw
from pathlib import Path
import statistics
src=Image.open('docs/Creident Brand Kit.jpg').convert('RGB');out=Path('public/brand/v3');out.mkdir(parents=True,exist_ok=True)
def extract(box,dark=False):
 im=src.crop(box);rgba=Image.new('RGBA',im.size)
 for y in range(im.height):
  row=[im.getpixel((x,y)) for x in range(im.width)]
  bg=tuple(statistics.median(p[k] for p in row if max(p)<140) for k in range(3)) if dark and any(max(p)<140 for p in row) else (255,255,255)
  for x,p in enumerate(row):
   if dark:a=max((p[k]-bg[k])/max(1,255-bg[k]) for k in range(3))
   else:
    fg=(5,30,65) if p[0]<p[2]*.65 and p[2]<180 else (5,112,250)
    a=max((255-p[k])/max(1,255-fg[k]) for k in range(3))
   a=max(0,min(1,a))
   if a<.09:continue
   rgb=tuple(max(0,min(255,round((p[k]-(1-a)*bg[k])/a))) for k in range(3))
   rgba.putpixel((x,y),(*rgb,round(a*255)))
 return rgba
for name,box,dark in [('wordmark-light',(84,110,580,210),False),('wordmark-dark',(705,110,1195,210),True),('mark',(549,381,600,437),False),('mark-dark',(707,111,798,210),True)]:
 im=extract(box,dark);im=im.crop(im.getbbox());im.resize((im.width*2,im.height*2),Image.Resampling.LANCZOS).save(out/f'{name}.png')
for name,box in [('navy',(75,343,195,464)),('white',(234,343,355,464)),('sapphire',(393,343,514,464))]:
 im=src.crop(box).convert('RGBA');mask=Image.new('L',(im.width*4,im.height*4));ImageDraw.Draw(mask).rounded_rectangle((0,0,mask.width-1,mask.height-1),radius=21*4,fill=255);im.putalpha(mask.resize(im.size,Image.Resampling.LANCZOS));im.resize((im.width*2,im.height*2),Image.Resampling.LANCZOS).save(out/f'icon-{name}.png')
mark=Image.open(out/'mark.png');mark.resize((32,32),Image.Resampling.LANCZOS).save(out/'favicon-32.png');mark.resize((32,32),Image.Resampling.LANCZOS).save(out/'favicon.ico',sizes=[(16,16),(32,32)])
tile=Image.open(out/'icon-navy.png')
for name,size in [('apple-touch-icon.png',180),('icon-192.png',192),('icon-512.png',512)]:tile.resize((size,size),Image.Resampling.LANCZOS).save(out/name)
for n in ['wordmark-light','wordmark-dark','mark','mark-dark']:print(n,Image.open(out/f'{n}.png').size)
