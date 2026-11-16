import { useEffect, useRef } from 'react'

// The living field: a low sun of ember light behind the work (WebGL, ported from the design).
// mode 0 welcome / 1 chat, energy 0 idle → 1 thinking, rise 1 → 1.03 while typing.
// Falls back to a CSS gradient (html.no-gl) where WebGL is unavailable.

const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'
const FS = `precision highp float;
uniform vec2 uRes;uniform float uT,uMode,uEnergy,uRise,uAx;uniform vec2 uMouse;
vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}vec2 m289(vec2 x){return x-floor(x*(1./289.))*289.;}
vec3 perm(vec3 x){return m289(((x*34.)+1.)*x);}
float sn(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
 vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
 vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=m289(i);
 vec3 p=perm(perm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
 vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;
 vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;
 m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
 vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(m,g);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*sn(p);p=p*2.03+vec2(17.3,9.1);a*=.5;}return s;}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
 vec2 uv=gl_FragCoord.xy/uRes;float asp=uRes.x/uRes.y;
 vec2 p=vec2((uv.x-uAx)*asp,uv.y);
 vec2 q=vec2(fbm(p*.7+vec2(0.,uT*.028)),fbm(p*.7+vec2(4.7,-uT*.024)));
 vec2 w=p+.5*q;
 float n=.5+.5*fbm(w*.95+vec2(uT*.016,-uT*.04));
 float wisp=.5+.5*fbm(w*vec2(1.5,2.3)-vec2(0.,uT*.07));
 float cy=mix(-.58,-.84,uMode)+.09*uEnergy;cy=mix(-1.7,cy,uRise);
 vec2 d=(w-vec2(0.,cy))/vec2(1.02,.70);
 float dist=length(d);
 float I=smoothstep(1.66,.74,dist);
 I*=mix(.5,1.12,n)*mix(.86,1.1,wisp);
 I=clamp(I,0.,1.04);
 float s=mix(.42,.37,uMode)+.22*uEnergy;
 vec3 red=vec3(.87,.105,.004),org=vec3(.976,.38,.004),amb=vec3(.973,.624,.035),yel=vec3(.976,.733,.122);
 vec3 col=mix(red*.8,mix(red,org,.55),smoothstep(.05,.45,I));
 col=mix(col,org,smoothstep(.4,.75,I));
 col=mix(col,amb,smoothstep(.82,1.04,I));
 vec3 base=vec3(.051,.039,.031);
 vec3 o=base+col*pow(I,1.7)*s;
 float I2=exp(-dot((uv-vec2(1.02,1.08))*vec2(asp,1.),(uv-vec2(1.02,1.08))*vec2(asp,1.))*1.5)*(.35+.65*n);
 o+=red*I2*mix(.075,.11,uMode)*uRise;
 vec2 md=(uv-uMouse)*vec2(asp,1.);
 o+=org*exp(-dot(md,md)*9.)*.028*(.4+.6*wisp)*uRise;
 o*=1.-.22*smoothstep(.55,1.15,uv.y);
 o+=(hash(gl_FragCoord.xy+fract(uT)*61.)-.5)/160.;
 gl_FragColor=vec4(o,1.);}`

export default function Field({ mode, energy, rise, anchorRef }) {
  const canvasRef = useRef(null)
  const target = useRef({ mode, energy, rise })
  const kick = useRef(() => {}) // reduced motion: redraw once when the targets change

  useEffect(() => {
    target.current = { mode, energy, rise }
    kick.current()
  }, [mode, energy, rise])

  useEffect(() => {
    const c = canvasRef.current
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const cur = { mode: 0, energy: 0, rise: 0, ax: 0.58, mx: 0.5, my: 0.3 }
    const mouse = { x: 0.5, y: 0.3 }
    const U = {}
    let gl = null
    let t = 0
    let last = 0
    let raf = 0
    let scale = 0.5
    let slow = 0

    const sh = (type, src) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s))
      return s
    }
    const size = () => {
      c.width = Math.max(2, Math.round(innerWidth * scale))
      c.height = Math.max(2, Math.round(innerHeight * scale))
      gl.viewport(0, 0, c.width, c.height)
    }
    // the sun sits under the centre of the chat column
    const anchor = () => {
      const r = anchorRef.current?.getBoundingClientRect()
      return r ? (r.left + r.width / 2) / innerWidth : 0.58
    }
    const draw = () => {
      gl.uniform2f(U.uRes, c.width, c.height)
      gl.uniform1f(U.uT, t)
      gl.uniform1f(U.uMode, cur.mode)
      gl.uniform1f(U.uEnergy, cur.energy)
      gl.uniform1f(U.uRise, cur.rise)
      gl.uniform1f(U.uAx, cur.ax)
      gl.uniform2f(U.uMouse, cur.mx, 1 - cur.my)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    const frame = (now) => {
      const raw = (now - last) / 1000 || 0
      const dt = Math.min(0.05, raw)
      last = now
      // a struggling GPU drops the render scale rather than the frame rate
      slow = raw > 0.034 ? slow + 1 : Math.max(0, slow - 2)
      if (slow > 45 && scale > 0.2) {
        scale *= 0.7
        slow = 0
        size()
      }
      const k = (rate) => 1 - Math.exp(-dt * rate)
      const tgt = target.current
      cur.mode += (tgt.mode - cur.mode) * k(1.5)
      cur.energy += (tgt.energy - cur.energy) * k(2.2)
      cur.rise += (tgt.rise - cur.rise) * k(1.1)
      cur.ax += (anchor() - cur.ax) * k(3)
      cur.mx += (mouse.x - cur.mx) * k(2)
      cur.my += (mouse.y - cur.my) * k(2)
      t += dt * (1 + 2.2 * cur.energy)
      draw()
      raf = requestAnimationFrame(frame)
    }
    const still = () => {
      Object.assign(cur, target.current, { ax: anchor() })
      t = 40
      draw()
    }

    const onResize = () => {
      size()
      if (reduced) still()
    }
    const onMove = (e) => {
      mouse.x = e.clientX / innerWidth
      mouse.y = e.clientY / innerHeight
    }
    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden && !reduced) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }

    try {
      gl = c.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
      if (!gl) throw new Error('no webgl')
      const pr = gl.createProgram()
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS))
      gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS))
      gl.linkProgram(pr)
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('link')
      gl.useProgram(pr)
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const loc = gl.getAttribLocation(pr, 'p')
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
      for (const n of ['uRes', 'uT', 'uMode', 'uEnergy', 'uRise', 'uAx', 'uMouse']) U[n] = gl.getUniformLocation(pr, n)
      size()
      t = Math.random() * 60
    } catch {
      document.documentElement.classList.add('no-gl')
      return
    }

    addEventListener('resize', onResize)
    addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    if (reduced) {
      kick.current = () => requestAnimationFrame(still)
      still()
    } else {
      cur.ax = anchor()
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', onResize)
      removeEventListener('pointermove', onMove)
      document.removeEventListener('visibilitychange', onVisibility)
      kick.current = () => {}
      // no loseContext(): StrictMode remounts on the same canvas, and getContext would hand back
      // the dead context (→ no-gl). The context goes with the canvas when it unmounts for real.
    }
  }, [anchorRef])

  return <canvas className="field" ref={canvasRef} aria-hidden="true" />
}
