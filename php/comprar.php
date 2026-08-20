<?php
// Flujo de compra: el cliente elige un producto, se crea la orden y el servicio
// queda "pago_pendiente". El admin aprueba el pago y se activa con su vigencia.
declare(strict_types=1);
require __DIR__ . '/lib.php';
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

$slug = (string) ($_GET['slug'] ?? ($_POST['slug'] ?? ''));
$me = current_user();
if (!$me) {
    header('Location: /api/portal/?next=' . urlencode('/api/comprar.php?slug=' . $slug));
    exit;
}

$st = db()->prepare('SELECT * FROM products WHERE slug = ? AND is_active = 1');
$st->execute([$slug]);
$p = $st->fetch();

$done = null;
$err = null;

if ($p && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && csrf_ok() && ($_POST['action'] ?? '') === 'buy') {
    if ($p['stock'] !== null && (int) $p['stock'] <= 0) {
        $err = 'Este servicio está agotado.';
    } else {
        try {
            db()->beginTransaction();
            $orderId = uuid4();
            $csId = uuid4();
            $itemId = uuid4();
            $payId = uuid4();
            $orderNo = 'LH-' . date('Y') . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
            $ref = 'SRV-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
            $total = (float) $p['price'];

            db()->prepare('INSERT INTO orders (id, user_id, order_number, kind, subtotal, total, status) VALUES (?,?,?,?,?,?,\'pendiente\')')
                ->execute([$orderId, $me['id'], $orderNo, 'compra', $total, $total]);
            db()->prepare('INSERT INTO customer_services (id, user_id, product_id, service_reference, status) VALUES (?,?,?,?,\'pago_pendiente\')')
                ->execute([$csId, $me['id'], $p['id'], $ref]);
            db()->prepare('INSERT INTO order_items (id, order_id, product_id, customer_service_id, service_name, unit_price, quantity, duration_days) VALUES (?,?,?,?,?,?,1,?)')
                ->execute([$itemId, $orderId, $p['id'], $csId, $p['name'], $total, (int) $p['duration_days']]);
            db()->prepare('INSERT INTO payments (id, order_id, provider, amount, currency, status, transaction_reference) VALUES (?,?,\'binance_manual\',?,\'USD\',\'pendiente\',?)')
                ->execute([$payId, $orderId, $total, trim((string) ($_POST['reference'] ?? '')) ?: null]);

            foreach (db()->query("SELECT user_id FROM user_roles WHERE role='admin'")->fetchAll() as $a) {
                notify($a['user_id'], 'orden', 'Nueva compra', "{$me['email']} compró {$p['name']} (orden {$orderNo}). Aprueba el pago para activarla.");
            }
            db()->commit();
            $done = ['order' => $orderNo, 'total' => $total];
        } catch (Throwable $ex) {
            db()->rollBack();
            $err = 'No se pudo crear la orden: ' . $ex->getMessage();
        }
    }
}

header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Comprar — Lo Máximo Leo</title>
<style>
  :root{--bg:#0A0F1E;--card:#111828;--line:#243049;--gold:#e8b64c;--muted:#8a97ad;--text:#e9eef7;}
  *{box-sizing:border-box;}body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,Segoe UI,Roboto,sans-serif;}
  .wrap{max-width:560px;margin:0 auto;padding:28px 16px;}
  .card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px;}
  a{color:var(--gold);text-decoration:none;} h1{font-size:22px;}
  input{width:100%;padding:10px 12px;border-radius:9px;border:1px solid var(--line);background:#0d1424;color:var(--text);}
  label{display:block;font-size:13px;color:var(--muted);margin:12px 0 4px;}
  button{cursor:pointer;border:0;border-radius:10px;padding:12px 18px;font-weight:700;background:linear-gradient(90deg,#e8b64c,#f4d47a);color:#1a1205;width:100%;}
  .price{font-size:30px;font-weight:800;color:var(--gold);} .muted{color:var(--muted);}
  .flash{padding:10px 12px;border-radius:9px;margin-bottom:14px;background:#3a1720;border:1px solid #7a2740;color:#ffb0bd;}
  .ok{background:#14351f;border:1px solid #1f6b3b;color:#9be7b4;}
</style></head><body>
<?php include __DIR__ . '/brand.php'; ?>
<div class="wrap">
  <p><a href="/">← Volver a la tienda</a></p>
  <?php if (!$p): ?>
    <div class="card"><h1>Producto no encontrado</h1><p class="muted">Ese servicio ya no está disponible.</p></div>
  <?php elseif ($done): ?>
    <div class="card">
      <div class="flash ok"><b>¡Orden creada!</b> Número <?= e($done['order']) ?>.</div>
      <h1>Realiza tu pago</h1>
      <p class="muted">Monto a pagar:</p>
      <div class="price">$<?= number_format($done['total'], 2) ?> <span class="muted" style="font-size:14px">USD</span></div>
      <p style="margin-top:14px;">Paga por <b>Binance</b> y avísale al equipo. En cuanto confirmen el pago, tu servicio se <b>activa automáticamente</b> con su vigencia y lo verás en <a href="/api/portal/">Mis servicios</a>.</p>
    </div>
  <?php else: ?>
    <div class="card">
      <h1>Comprar <?= e($p['name']) ?></h1>
      <p class="muted"><?= e($p['short_description']) ?></p>
      <div class="price" style="margin:14px 0;">$<?= number_format((float) $p['price'], 2) ?> <span class="muted" style="font-size:14px">/ <?= e($p['billing_label']) ?></span></div>
      <p class="muted">Vigencia: <?= (int) $p['duration_days'] ?> días desde la activación.</p>
      <?php if ($err): ?><div class="flash"><?= e($err) ?></div><?php endif; ?>
      <?php if ($p['stock'] !== null && (int) $p['stock'] <= 0): ?>
        <div class="flash">Este servicio está agotado por ahora.</div>
      <?php else: ?>
        <form method="post">
          <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>">
          <input type="hidden" name="action" value="buy">
          <input type="hidden" name="slug" value="<?= e($p['slug']) ?>">
          <label>Referencia de tu pago (opcional)</label>
          <input name="reference" placeholder="ID de la transacción en Binance">
          <div style="margin-top:16px;"><button type="submit">Confirmar compra</button></div>
        </form>
      <?php endif; ?>
    </div>
  <?php endif; ?>
</div>
</body></html>
