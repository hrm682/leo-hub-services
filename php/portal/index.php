<?php
// Portal del cliente (PHP puro) para el hosting: login, cambio de contraseña
// obligatorio al primer ingreso, y "Mis servicios" con los días de vigencia.
// Seguro: bcrypt, sesión, CSRF, escape de salida, sentencias preparadas.
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

$flash = null;
$flashType = 'ok';
$action = $_POST['action'] ?? null;

// Retorno seguro tras el login (solo rutas locales, sin redirección abierta).
$nextRaw = (string) ($_GET['next'] ?? ($_POST['next'] ?? ''));
$nextSafe = (strpos($nextRaw, '/') === 0 && strpos($nextRaw, '//') !== 0
    && preg_match('#^/[A-Za-z0-9/_.%?=&\-]*$#', $nextRaw)) ? $nextRaw : '';

if ($action === 'login') {
    $email = strtolower(trim((string) ($_POST['email'] ?? '')));
    $pass = (string) ($_POST['password'] ?? '');
    $st = db()->prepare('SELECT id, password_hash FROM users WHERE email = ?');
    $st->execute([$email]);
    $u = $st->fetch();
    if ($u && $u['password_hash'] && password_verify($pass, $u['password_hash'])) {
        session_regenerate_id(true);
        $_SESSION['user_id'] = $u['id'];
        header('Location: ' . ($nextSafe !== '' ? $nextSafe : 'index.php'));
        exit;
    }
    $flash = 'Correo o contraseña incorrectos.';
    $flashType = 'err';
}

if ($action === 'request_reset') {
    $email = strtolower(trim((string) ($_POST['email'] ?? '')));
    if ($email !== '') {
        $st = db()->prepare('SELECT id, full_name FROM users WHERE email = ?');
        $st->execute([$email]);
        $u = $st->fetch();
        if ($u) {
            $dup = db()->prepare("SELECT id FROM password_reset_requests WHERE user_id=? AND status='pendiente' LIMIT 1");
            $dup->execute([$u['id']]);
            if (!$dup->fetch()) {
                db()->prepare('INSERT INTO password_reset_requests (id, user_id) VALUES (?,?)')
                    ->execute([uuid4(), $u['id']]);
                foreach (db()->query("SELECT user_id FROM user_roles WHERE role='admin'")->fetchAll() as $a) {
                    notify($a['user_id'], 'seguridad', 'Solicitud de recuperación',
                        "El cliente {$u['full_name']} ({$email}) solicitó recuperar su contraseña.");
                }
            }
        }
    }
    $flash = 'Si el correo existe, el equipo procesará tu solicitud pronto.';
}

$me = current_user();

if ($action === 'change_password' && $me && csrf_ok()) {
    $current = (string) ($_POST['currentPassword'] ?? '');
    $new = (string) ($_POST['newPassword'] ?? '');
    $conf = (string) ($_POST['confirmPassword'] ?? '');
    $row = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
    $row->execute([$me['id']]);
    $r = $row->fetch();
    if (strlen($new) < 8) {
        $flash = 'La nueva contraseña debe tener al menos 8 caracteres.'; $flashType = 'err';
    } elseif ($new !== $conf) {
        $flash = 'Las contraseñas no coinciden.'; $flashType = 'err';
    } elseif (!$r || !$r['password_hash'] || !password_verify($current, $r['password_hash'])) {
        $flash = 'La contraseña actual no es correcta.'; $flashType = 'err';
    } else {
        db()->prepare('UPDATE users SET password_hash=?, must_change_password=0 WHERE id=?')
            ->execute([password_hash($new, PASSWORD_BCRYPT), $me['id']]);
        $flash = 'Contraseña actualizada. ¡Bienvenido!';
        $me = current_user();
    }
}

if ($action === 'logout' && $me && csrf_ok()) {
    $_SESSION = [];
    session_destroy();
    header('Location: index.php');
    exit;
}

