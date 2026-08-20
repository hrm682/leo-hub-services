<?php
// Admin de pagos: aprobar activa el servicio (vigencia) y descuenta stock.
declare(strict_types=1);
require __DIR__ . '/../lib.php';
start_secure_session();
if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(16));
}
function e(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}
function csrf_ok(): bool
{
    return isset($_POST['csrf']) && hash_equals($_SESSION['csrf'], (string) $_POST['csrf']);
}

$me = current_user();
if (!$me || !in_array('admin', user_roles($me['id']), true)) {
    header('Location: index.php');
    exit;
}

$flash = null;
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && csrf_ok() && !empty($_POST['pay_id'])) {
    $act = $_POST['action'] ?? '';
    $st = db()->prepare('SELECT pay.id, pay.status, pay.order_id, o.kind, o.user_id, o.order_number FROM payments pay JOIN orders o ON o.id = pay.order_id WHERE pay.id = ?');
    $st->execute([$_POST['pay_id']]);
    $pay = $st->fetch();
    if ($pay && $pay['status'] === 'pendiente') {
        try {
            db()->beginTransaction();
            if ($act === 'approve') {
                $items = db()->prepare('SELECT product_id, customer_service_id, duration_days, quantity FROM order_items WHERE order_id = ?');
                $items->execute([$pay['order_id']]);
                foreach ($items->fetchAll() as $it) {
                    if ($it['customer_service_id']) {
                        $dur = (int) $it['duration_days'];
                        if ($pay['kind'] === 'renovacion') {
                            // Extiende desde el vencimiento actual si sigue vigente; si no, desde hoy.
                            $q = db()->prepare('SELECT expiration_date FROM customer_services WHERE id=?');
                            $q->execute([$it['customer_service_id']]);
                            $exp = $q->fetchColumn();
                            $base = ($exp && strtotime((string) $exp) > time()) ? (string) $exp : date('Y-m-d H:i:s');
                            db()->prepare("UPDATE customer_services SET status='activo', expiration_date=DATE_ADD(?, INTERVAL ? DAY) WHERE id=?")
                                ->execute([$base, $dur, $it['customer_service_id']]);
                        } else {
                            db()->prepare("UPDATE customer_services SET status='activo', start_date=NOW(), expiration_date=DATE_ADD(NOW(), INTERVAL ? DAY) WHERE id=?")
                                ->execute([$dur, $it['customer_service_id']]);
                        }
                    }
                    if ($it['product_id'] && $pay['kind'] !== 'renovacion') {
                        db()->prepare('UPDATE products SET stock = GREATEST(stock - ?, 0) WHERE id = ? AND stock IS NOT NULL')
                            ->execute([(int) $it['quantity'], $it['product_id']]);
                    }
                }
                db()->prepare("UPDATE payments SET status='aprobado', paid_at=NOW(), reviewed_by=? WHERE id=?")->execute([$me['id'], $pay['id']]);
                db()->prepare("UPDATE orders SET status='pagada' WHERE id=?")->execute([$pay['order_id']]);
                notify($pay['user_id'], 'pago', 'Pago aprobado', "Tu pago de la orden {$pay['order_number']} fue aprobado. Tu servicio ya está activo.");
                $flash = 'Pago aprobado y servicio activado.';
            } elseif ($act === 'reject') {
                db()->prepare("UPDATE payments SET status='rechazado', reviewed_by=? WHERE id=?")->execute([$me['id'], $pay['id']]);
                db()->prepare("UPDATE orders SET status='rechazada' WHERE id=?")->execute([$pay['order_id']]);
                if ($pay['kind'] === 'renovacion') {
                    $rv = db()->prepare('SELECT customer_service_id FROM order_items WHERE order_id=?');
                    $rv->execute([$pay['order_id']]);
                    foreach ($rv->fetchAll() as $r2) {
                        if ($r2['customer_service_id']) {
                            db()->prepare("UPDATE customer_services SET status='activo' WHERE id=? AND status='en_renovacion'")->execute([$r2['customer_service_id']]);
                        }
                    }
                }
                notify($pay['user_id'], 'pago', 'Pago rechazado', "No pudimos validar el pago de la orden {$pay['order_number']}. Tu servicio sigue activo. Contáctanos por soporte.");
                $flash = 'Pago rechazado.';
            }
            db()->commit();
        } catch (Throwable $ex) {
            db()->rollBack();
            $flash = 'Error: ' . $ex->getMessage();
        }
    }
}

