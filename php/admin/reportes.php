<?php
// Dashboard de reportes: ingresos, órdenes, servicios, vencimientos, top productos.
declare(strict_types=1);
require __DIR__ . '/../lib.php';
start_secure_session();
function e(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}
function money($n): string
{
    return '$' . number_format((float) $n, 2);
}

$me = current_user();
if (!$me || !in_array('admin', user_roles($me['id']), true)) {
    header('Location: index.php');
    exit;
}

$one = fn(string $sql, array $p = []) => (function () use ($sql, $p) {
    $st = db()->prepare($sql);
    $st->execute($p);
    return $st->fetchColumn();
})();

$ingresosTot = (float) ($one("SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='aprobado'") ?: 0);
$ingresosMes = (float) ($one("SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='aprobado' AND DATE_FORMAT(COALESCE(paid_at,created_at),'%Y-%m')=DATE_FORMAT(CURDATE(),'%Y-%m')") ?: 0);
$pagosPend = (int) ($one("SELECT COUNT(*) FROM payments WHERE status='pendiente'") ?: 0);
$activos = (int) ($one("SELECT COUNT(*) FROM customer_services WHERE status='activo'") ?: 0);
$clientes = (int) ($one("SELECT COUNT(DISTINCT user_id) FROM user_roles WHERE role='cliente'") ?: 0);
$porVencer = (int) ($one("SELECT COUNT(*) FROM customer_services WHERE status='activo' AND expiration_date IS NOT NULL AND expiration_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)") ?: 0);
$vencidos = (int) ($one("SELECT COUNT(*) FROM customer_services WHERE status='activo' AND expiration_date IS NOT NULL AND expiration_date < NOW()") ?: 0);
$ticketsAb = (int) ($one("SELECT COUNT(*) FROM support_tickets WHERE status NOT IN ('resuelto','cerrado')") ?: 0);

// Ingresos por mes (últimos 6)
$rows = db()->query("SELECT DATE_FORMAT(COALESCE(paid_at,created_at),'%Y-%m') ym, SUM(amount) total FROM payments WHERE status='aprobado' AND COALESCE(paid_at,created_at) >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH) GROUP BY ym")->fetchAll();
$byMonth = [];
foreach ($rows as $r) {
    $byMonth[$r['ym']] = (float) $r['total'];
}
$months = [];
for ($i = 5; $i >= 0; $i--) {
    $k = date('Y-m', strtotime("-$i month"));
    $months[] = ['k' => $k, 'label' => date('M', strtotime($k . '-01')), 'total' => $byMonth[$k] ?? 0];
}
$maxMonth = max(1, ...array_map(fn($m) => $m['total'], $months));

$top = db()->query("SELECT oi.service_name, SUM(oi.quantity) qty, SUM(oi.unit_price*oi.quantity) ingresos FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.status='pagada' GROUP BY oi.service_name ORDER BY ingresos DESC LIMIT 5")->fetchAll();
$recent = db()->query("SELECT o.order_number, o.kind, o.status, o.total, o.created_at, u.email FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 8")->fetchAll();