header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mi cuenta — Lo Máximo Leo</title>
<style>
  :root { --bg:#0A0F1E; --card:#111828; --line:#243049; --gold:#e8b64c; --muted:#8a97ad; --text:#e9eef7; }
  * { box-sizing:border-box; } body { margin:0; background:var(--bg); color:var(--text); font-family:system-ui,Segoe UI,Roboto,sans-serif; }
  .wrap { max-width:820px; margin:0 auto; padding:28px 16px; }
  h1 { font-size:22px; } h2 { font-size:15px; color:var(--gold); }
  .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px; }
  input { width:100%; padding:10px 12px; border-radius:9px; border:1px solid var(--line); background:#0d1424; color:var(--text); }
  label { display:block; font-size:13px; color:var(--muted); margin:10px 0 4px; }
  button { cursor:pointer; border:0; border-radius:9px; padding:10px 16px; font-weight:600; background:var(--gold); color:#1a1205; }
  button.ghost { background:transparent; border:1px solid var(--line); color:var(--text); }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th,td { text-align:left; padding:10px; border-bottom:1px solid var(--line); }
  th { color:var(--muted); font-weight:600; font-size:12px; text-transform:uppercase; }
  .flash { padding:10px 12px; border-radius:9px; margin-bottom:16px; }
  .flash.ok { background:#14351f; border:1px solid #1f6b3b; color:#9be7b4; }
  .flash.err { background:#3a1720; border:1px solid #7a2740; color:#ffb0bd; }
  .muted { color:var(--muted); } .danger { color:#ff8f8f; } .warn { color:var(--gold); } .ok { color:#8be79b; }
  .pill { padding:2px 8px; border-radius:999px; font-size:12px; border:1px solid var(--line); }
  .top { display:flex; justify-content:space-between; align-items:center; }
  a { color:var(--gold); }
</style>
</head>
<body>
<?php include __DIR__ . '/../brand.php'; ?>
<div class="wrap">
<?php if ($flash): ?><div class="flash <?= $flashType ?>"><?= e($flash) ?></div><?php endif; ?>

<?php if (!$me): ?>
  <h1>Mi cuenta — Lo Máximo Leo</h1>
  <div class="card" style="max-width:400px;">
    <form method="post">
      <input type="hidden" name="action" value="login">
      <input type="hidden" name="next" value="<?= e($nextSafe) ?>">
      <label>Correo</label><input type="email" name="email" required autofocus>
      <label>Contraseña</label><input type="password" name="password" required>
      <div style="margin-top:16px;"><button type="submit">Ingresar</button></div>
    </form>
    <details style="margin-top:16px;">
      <summary class="muted" style="cursor:pointer;">¿Olvidaste tu contraseña?</summary>
      <form method="post" style="margin-top:10px;">
        <input type="hidden" name="action" value="request_reset">
        <label>Tu correo</label><input type="email" name="email" required>
        <div style="margin-top:10px;"><button class="ghost" type="submit">Solicitar recuperación</button></div>
        <p class="muted" style="font-size:12px;">El equipo restablecerá tu contraseña y te dará una temporal.</p>
      </form>
    </details>
  </div>

<?php elseif ((int) $me['must_change_password'] === 1): ?>
  <h1>Crea tu nueva contraseña</h1>
  <p class="muted">Por seguridad, debes cambiar la contraseña temporal antes de continuar.</p>
  <div class="card" style="max-width:420px;">
    <form method="post">
      <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>">
      <input type="hidden" name="action" value="change_password">
      <label>Contraseña actual (temporal)</label><input type="password" name="currentPassword" required>
      <label>Nueva contraseña (mín. 8)</label><input type="password" name="newPassword" required minlength="8">
      <label>Repite la nueva contraseña</label><input type="password" name="confirmPassword" required minlength="8">
      <div style="margin-top:16px;"><button type="submit">Guardar y continuar</button></div>
    </form>
  </div>

<?php else: ?>
  <div class="top">
    <h1>Hola, <?= e($me['full_name'] ?: 'cliente') ?></h1>
    <form method="post"><input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>">
      <input type="hidden" name="action" value="logout"><button class="ghost" type="submit">Salir</button>
    </form>
  </div>
  <h2>Mis servicios</h2>
  <div class="card">
    <?php
    $st = db()->prepare(
        "SELECT cs.id, cs.service_reference, cs.status, cs.expiration_date, p.name AS product
         FROM customer_services cs LEFT JOIN products p ON p.id = cs.product_id
         WHERE cs.user_id = ? ORDER BY cs.created_at DESC"
    );
    $st->execute([$me['id']]);
    $services = $st->fetchAll();
    ?>
    <?php if (!$services): ?>
      <p class="muted">Aún no tienes servicios activos.</p>
    <?php else: ?>
      <table><thead><tr><th>Servicio</th><th>Referencia</th><th>Vence</th><th>Días</th><th>Estado</th><th></th></tr></thead><tbody>
      <?php foreach ($services as $s):
          $days = $s['expiration_date'] ? (int) floor((strtotime($s['expiration_date']) - time()) / 86400) : null;
          $cls = $days === null ? 'muted' : ($days < 0 ? 'danger' : ($days <= 7 ? 'warn' : 'ok'));
      ?>
        <tr>
          <td><?= e($s['product'] ?? 'Servicio') ?></td>
          <td class="muted"><?= e($s['service_reference']) ?></td>
          <td class="muted"><?= $s['expiration_date'] ? e(substr($s['expiration_date'], 0, 10)) : '—' ?></td>
          <td class="<?= $cls ?>"><?= $days === null ? '—' : e((string) $days) ?></td>
          <td><span class="pill"><?= e($s['status']) ?></span></td>
          <td style="text-align:right;">
            <?php if (in_array($s['status'], ['activo', 'en_renovacion'], true)): ?>
              <a href="/api/renovar.php?id=<?= e($s['id']) ?>" style="display:inline-block;background:linear-gradient(90deg,#e8b64c,#f4d47a);color:#1a1205;border-radius:8px;padding:6px 12px;font-weight:700;font-size:13px;">Renovar</a>
            <?php endif; ?>
          </td>
        </tr>
      <?php endforeach; ?>
      </tbody></table>
    <?php endif; ?>
  </div>
<?php endif; ?>
</div>
</body>
</html>
