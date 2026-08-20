<?php
// Página principal (landing + catálogo) de Lo Máximo Leo — PHP nativo para el
// hosting. Lee los productos de MySQL. Se despliega en la raíz del dominio.
declare(strict_types=1);

$products = [];
$dbError = false;
try {
    require __DIR__ . '/api/lib.php';
    $products = db()->query(
        "SELECT name, slug, short_description, image_url, price, billing_label, is_featured
         FROM products WHERE is_active = 1 ORDER BY is_featured DESC, price ASC"
    )->fetchAll();
} catch (Throwable $e) {
    $dbError = true;
}
function e(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}
function money($n): string
{
    return '$' . number_format((float) $n, 2);
}
$platforms = [
    ['Netflix', '#E50914'], ['Disney+', '#3B82F6'], ['HBO Max', '#A855F7'],
    ['Prime Video', '#22D3EE'], ['Paramount+', '#2563EB'], ['ViX', '#EC4899'],
    ['Spotify', '#1DB954'], ['YouTube', '#FF3B30'], ['DirecTV GO', '#38BDF8'], ['Win+', '#F97316'],
];
?>
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lo Máximo Leo — Cuentas de streaming premium</title>
<meta name="description" content="Netflix, Disney+, HBO Max, Prime Video, Paramount+, ViX, Win+ y más. Cuentas premium con activación rápida y soporte real.">
<link rel="icon" type="image/jpeg" href="/api/assets/leo.jpg">
<style>
  :root { --bg:#0A0F1E; --card:#111828; --line:#243049; --gold:#e8b64c; --muted:#8a97ad; --text:#e9eef7; }
  * { box-sizing:border-box; } html,body { margin:0; }
  body { background:var(--bg); color:var(--text); font-family:system-ui,Segoe UI,Roboto,sans-serif; overflow-x:hidden; }
  a { color:inherit; text-decoration:none; }
  #fx { position:fixed; inset:0; width:100%; height:100%; z-index:0; pointer-events:none; opacity:.5; }
  .wrap { position:relative; z-index:1; max-width:1120px; margin:0 auto; padding:0 20px; }
  header { position:relative; z-index:2; }
  .nav { display:flex; align-items:center; justify-content:space-between; padding:16px 0; }
  .brand { display:flex; align-items:center; gap:10px; }
  .brand img { height:40px; width:40px; border-radius:999px; box-shadow:0 0 0 1px rgba(232,182,76,.5); }
  .brand b { font-size:17px; } .g { background:linear-gradient(90deg,#e8b64c,#f4d47a); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .btn { display:inline-flex; align-items:center; gap:8px; border-radius:10px; padding:10px 18px; font-weight:700; cursor:pointer; border:0; }
  .btn.gold { background:linear-gradient(90deg,#e8b64c,#f4d47a); color:#1a1205; }
  .btn.ghost { background:transparent; border:1px solid var(--line); color:var(--text); }
  .hero { text-align:center; padding:60px 0 30px; }
  .badge { display:inline-flex; gap:8px; align-items:center; border:1px solid rgba(232,182,76,.3); background:rgba(232,182,76,.08); color:var(--gold); padding:6px 14px; border-radius:999px; font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; }
  h1 { font-size:clamp(34px,6vw,60px); line-height:1.05; margin:18px auto; max-width:14ch; font-weight:800; }
  .hero p { color:var(--muted); font-size:18px; max-width:56ch; margin:0 auto 26px; }
  .cta { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
  .chips { display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin:36px auto; max-width:760px; }
  .chip { border:1px solid var(--line); border-radius:999px; padding:6px 14px; font-weight:600; font-size:14px; }
  h2 { font-size:24px; } .sub { color:var(--muted); margin-top:4px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:20px; margin:24px 0 60px; }
  .pcard { background:var(--card); border:1px solid var(--line); border-radius:16px; overflow:hidden; display:flex; flex-direction:column; transition:transform .2s; }
  .pcard:hover { transform:translateY(-4px); }
  .pimg { aspect-ratio:16/9; background:#0d1424; position:relative; overflow:hidden; }
  .pimg img { width:100%; height:100%; object-fit:cover; }
  .feat { position:absolute; left:10px; top:10px; background:rgba(10,15,30,.8); color:var(--gold); border:1px solid rgba(232,182,76,.3); padding:2px 10px; border-radius:999px; font-size:11px; font-weight:700; }
  .pbody { padding:16px; display:flex; flex-direction:column; gap:6px; flex:1; }
  .pbody h3 { margin:0; font-size:16px; } .pbody .d { color:var(--muted); font-size:13px; flex:1; }
  .prow { display:flex; align-items:end; justify-content:space-between; border-top:1px solid var(--line); padding-top:12px; margin-top:6px; }
  .price { font-size:20px; font-weight:800; color:var(--gold); } .price small { color:var(--muted); font-weight:500; font-size:12px; }
  footer { border-top:1px solid var(--line); padding:24px 0; color:var(--muted); font-size:13px; text-align:center; }
  .mentor { position:relative; z-index:1; width:100%; margin:30px 0; padding:52px 0; border-top:1px solid var(--line); border-bottom:1px solid var(--line); background:linear-gradient(180deg, rgba(232,182,76,.07), transparent 70%); }
  .mentor-in { display:flex; align-items:center; gap:40px; }
  .mentor-img { flex:0 0 auto; width:240px; height:240px; border-radius:999px; object-fit:cover; box-shadow:0 0 0 3px rgba(232,182,76,.55), 0 0 70px rgba(232,182,76,.25); }
  .mentor-txt h2 { font-size:clamp(26px,4.4vw,42px); margin:12px 0; line-height:1.1; }
  .mentor-txt p { color:var(--muted); font-size:17px; max-width:54ch; margin:0; }
  @media (max-width:760px){
    .mentor { padding:40px 0; } .mentor-in { flex-direction:column; text-align:center; gap:22px; }
    .mentor-img { width:190px; height:190px; } .mentor-txt p { margin:0 auto; }
    .nav .btn { padding:8px 12px; } .cta { gap:10px; }
  }
</style>
</head>
<body>
<canvas id="fx"></canvas>

<header class="wrap">
  <div class="nav">
    <a class="brand" href="/"><img src="/api/assets/leo.jpg" alt="Lo Máximo Leo"><b>Lo Máximo<span class="g"> Leo</span></b></a>
    <div style="display:flex; gap:10px;">
      <a class="btn ghost" href="/api/portal/">Ingresar</a>
      <a class="btn gold" href="#catalogo">Ver catálogo</a>
    </div>
  </div>
</header>

<section class="hero wrap">
  <span class="badge">Cuentas de streaming premium</span>
  <h1>Cuentas Stream Premium, <span class="g">sin caídas.</span></h1>
  <p>Netflix, Disney+, HBO Max, Prime Video, Paramount+, ViX, Win+ y más — con activación rápida, precios justos y un soporte que sí responde.</p>
  <div class="cta">
    <a class="btn gold" href="#catalogo">Ver catálogo</a>
    <a class="btn ghost" href="/api/portal/">Ya soy cliente</a>
  </div>
  <div class="chips">
    <?php foreach ($platforms as $p): ?>
      <span class="chip" style="color:<?= $p[1] ?>;border-color:<?= $p[1] ?>55;background:<?= $p[1] ?>14;"><?= e($p[0]) ?></span>
    <?php endforeach; ?>
  </div>
</section>

<section class="mentor">
  <div class="wrap mentor-in">
    <img class="mentor-img" src="/api/assets/leo.jpg" alt="Leo, mentor de Lo Máximo Leo">
    <div class="mentor-txt">
      <span class="badge">Tu mentor</span>
      <h2>Leo, la mente detrás de <span class="g">Lo Máximo Leo</span></h2>
      <p>Cuentas de streaming premium, soporte real y experiencia que respalda cada compra. Aquí no estás solo: Leo y su equipo te acompañan en cada paso.</p>
    </div>
  </div>
</section>

<section id="catalogo" class="wrap">
  <h2>Catálogo</h2>
  <p class="sub">Elige tu plataforma favorita, lista para activar.</p>
  <?php if ($dbError): ?>
    <div class="pcard" style="padding:24px;color:var(--muted)">El catálogo se está actualizando. Vuelve en un momento.</div>
  <?php elseif (!$products): ?>
    <div class="pcard" style="padding:24px;color:var(--muted)">Pronto verás aquí nuestras plataformas.</div>
  <?php else: ?>
    <div class="grid">
      <?php foreach ($products as $p): ?>
        <div class="pcard">
          <div class="pimg">
            <?php if ($p['image_url']): ?><img src="<?= e($p['image_url']) ?>" alt="<?= e($p['name']) ?>" loading="lazy"><?php endif; ?>
            <?php if ($p['is_featured']): ?><span class="feat">★ Destacado</span><?php endif; ?>
          </div>
          <div class="pbody">
            <h3><?= e($p['name']) ?></h3>
            <div class="d"><?= e($p['short_description']) ?></div>
            <div class="prow">
              <div class="price"><?= money($p['price']) ?> <small>/ <?= e($p['billing_label']) ?></small></div>
              <a class="btn gold" href="/api/comprar.php?slug=<?= e($p['slug']) ?>" style="padding:8px 14px;">Comprar</a>
            </div>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</section>

<footer>© <?= date('Y') ?> Lo Máximo Leo — Cuentas de streaming con soporte premium · Pagos con Binance</footer>

<script>
(function () {
  var c = document.getElementById('fx'); if (!c) return; var x = c.getContext('2d'), w, h, ps;
  function rz(){ w=c.width=innerWidth; h=c.height=innerHeight; ps=Array.from({length:80},function(){return{x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,r:Math.random()*1.8+.4};}); }
  function draw(){ x.clearRect(0,0,w,h); for(var i=0;i<ps.length;i++){var p=ps[i]; p.x+=p.vx; p.y+=p.vy; if(p.x<0||p.x>w)p.vx*=-1; if(p.y<0||p.y>h)p.vy*=-1;
    for(var j=i+1;j<ps.length;j++){var q=ps[j],dx=p.x-q.x,dy=p.y-q.y,d=dx*dx+dy*dy; if(d<10000){x.strokeStyle='rgba(232,182,76,'+(0.12*(1-d/10000))+')';x.beginPath();x.moveTo(p.x,p.y);x.lineTo(q.x,q.y);x.stroke();}}
    x.beginPath(); x.arc(p.x,p.y,p.r,0,7); x.fillStyle='rgba(232,182,76,.7)'; x.fill(); } requestAnimationFrame(draw); }
  addEventListener('resize', rz); rz(); draw();
})();
</script>
</body>
</html>