header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reportes — Admin Lo Máximo Leo</title>
<style>
  :root{--bg:#0A0F1E;--card:#111828;--line:#243049;--gold:#e8b64c;--muted:#8a97ad;--text:#e9eef7;}
  *{box-sizing:border-box;}body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,Segoe UI,Roboto,sans-serif;}
  .wrap{max-width:1080px;margin:0 auto;padding:20px 16px;} a{color:var(--gold);text-decoration:none;} h1{font-size:22px;}
  .nav{display:flex;gap:14px;margin-bottom:8px;font-size:14px;} .nav a{color:var(--muted);} .nav a.on{color:var(--gold);font-weight:700;}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;margin-top:14px;}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;}
  .stat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;}
  .stat .n{font-size:26px;font-weight:800;} .stat .l{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;}
  .gold{color:var(--gold);} .warn{color:var(--gold);} .danger{color:#ff8f8f;} .ok{color:#8be79b;} .muted{color:var(--muted);}
  table{width:100%;border-collapse:collapse;font-size:14px;} th,td{text-align:left;padding:9px;border-bottom:1px solid var(--line);} th{color:var(--muted);font-size:12px;text-transform:uppercase;}
  .bars{display:flex;align-items:end;gap:14px;height:180px;padding-top:10px;}
  .bar{flex:1;display:flex;flex-direction:column;justify-content:end;align-items:center;gap:6px;height:100%;}
  .bar .fill{width:70%;background:linear-gradient(180deg,#f4d47a,#e8b64c);border-radius:6px 6px 0 0;min-height:3px;}
  .bar .v{font-size:11px;color:var(--muted);} .bar .m{font-size:12px;color:var(--muted);}
  .pill{padding:2px 8px;border-radius:999px;font-size:12px;border:1px solid var(--line);}
</style></head><body>
<?php include __DIR__ . '/../brand.php'; ?>
<div class="wrap">
  <div class="nav">
    <a href="reportes.php" class="on">Reportes</a>
    <a href="index.php">Resumen</a>
    <a href="productos.php">Productos</a>
    <a href="pagos.php">Pagos</a>
    <a href="tickets.php">Tickets</a>
  </div>
  <h1>Reportes de ventas</h1>

  <div class="grid" style="margin-top:14px;">
    <div class="stat"><div class="l">Ingresos totales</div><div class="n gold"><?= money($ingresosTot) ?></div></div>
    <div class="stat"><div class="l">Ingresos del mes</div><div class="n gold"><?= money($ingresosMes) ?></div></div>
    <div class="stat"><div class="l">Pagos pendientes</div><div class="n <?= $pagosPend ? 'warn' : '' ?>"><?= $pagosPend ?></div></div>
    <div class="stat"><div class="l">Servicios activos</div><div class="n ok"><?= $activos ?></div></div>
    <div class="stat"><div class="l">Clientes</div><div class="n"><?= $clientes ?></div></div>
    <div class="stat"><div class="l">Vencen en 7 días</div><div class="n <?= $porVencer ? 'warn' : '' ?>"><?= $porVencer ?></div></div>
    <div class="stat"><div class="l">Vencidos</div><div class="n <?= $vencidos ? 'danger' : '' ?>"><?= $vencidos ?></div></div>
    <div class="stat"><div class="l">Tickets abiertos</div><div class="n <?= $ticketsAb ? 'warn' : '' ?>"><?= $ticketsAb ?></div></div>
  </div>

  <div class="card">
    <h2 style="font-size:16px;margin-top:0;">Ingresos por mes</h2>
    <div class="bars">
      <?php foreach ($months as $m): $h = (int) round(($m['total'] / $maxMonth) * 100); ?>
        <div class="bar">
          <div class="v"><?= $m['total'] > 0 ? money($m['total']) : '' ?></div>
          <div class="fill" style="height:<?= max(2, $h) ?>%"></div>
          <div class="m"><?= e(ucfirst($m['label'])) ?></div>
        </div>
      <?php endforeach; ?>
    </div>
  </div>

  <div class="card">
    <h2 style="font-size:16px;margin-top:0;">Top productos (pagados)</h2>
    <?php if (!$top): ?><p class="muted">Aún no hay ventas pagadas.</p><?php else: ?>
      <table><thead><tr><th>Servicio</th><th>Unidades</th><th>Ingresos</th></tr></thead><tbody>
      <?php foreach ($top as $t): ?>
        <tr><td><?= e($t['service_name']) ?></td><td><?= (int) $t['qty'] ?></td><td class="gold"><?= money($t['ingresos']) ?></td></tr>
      <?php endforeach; ?>
      </tbody></table>
    <?php endif; ?>
  </div>

  <div class="card">
    <h2 style="font-size:16px;margin-top:0;">Últimas órdenes</h2>
    <?php if (!$recent): ?><p class="muted">Sin órdenes todavía.</p><?php else: ?>
      <table><thead><tr><th>Orden</th><th>Cliente</th><th>Tipo</th><th>Total</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>
      <?php foreach ($recent as $o): ?>
        <tr><td class="gold"><?= e($o['order_number']) ?></td><td><?= e($o['email']) ?></td><td class="muted"><?= e($o['kind']) ?></td><td><?= money($o['total']) ?></td><td><span class="pill"><?= e($o['status']) ?></span></td><td class="muted"><?= e(substr((string) $o['created_at'], 0, 16)) ?></td></tr>
      <?php endforeach; ?>
      </tbody></table>
    <?php endif; ?>
  </div>
</div>
</body></html>
