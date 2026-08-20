<?php
// Soporte del cliente: crear tickets, ver la conversación y responder.
// Incluye el acceso rápido "Necesito código de verificación" (lo atiende una
// persona del equipo desde el panel; NO extrae nada automáticamente).
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

$me = current_user();
if (!$me) {
    header('Location: /api/portal/?next=' . urlencode('/api/soporte.php'));
    exit;
}

$CATS = [
    'acceso' => 'Acceso / verificación',
    'renovacion' => 'Renovación',
    'facturacion' => 'Facturación',
    'cambio_dispositivo' => 'Cambio de dispositivo',
    'consulta' => 'Consulta general',
    'garantia' => 'Garantía',
    'otro' => 'Otro',
];

$flash = null;
$flashType = 'ok';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && csrf_ok()) {
    $act = $_POST['action'] ?? '';
    try {
        if ($act === 'create') {
            $subject = trim((string) ($_POST['subject'] ?? ''));
            $message = trim((string) ($_POST['message'] ?? ''));
            $category = array_key_exists($_POST['category'] ?? '', $CATS) ? $_POST['category'] : 'consulta';
            $csId = ($_POST['service_id'] ?? '') ?: null;
            if (strlen($subject) < 4 || strlen($message) < 5) {
                $flash = 'Escribe un asunto y un mensaje.';
                $flashType = 'err';
            } else {
                $tid = uuid4();
                $tn = 'TK-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
                db()->prepare('INSERT INTO support_tickets (id, user_id, customer_service_id, ticket_number, category, priority, status, subject, description) VALUES (?,?,?,?,?,\'media\',\'abierto\',?,?)')
                    ->execute([$tid, $me['id'], $csId, $tn, $category, $subject, $message]);
                foreach (db()->query("SELECT user_id FROM user_roles WHERE role IN ('admin','soporte')")->fetchAll() as $a) {
                    notify($a['user_id'], 'ticket', 'Nuevo ticket de soporte', "{$me['email']} abrió el ticket {$tn}: {$subject}");
                }
                $flash = "Ticket {$tn} creado. Te responderemos pronto.";
            }
        } elseif ($act === 'reply' && !empty($_POST['ticket_id'])) {
            $t = db()->prepare('SELECT id, status FROM support_tickets WHERE id = ? AND user_id = ?');
            $t->execute([$_POST['ticket_id'], $me['id']]);
            if ($t->fetch()) {
                $msg = trim((string) ($_POST['message'] ?? ''));
                if ($msg !== '') {
                    db()->prepare('INSERT INTO ticket_messages (id, ticket_id, sender_id, message) VALUES (?,?,?,?)')
                        ->execute([uuid4(), $_POST['ticket_id'], $me['id'], $msg]);
                    db()->prepare("UPDATE support_tickets SET status='en_proceso', updated_at=NOW() WHERE id=?")->execute([$_POST['ticket_id']]);
                }
            }
            header('Location: /api/soporte.php?id=' . urlencode((string) $_POST['ticket_id']));
            exit;
        }
    } catch (Throwable $ex) {
        $flash = 'Error: ' . $ex->getMessage();
        $flashType = 'err';
    }
}

// Servicios del cliente (para asociar el ticket).
$svc = db()->prepare("SELECT cs.id, p.name FROM customer_services cs LEFT JOIN products p ON p.id=cs.product_id WHERE cs.user_id=? ORDER BY cs.created_at DESC");
$svc->execute([$me['id']]);
$services = $svc->fetchAll();

$viewId = $_GET['id'] ?? null;
$ticket = null;
$messages = [];
if ($viewId) {
    $t = db()->prepare('SELECT * FROM support_tickets WHERE id = ? AND user_id = ?');
    $t->execute([$viewId, $me['id']]);
    $ticket = $t->fetch() ?: null;
    if ($ticket) {
        $m = db()->prepare('SELECT sender_id, message, created_at FROM ticket_messages WHERE ticket_id=? AND is_internal_note=0 ORDER BY created_at');
        $m->execute([$viewId]);
        $messages = $m->fetchAll();
    }
}
$mine = db()->prepare('SELECT id, ticket_number, subject, status, created_at FROM support_tickets WHERE user_id=? ORDER BY created_at DESC');
$mine->execute([$me['id']]);
$tickets = $mine->fetchAll();

