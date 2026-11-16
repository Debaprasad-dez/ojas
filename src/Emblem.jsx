import { useEffect, useRef, useState } from 'react'

// Small screens: the Ojas mark above the hero with an even halo of heat around its rim, a smooth
// thermal gradient that flows slowly (WebGL, ported from the design). .static is the CSS
// fallback when WebGL is unavailable. Only drawn while visible.

const SIZE = 124 // css px: canvas box
const MARK = 56 // css px: the mark it sits behind
const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'
const FS = `precision highp float;
uniform vec2 uRes;uniform float uT,uR;
vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 m289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 perm(vec4 x){return m289(((x*34.)+1.)*x);}
float sn3(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
 vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
 vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
 vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
 i=m289(i);
 vec4 p=perm(perm(perm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
 vec3 ns=.142857142857*D.wyz-D.xzx;
 vec4 j=p-49.*floor(p*ns.z*ns.z);
 vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
 vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
 vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
 vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
 vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
 vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
 vec4 nr=1.79284291400159-.85373472095314*vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3));
 p0*=nr.x;p1*=nr.y;p2*=nr.z;p3*=nr.w;
 vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
 return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
vec3 thermal(float h){
 vec3 c=mix(vec3(.36,.02,.0),vec3(.87,.105,.004),smoothstep(0.,.22,h));
 c=mix(c,vec3(.973,.243,.004),smoothstep(.22,.42,h));
 c=mix(c,vec3(.976,.38,.004),smoothstep(.42,.6,h));
 c=mix(c,vec3(.973,.624,.035),smoothstep(.6,.8,h));
 return mix(c,vec3(.976,.733,.122),smoothstep(.8,1.,h));}
void main(){
 vec2 p=(gl_FragCoord.xy/uRes-.5)*2.;
 float r=length(p),o=max(r-uR,0.),t=uT;
 vec2 dir=p/max(r,.0001);
 float n1=sn3(vec3(dir*1.2,o*3.-t*.3));
 float n2=sn3(vec3(dir*2.5+3.1,o*6.-t*.5));
 float n=n1*.68+n2*.32;
 float wave=sin(o*25.-t*1.9+n1*.9)*smoothstep(.36,.03,o);
 float front=sin(atan(p.y,p.x)-t*.32+n1*.7);
 float breath=.5+.5*sin(t*.9);
 float w=.19*(1.+.24*breath)*(1.+.06*n);
 float a=exp(-pow(o/w,1.45))*smoothstep(uR-.09,uR-.015,r)*smoothstep(.98,.8,r)*(.9+.1*wave);
 float h=clamp(.52-o/.36*1.05+wave*.3+front*.18+n*.1+breath*.04,.15,.72);
 vec3 col=thermal(h);
 a*=.48;
 gl_FragColor=vec4(col*a,a);}`

export default function Emblem() {
  const hostRef = useRef(null)
  const canvasRef = useRef(null)
  const [webgl, setWebgl] = useState(true)

  useEffect(() => {
    const host = hostRef.current
    const c = canvasRef.current
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const U = {}
    let gl = null
    let alive = true
    try {
      gl = c.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' })
      if (!gl) throw 0
      const sh = (type, src) => {
        const x = gl.createShader(type)
        gl.shaderSource(x, src)
        gl.compileShader(x)
        if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw 0
        return x
      }
      const pr = gl.createProgram()
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS))
      gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS))
      gl.linkProgram(pr)
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw 0
      gl.useProgram(pr)
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const loc = gl.getAttribLocation(pr, 'p')
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
      for (const n of ['uRes', 'uT', 'uR']) U[n] = gl.getUniformLocation(pr, n)
    } catch {
      // setState in a microtask: the effect body itself stays free of synchronous state updates
      queueMicrotask(() => alive && setWebgl(false))
      return () => {
        alive = false
      }
    }
    const dpr = Math.min(devicePixelRatio || 1, 3)
    c.width = c.height = Math.round(SIZE * dpr)
    gl.viewport(0, 0, c.width, c.height)
    gl.uniform2f(U.uRes, c.width, c.height)
    gl.uniform1f(U.uR, MARK / SIZE)
    const t0 = Math.random() * 100
    const draw = (now) => {
      gl.uniform1f(U.uT, t0 + now / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    // hidden on desktop and inside a chat: idle-poll instead of drawing
    const shown = () => host.offsetParent !== null && !document.hidden
    let timer = 0
    let raf = 0
    if (reduced) draw(0)
    else {
      const frame = (now) => {
        if (!alive) return
        if (shown()) {
          draw(now || 0)
          raf = requestAnimationFrame(frame)
        } else timer = setTimeout(() => (raf = requestAnimationFrame(frame)), 500)
      }
      frame(0)
    }
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      // no loseContext(): StrictMode remounts on the same canvas and would get the dead context back
    }
  }, [])

  return (
    <span className={'emblem' + (webgl ? '' : ' static')} ref={hostRef} aria-hidden="true">
      <canvas ref={canvasRef} />
      <i />
    </span>
  )
}