$pays = db()->query(
    "SELECT pay.id, pay.amount, pay.status, pay.transaction_reference, pay.created_at,
            o.order_number, o.kind, u.email, u.full_name,
            (SELECT GROUP_CONCAT(service_name SEPARATOR ', ') FROM order_items WHERE order_id = o.id) AS servicios
     FROM payments pay JOIN orders o ON o.id = pay.order_id JOIN users u ON u.id = o.user_id
     ORDER BY (pay.status='pendiente') DESC, pay.created_at DESC LIMIT 300"
)->fetchAll();

header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pagos — Admin Lo Máximo Leo</title>
<style>
  :root{--bg:#0A0F1E;--card:#111828;--line:#243049;--gold:#e8b64c;--muted:#8a97ad;--text:#e9eef7;}
  *{box-sizing:border-box;}body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,Segoe UI,Roboto,sans-serif;}
  .wrap{max-width:1080px;margin:0 auto;padding:20px 16px;} a{color:var(--gold);text-decoration:none;} h1{font-size:22px;}
  .nav{display:flex;gap:14px;margin-bottom:8px;font-size:14px;} .nav a{color:var(--muted);} .nav a.on{color:var(--gold);font-weight:700;}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;margin-top:14px;}
  table{width:100%;border-collapse:collapse;font-size:14px;} th,td{text-align:left;padding:9px;border-bottom:1px solid var(--line);}
  th{color:var(--muted);font-size:12px;text-transform:uppercase;}
  button{cursor:pointer;border:0;border-radius:9px;padding:7px 12px;font-weight:600;}
  .ok{background:#1f6b3b;color:#dff7e6;} .no{background:#7a2740;color:#ffd7de;}
  .pill{padding:2px 8px;border-radius:999px;font-size:12px;border:1px solid var(--line);}
  .flash{padding:10px 12px;border-radius:9px;margin:12px 0;background:#14351f;border:1px solid #1f6b3b;color:#9be7b4;}
  .muted{color:var(--muted);} .g{color:var(--gold);}
</style></head><body>
<?php include __DIR__ . '/../brand.php'; ?>
<div class="wrap">
  <div class="nav">
    <a href="reportes.php">Reportes</a>
    <a href="index.php">Resumen</a>
    <a href="productos.php">Productos</a>
    <a href="pagos.php" class="on">Pagos</a>
    <a href="tickets.php">Tickets</a>
  </div>
  <h1>Pagos y órdenes</h1>
  <?php if ($flash): ?><div class="flash"><?= e($flash) ?></div><?php endif; ?>
  <div class="card">
    <?php if (!$pays): ?>
      <p class="muted">Aún no hay órdenes. Cuando un cliente compre, aparecerán aquí para aprobar.</p>
    <?php else: ?>
      <table><thead><tr><th>Orden</th><th>Cliente</th><th>Servicio</th><th>Monto</th><th>Ref.</th><th>Estado</th><th></th></tr></thead><tbody>
      <?php foreach ($pays as $p): ?>
        <tr>
          <td class="g"><?= e($p['order_number']) ?><br><span class="muted" style="font-size:12px"><?= e(substr((string) $p['created_at'], 0, 16)) ?></span></td>
          <td><?= e($p['full_name'] ?: '—') ?><br><span class="muted" style="font-size:12px"><?= e($p['email']) ?></span></td>
          <td><?= e($p['servicios'] ?? '—') ?></td>
          <td>$<?= number_format((float) $p['amount'], 2) ?></td>
          <td class="muted"><?= e($p['transaction_reference'] ?: '—') ?></td>
          <td><span class="pill"><?= e($p['status']) ?></span></td>
          <td style="text-align:right;white-space:nowrap;">
            <?php if ($p['status'] === 'pendiente'): ?>
              <form method="post" style="display:inline" onsubmit="return confirm('¿Aprobar y activar el servicio?')">
                <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="approve"><input type="hidden" name="pay_id" value="<?= e($p['id']) ?>">
                <button class="ok" type="submit">Aprobar</button></form>
              <form method="post" style="display:inline" onsubmit="return confirm('¿Rechazar este pago?')">
                <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="reject"><input type="hidden" name="pay_id" value="<?= e($p['id']) ?>">
                <button class="no" type="submit">Rechazar</button></form>
            <?php else: ?><span class="muted">—</span><?php endif; ?>
          </td>
        </tr>
      <?php endforeach; ?>
      </tbody></table>
    <?php endif; ?>
  </div>
</div>
</body></html>