header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Soporte — Lo Máximo Leo</title>
<style>
  :root{--bg:#0A0F1E;--card:#111828;--line:#243049;--gold:#e8b64c;--muted:#8a97ad;--text:#e9eef7;}
  *{box-sizing:border-box;}body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,Segoe UI,Roboto,sans-serif;}
  .wrap{max-width:720px;margin:0 auto;padding:24px 16px;} a{color:var(--gold);text-decoration:none;} h1{font-size:22px;}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;margin-top:14px;}
  input,select,textarea{width:100%;padding:10px 12px;border-radius:9px;border:1px solid var(--line);background:#0d1424;color:var(--text);}
  label{display:block;font-size:13px;color:var(--muted);margin:10px 0 4px;}
  button{cursor:pointer;border:0;border-radius:10px;padding:11px 16px;font-weight:700;background:linear-gradient(90deg,#e8b64c,#f4d47a);color:#1a1205;}
  button.ghost{background:transparent;border:1px solid var(--line);color:var(--text);}
  .flash{padding:10px 12px;border-radius:9px;margin:12px 0;} .flash.ok{background:#14351f;border:1px solid #1f6b3b;color:#9be7b4;} .flash.err{background:#3a1720;border:1px solid #7a2740;color:#ffb0bd;}
  .pill{padding:2px 8px;border-radius:999px;font-size:12px;border:1px solid var(--line);} .muted{color:var(--muted);}
  .msg{border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:10px 0;} .msg.me{background:#0d1424;} .msg.them{background:rgba(232,182,76,.06);border-color:rgba(232,182,76,.25);}
  .who{font-size:12px;color:var(--muted);margin-bottom:4px;}
  .list a{display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid var(--line);color:var(--text);}
  .verif{background:rgba(232,182,76,.1);border:1px solid rgba(232,182,76,.35);border-radius:12px;padding:14px;margin-top:14px;}
</style></head><body>
<?php include __DIR__ . '/brand.php'; ?>
<div class="wrap">
  <p><a href="/api/portal/">← Mis servicios</a></p>
  <?php if ($flash): ?><div class="flash <?= $flashType ?>"><?= e($flash) ?></div><?php endif; ?>

  <?php if ($ticket): ?>
    <h1>Ticket <?= e($ticket['ticket_number']) ?></h1>
    <p class="muted"><?= e($ticket['subject']) ?> · <span class="pill"><?= e($ticket['status']) ?></span></p>
    <div class="card">
      <div class="msg me"><div class="who">Tú · <?= e(substr((string) $ticket['created_at'], 0, 16)) ?></div><?= nl2br(e($ticket['description'])) ?></div>
      <?php foreach ($messages as $m): $mine2 = ($m['sender_id'] === $me['id']); ?>
        <div class="msg <?= $mine2 ? 'me' : 'them' ?>"><div class="who"><?= $mine2 ? 'Tú' : 'Soporte' ?> · <?= e(substr((string) $m['created_at'], 0, 16)) ?></div><?= nl2br(e($m['message'])) ?></div>
      <?php endforeach; ?>
      <?php if (!in_array($ticket['status'], ['cerrado'], true)): ?>
      <form method="post" style="margin-top:14px;">
        <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="reply"><input type="hidden" name="ticket_id" value="<?= e($ticket['id']) ?>">
        <label>Responder</label><textarea name="message" rows="3" required></textarea>
        <div style="margin-top:10px;"><button type="submit">Enviar</button></div>
      </form>
      <?php endif; ?>
    </div>
  <?php else: ?>
    <h1>Soporte</h1>

    <div class="verif">
      <b>¿Netflix te pide un código de verificación?</b>
      <p class="muted" style="margin:6px 0 10px;">Pídelo aquí y un agente te responde en el chat con el código. Elige el servicio y envía.</p>
      <form method="post">
        <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="create">
        <input type="hidden" name="category" value="acceso">
        <input type="hidden" name="subject" value="Solicito código de verificación">
        <label>Servicio</label>
        <select name="service_id"><option value="">— Elige —</option><?php foreach ($services as $s): ?><option value="<?= e($s['id']) ?>"><?= e($s['name'] ?? 'Servicio') ?></option><?php endforeach; ?></select>
        <input type="hidden" name="message" value="Necesito el código de verificación de Netflix para mi servicio.">
        <div style="margin-top:10px;"><button type="submit">Solicitar código</button></div>
      </form>
    </div>

    <div class="card">
      <h2 style="font-size:16px;margin-top:0;">Nuevo ticket</h2>
      <form method="post">
        <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="create">
        <label>Asunto</label><input name="subject" maxlength="140" required>
        <label>Categoría</label><select name="category"><?php foreach ($CATS as $k => $v): ?><option value="<?= $k ?>"><?= e($v) ?></option><?php endforeach; ?></select>
        <label>Servicio (opcional)</label><select name="service_id"><option value="">— Ninguno —</option><?php foreach ($services as $s): ?><option value="<?= e($s['id']) ?>"><?= e($s['name'] ?? 'Servicio') ?></option><?php endforeach; ?></select>
        <label>Mensaje</label><textarea name="message" rows="4" required></textarea>
        <div style="margin-top:12px;"><button type="submit">Crear ticket</button></div>
      </form>
    </div>

    <div class="card list">
      <h2 style="font-size:16px;margin-top:0;">Mis tickets</h2>
      <?php if (!$tickets): ?><p class="muted">Aún no tienes tickets.</p><?php else: ?>
        <?php foreach ($tickets as $t): ?>
          <a href="/api/soporte.php?id=<?= e($t['id']) ?>"><span><?= e($t['ticket_number']) ?> · <?= e($t['subject']) ?></span><span class="pill"><?= e($t['status']) ?></span></a>
        <?php endforeach; ?>
      <?php endif; ?>
    </div>
  <?php endif; ?>
</div>
</body></html>
