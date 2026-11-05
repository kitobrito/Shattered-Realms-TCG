#!/usr/bin/env python3
# Galaxy spin check for living boards: from a painted spiral galaxy, works out its slant (the
# "tilt" for an echo spin) and which way it must turn so its arms trail behind it.
# Usage: python3 tools/check-galaxy-spin.py <board.jpg> x0 y0 x1 y1
import sys, numpy as np
from PIL import Image, ImageFilter
# usage: galan.py image x0 y0 x1 y1  -> tilt angle, ratio, centre, arm winding direction
path=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6])
img=Image.open(path).convert('L'); im=np.asarray(img).astype(float)
sub=im[y0:y1,x0:x1]; w=np.clip(sub-np.percentile(sub,55),0,None)
ys,xs=np.mgrid[y0:y1,x0:x1]; m=w.sum(); cx=(w*xs).sum()/m; cy=(w*ys).sum()/m
dx=xs-cx; dy=ys-cy
C=np.array([[(w*dx*dx).sum(),(w*dx*dy).sum()],[(w*dx*dy).sum(),(w*dy*dy).sum()]])/m
ev,evec=np.linalg.eigh(C); maj=evec[:,1]; ang=np.degrees(np.arctan2(maj[1],maj[0]))
ang=(ang+90)%180-90; ratio=float(np.sqrt(ev[0]/ev[1]))
R=max(x1-x0,y1-y0)/2; S=6
big=img.crop((cx-R*1.2,cy-R*1.2,cx+R*1.2,cy+R*1.2)).resize((int(R*2.4*S),)*2, Image.LANCZOS)
rot=big.rotate(ang, resample=Image.BICUBIC); W,H=rot.size
st=rot.resize((W,int(H/ratio)),Image.BICUBIC); st=st.crop((0,(st.height-W)//2,W,(st.height+W)//2))
a=np.asarray(st).astype(float); N=a.shape[0]
hp=a-np.asarray(st.filter(ImageFilter.GaussianBlur(N/25))).astype(float)
rs=np.linspace(0.2,0.75,16)*N/2; th=np.linspace(0,2*np.pi,360,endpoint=False); prof=[]
for r in rs: prof.append(hp[(N/2+r*np.sin(th)).astype(int).clip(0,N-1),(N/2+r*np.cos(th)).astype(int).clip(0,N-1)])
sh=[]
for i in range(len(rs)-1):
    cc=np.fft.ifft(np.fft.fft(prof[i]).conj()*np.fft.fft(prof[i+1])).real; k=int(np.argmax(cc)); k=k if k<180 else k-360
    if abs(k)<60: sh.append(k)
med=float(np.median(sh))
print(f"centre [{cx:.0f}, {cy:.0f}] tilt [{ang:.0f}, {ratio:.2f}] winding {med:+.0f} -> spin {'negative (counter-clockwise)' if med>0 else 'positive (clockwise)'}  shifts={sh}")
