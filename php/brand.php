<?php
// Marca compartida para las páginas PHP: fondo de partículas doradas + barra
// con el logo de Leo. Se incluye justo después de <body>.
?>
<canvas id="fx" style="position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:.5"></canvas>
<style>
  body { position:relative; }
  .wrap { position:relative; z-index:1; }
  .brandbar { display:flex; align-items:center; gap:10px; padding:18px 16px 0; max-width:1000px; margin:0 auto; }
  .brandbar img { height:38px; width:38px; border-radius:999px; box-shadow:0 0 0 1px rgba(232,182,76,.5); }
  .brandbar b { font-size:15px; letter-spacing:.3px; }
  .brandbar b .g { background:linear-gradient(90deg,#e8b64c,#f4d47a); -webkit-background-clip:text; background-clip:text; color:transparent; }
</style>
<div class="brandbar">
  <img src="../assets/leo.jpg" alt="Lo Máximo Leo">
  <b>Lo Máximo<span class="g"> Leo</span></b>
</div>
<script>
(function () {
  var c = document.getElementById('fx'); if (!c) return;
  var x = c.getContext('2d'), w, h, ps;
  function rz() {
    w = c.width = innerWidth; h = c.height = innerHeight;
    ps = Array.from({ length: 70 }, function () {
      return { x: Math.random()*w, y: Math.random()*h, vx: (Math.random()-.5)*.4, vy: (Math.random()-.5)*.4, r: Math.random()*1.8+.4 };
    });
  }
  function draw() {
    x.clearRect(0, 0, w, h);
    for (var i=0;i<ps.length;i++){ var p=ps[i];
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0||p.x>w)p.vx*=-1; if(p.y<0||p.y>h)p.vy*=-1;
      for(var j=i+1;j<ps.length;j++){ var q=ps[j], dx=p.x-q.x, dy=p.y-q.y, d=dx*dx+dy*dy;
        if(d<9000){ x.strokeStyle='rgba(232,182,76,'+(0.12*(1-d/9000))+')'; x.beginPath(); x.moveTo(p.x,p.y); x.lineTo(q.x,q.y); x.stroke(); } }
      x.beginPath(); x.arc(p.x,p.y,p.r,0,7); x.fillStyle='rgba(232,182,76,.7)'; x.fill();
    }
    requestAnimationFrame(draw);
  }
  addEventListener('resize', rz); rz(); draw();
})();
</script>
