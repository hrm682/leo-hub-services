<?php
// Bandeja de tickets del equipo: ver, responder y cambiar estado.
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
$STATES = ['abierto', 'en_revision', 'en_espera', 'en_proceso', 'resuelto', 'cerrado'];

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && csrf_ok() && !empty($_POST['ticket_id'])) {
    $tid = (string) $_POST['ticket_id'];
    $t = db()->prepare('SELECT id, user_id, ticket_number FROM support_tickets WHERE id = ?');
    $t->execute([$tid]);
    $tk = $t->fetch();
    if ($tk) {
        $act = $_POST['action'] ?? '';
        if ($act === 'reply') {
            $msg = trim((string) ($_POST['message'] ?? ''));
            if ($msg !== '') {
                db()->prepare('INSERT INTO ticket_messages (id, ticket_id, sender_id, message) VALUES (?,?,?,?)')
                    ->execute([uuid4(), $tid, $me['id'], $msg]);
                db()->prepare("UPDATE support_tickets SET status='en_proceso', assigned_to=?, updated_at=NOW() WHERE id=?")->execute([$me['id'], $tid]);
                notify($tk['user_id'], 'ticket', 'Respuesta de soporte', "Tu ticket {$tk['ticket_number']} tiene una nueva respuesta del equipo.");
            }
        } elseif ($act === 'status' && in_array($_POST['status'] ?? '', $STATES, true)) {
            $status = $_POST['status'];
            db()->prepare('UPDATE support_tickets SET status=?, closed_at=' . ($status === 'cerrado' ? 'NOW()' : 'NULL') . ' WHERE id=?')->execute([$status, $tid]);
        }
    }
    header('Location: /api/admin/tickets.php' . (!empty($_POST['ticket_id']) ? '?id=' . urlencode($tid) : ''));
    exit;
}

$viewId = $_GET['id'] ?? null;
$ticket = null;
$messages = [];
$client = null;
if ($viewId) {
    $t = db()->prepare('SELECT * FROM support_tickets WHERE id = ?');
    $t->execute([$viewId]);
    $ticket = $t->fetch() ?: null;
    if ($ticket) {
        $c = db()->prepare('SELECT email, full_name FROM users WHERE id=?');
        $c->execute([$ticket['user_id']]);
        $client = $c->fetch();
        $m = db()->prepare('SELECT sender_id, message, created_at FROM ticket_messages WHERE ticket_id=? ORDER BY created_at');
        $m->execute([$viewId]);
        $messages = $m->fetchAll();
    }
}
$replies = db()->query('SELECT title, content FROM saved_replies ORDER BY title')->fetchAll();
$all = db()->query(
    "SELECT t.id, t.ticket_number, t.subject, t.status, t.category, t.created_at, u.email, u.full_name
     FROM support_tickets t JOIN users u ON u.id=t.user_id
     ORDER BY (t.status NOT IN ('resuelto','cerrado')) DESC, t.created_at DESC LIMIT 300"
)->fetchAll();

