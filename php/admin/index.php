<?php
// Panel de administración mínimo (PHP puro) para operar en el hosting desde ya:
// login de admin, solicitudes de recuperación, lista de clientes con vigencia
// y reseteo de contraseñas. Seguro: bcrypt, sesión, CSRF, sentencias preparadas.
declare(strict_types=1);
require __DIR__ . '/../lib.php';
start_secure_session();

if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(16));
}
function csrf_ok(): bool
{
    return isset($_POST['csrf']) && hash_equals($_SESSION['csrf'], (string) $_POST['csrf']);
}
function e(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

$flash = null;
$action = $_POST['action'] ?? null;

// --- Login por formulario ---
if ($action === 'login') {
    $email = strtolower(trim((string) ($_POST['email'] ?? '')));
    $pass = (string) ($_POST['password'] ?? '');
    $st = db()->prepare('SELECT id, password_hash FROM users WHERE email = ?');
    $st->execute([$email]);
    $u = $st->fetch();
    if ($u && $u['password_hash'] && password_verify($pass, $u['password_hash'])
        && in_array('admin', user_roles($u['id']), true)) {
        session_regenerate_id(true);
        $_SESSION['user_id'] = $u['id'];
        header('Location: index.php');
        exit;
    }
    $flash = 'Credenciales inválidas o no eres administrador.';
}

$me = current_user();
$isAdmin = $me && in_array('admin', user_roles($me['id']), true);

// --- Acciones que requieren admin ---
if ($isAdmin && $action && csrf_ok()) {
    if ($action === 'logout') {
        $_SESSION = [];
        session_destroy();
        header('Location: index.php');
        exit;
    }
    if ($action === 'reset' && !empty($_POST['user_id'])) {
        $uid = (string) $_POST['user_id'];
        $generic = (string) cfg()['generic_password'];
        $hash = password_hash($generic, PASSWORD_BCRYPT);
        db()->prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?')
            ->execute([$hash, $uid]);
        db()->prepare("UPDATE password_reset_requests SET status='resuelto', resolved_by=?, resolved_at=NOW() WHERE user_id=? AND status='pendiente'")
            ->execute([$me['id'], $uid]);
        notify($uid, 'seguridad', 'Tu contraseña fue restablecida', 'Se te asignó una contraseña temporal; deberás cambiarla al ingresar.');
        $flash = "Contraseña restablecida a la genérica: {$generic}";
    }
}

header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin — Lo Máximo Leo</title>
<style>
  :root { --bg:#0A0F1E; --card:#111828; --line:#243049; --gold:#e8b64c; --muted:#8a97ad; --text:#e9eef7; }
  * { box-sizing:border-box; } body { margin:0; background:var(--bg); color:var(--text); font-family:system-ui,Segoe UI,Roboto,sans-serif; }
  .wrap { max-width:1000px; margin:0 auto; padding:24px 16px; }
  h1 { font-size:22px; } h2 { font-size:16px; color:var(--gold); margin-top:28px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px; }
  input { width:100%; padding:10px 12px; border-radius:9px; border:1px solid var(--line); background:#0d1424; color:var(--text); }
  label { display:block; font-size:13px; color:var(--muted); margin:10px 0 4px; }
  button { cursor:pointer; border:0; border-radius:9px; padding:9px 14px; font-weight:600; background:var(--gold); color:#1a1205; }
  button.ghost { background:transparent; border:1px solid var(--line); color:var(--text); }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th,td { text-align:left; padding:10px; border-bottom:1px solid var(--line); }
  th { color:var(--muted); font-weight:600; font-size:12px; text-transform:uppercase; }
  .flash { background:#14351f; border:1px solid #1f6b3b; color:#9be7b4; padding:10px 12px; border-radius:9px; margin-bottom:16px; }
  .muted { color:var(--muted); } .pill { padding:2px 8px; border-radius:999px; font-size:12px; border:1px solid var(--line); }
  .danger { color:#ff8f8f; } .ok { color:#8be79b; } .warn { color:var(--gold); }
  .top { display:flex; justify-content:space-between; align-items:center; }
</style>
</head>
<body>
<?php include __DIR__ . '/../brand.php'; ?>
<div class="wrap">
<?php if ($flash): ?><div class="flash"><?= e($flash) ?></div><?php endif; ?>

<?php if (!$isAdmin): ?>
  <div class="top"><h1>Lo Máximo Leo — Admin</h1></div>
  <div class="card" style="max-width:380px;margin-top:16px;">
    <form method="post">
      <input type="hidden" name="action" value="login">
      <label>Correo</label>
      <input type="email" name="email" required autofocus>
      <label>Contraseña</label>
      <input type="password" name="password" required>
      <div style="margin-top:16px;"><button type="submit">Ingresar</button></div>
    </form>
  </div>
<?php else: ?>
  <div style="display:flex;gap:14px;margin-bottom:8px;font-size:14px;">
    <a href="index.php" style="color:var(--gold);font-weight:700;text-decoration:none;">Resumen</a>
    <a href="productos.php" style="color:var(--muted);text-decoration:none;">Productos</a>
    <a href="pagos.php" style="color:var(--muted);text-decoration:none;">Pagos</a>
    <a href="tickets.php" style="color:var(--muted);text-decoration:none;">Tickets</a>
  </div>
  <div class="top">
    <h1>Panel de administración</h1>
    <form method="post"><input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>">
      <input type="hidden" name="action" value="logout">
      <button class="ghost" type="submit">Salir (<?= e($me['email']) ?>)</button>
    </form>
  </div>

  <h2>Solicitudes de recuperación pendientes</h2>
  <div class="card">
    <?php
    $reqs = db()->query(
        "SELECT r.id, r.requested_at, u.id AS uid, u.email, u.full_name
         FROM password_reset_requests r JOIN users u ON u.id = r.user_id
         WHERE r.status='pendiente' ORDER BY r.requested_at DESC"
    )->fetchAll();
    ?>
    <?php if (!$reqs): ?>
      <p class="muted">No hay solicitudes pendientes.</p>
    <?php else: ?>
      <table><thead><tr><th>Cliente</th><th>Correo</th><th>Fecha</th><th></th></tr></thead><tbody>
      <?php foreach ($reqs as $r): ?>
        <tr>
          <td><?= e($r['full_name']) ?></td><td><?= e($r['email']) ?></td>
          <td class="muted"><?= e($r['requested_at']) ?></td>
          <td>
            <form method="post" onsubmit="return confirm('¿Resetear la contraseña de este cliente?')">
              <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>">
              <input type="hidden" name="action" value="reset">
              <input type="hidden" name="user_id" value="<?= e($r['uid']) ?>">
              <button type="submit">Resetear</button>
            </form>
          </td>
        </tr>
      <?php endforeach; ?>
      </tbody></table>
    <?php endif; ?>
  </div>

  <h2>Clientes y vigencia</h2>
  <div class="card">
    <?php
    $clients = db()->query(
        "SELECT u.id, u.email, u.full_name, u.must_change_password,
                (SELECT MAX(cs.expiration_date) FROM customer_services cs
                 WHERE cs.user_id = u.id AND cs.status='activo') AS expira
         FROM users u
         JOIN user_roles ur ON ur.user_id = u.id AND ur.role='cliente'
         ORDER BY u.created_at DESC LIMIT 500"
    )->fetchAll();
    ?>
    <?php if (!$clients): ?>
      <p class="muted">Aún no hay clientes. Impórtalos con <code>import-clients.php</code>.</p>
    <?php else: ?>
      <table><thead><tr><th>Cliente</th><th>Correo</th><th>Vence</th><th>Días</th><th>Estado clave</th><th></th></tr></thead><tbody>
      <?php foreach ($clients as $c):
          $days = $c['expira'] ? (int) floor((strtotime($c['expira']) - time()) / 86400) : null;
          $cls = $days === null ? 'muted' : ($days < 0 ? 'danger' : ($days <= 7 ? 'warn' : 'ok'));
      ?>
        <tr>
          <td><?= e($c['full_name']) ?></td>
          <td><?= e($c['email']) ?></td>
          <td class="muted"><?= $c['expira'] ? e(substr($c['expira'], 0, 10)) : '—' ?></td>
          <td class="<?= $cls ?>"><?= $days === null ? '—' : e((string) $days) ?></td>
          <td><?= $c['must_change_password'] ? '<span class="pill warn">cambio pendiente</span>' : '<span class="pill ok">ok</span>' ?></td>
          <td>
            <form method="post" onsubmit="return confirm('¿Resetear la contraseña de este cliente?')">
              <input type="hidden" name="csrf" value="<?= e($_SESSION['csrf']) ?>">
              <input type="hidden" name="action" value="reset">
              <input type="hidden" name="user_id" value="<?= e($c['id']) ?>">
              <button class="ghost" type="submit">Resetear</button>
            </form>
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