header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tickets — Admin Lo Máximo Leo</title>
<style>
  :root{--bg:#0A0F1E;--card:#111828;--line:#243049;--gold:#e8b64c;--muted:#8a97ad;--text:#e9eef7;}
  *{box-sizing:border-box;}body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,Segoe UI,Roboto,sans-serif;}
  .wrap{max-width:900px;margin:0 auto;padding:20px 16px;} a{color:var(--gold);text-decoration:none;} h1{font-size:22px;}
  .nav{display:flex;gap:14px;margin-bottom:8px;font-size:14px;} .nav a{color:var(--muted);} .nav a.on{color:var(--gold);font-weight:700;}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;margin-top:14px;}
  input,select,textarea{width:100%;padding:10px 12px;border-radius:9px;border:1px solid var(--line);background:#0d1424;color:var(--text);}
  label{display:block;font-size:12px;color:var(--muted);margin:8px 0 4px;}
  button{cursor:pointer;border:0;border-radius:9px;padding:9px 14px;font-weight:600;background:linear-gradient(90deg,#e8b64c,#f4d47a);color:#1a1205;}
  button.ghost{background:transparent;border:1px solid var(--line);color:var(--text);}
  table{width:100%;border-collapse:collapse;font-size:14px;} th,td{text-align:left;padding:9px;border-bottom:1px solid var(--line);} th{color:var(--muted);font-size:12px;text-transform:uppercase;}
  .pill{padding:2px 8px;border-radius:999px;font-size:12px;border:1px solid var(--line);} .muted{color:var(--muted);}
  .msg{border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:10px 0;} .msg.client{background:#0d1424;} .msg.team{background:rgba(232,182,76,.06);border-color:rgba(232,182,76,.25);}
  .who{font-size:12px;color:var(--muted);margin-bottom:4px;}
</style></head><body>
<?php include __DIR__ . '/../brand.php'; ?>
<div class="wrap">
  <div class="nav"><a href="index.php">Resumen</a><a href="productos.php">Productos</a><a href="pagos.php">Pagos</a><a href="tickets.php" class="on">Tickets</a></div>

  <?php if ($ticket): ?>
    <p><a href="tickets.php">← Todos los tickets</a></p>
    <h1><?= e($ticket['ticket_number']) ?> · <?= e($ticket['subject']) ?></h1>
    <p class="muted"><?= e($client['full_name'] ?? '') ?> (<?= e($client['email'] ?? '') ?>) · <span class="pill"><?= e($ticket['status']) ?></span></p>
    <div class="card">
      <div class="msg client"><div class="who">Cliente · <?= e(substr((string) $ticket['created_at'], 0, 16)) ?></div><?= nl2br(e($ticket['description'])) ?></div>
      <?php foreach ($messages as $m): $isClient = ($m['sender_id'] === $ticket['user_id']); ?>
        <div class="msg <?= $isClient ? 'client' : 'team' ?>"><div class="who"><?= $isClient ? 'Cliente' : 'Equipo' ?> · <?= e(substr((string) $m['created_at'], 0, 16)) ?></div><?= nl2br(e($m['message'])) ?></div>
      <?php endforeach; ?>
      <form method="post" style="margin-top:14px;">
        <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="reply"><input type="hidden" name="ticket_id" value="<?= e($ticket['id']) ?>">
        <?php if ($replies): ?>
          <label>Plantilla</label>
          <select onchange="if(this.value)document.getElementById('rmsg').value=this.value">
            <option value="">— Insertar respuesta guardada —</option>
            <?php foreach ($replies as $r): ?><option value="<?= e($r['content']) ?>"><?= e($r['title']) ?></option><?php endforeach; ?>
          </select>
        <?php endif; ?>
        <label>Responder al cliente</label><textarea id="rmsg" name="message" rows="4" required></textarea>
        <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;"><button type="submit">Enviar respuesta</button></div>
      </form>
      <form method="post" style="margin-top:10px;display:flex;gap:8px;align-items:center;">
        <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>"><input type="hidden" name="action" value="status"><input type="hidden" name="ticket_id" value="<?= e($ticket['id']) ?>">
        <label style="margin:0;">Estado:</label>
        <select name="status" style="width:auto;"><?php foreach ($STATES as $s): ?><option <?= $ticket['status'] === $s ? 'selected' : '' ?>><?= $s ?></option><?php endforeach; ?></select>
        <button class="ghost" type="submit">Cambiar</button>
      </form>
    </div>
  <?php else: ?>
    <h1>Tickets de soporte</h1>
    <div class="card">
      <?php if (!$all): ?><p class="muted">No hay tickets todavía.</p><?php else: ?>
        <table><thead><tr><th>Ticket</th><th>Cliente</th><th>Asunto</th><th>Categoría</th><th>Estado</th></tr></thead><tbody>
        <?php foreach ($all as $t): ?>
          <tr style="cursor:pointer" onclick="location='tickets.php?id=<?= e($t['id']) ?>'">
            <td class="muted"><?= e($t['ticket_number']) ?></td>
            <td><?= e($t['full_name'] ?: $t['email']) ?></td>
            <td><a href="tickets.php?id=<?= e($t['id']) ?>"><?= e($t['subject']) ?></a></td>
            <td class="muted"><?= e($t['category']) ?></td>
            <td><span class="pill"><?= e($t['status']) ?></span></td>
          </tr>
        <?php endforeach; ?>
        </tbody></table>
      <?php endif; ?>
    </div>
  <?php endif; ?>
</div>
</body></html>
