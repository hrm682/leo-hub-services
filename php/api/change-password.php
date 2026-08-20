<?php
declare(strict_types=1);
require __DIR__ . '/../lib.php';
require_post();

$u = require_login();
$b = json_body();
$current = (string) ($b['currentPassword'] ?? '');
$new = (string) ($b['newPassword'] ?? '');

if (strlen($new) < 8) {
    fail('La nueva contraseña debe tener al menos 8 caracteres');
}

$st = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
$st->execute([$u['id']]);
$row = $st->fetch();
if (!$row || !$row['password_hash'] || !password_verify($current, $row['password_hash'])) {
    fail('La contraseña actual no es correcta', 400);
}

$hash = password_hash($new, PASSWORD_BCRYPT);
$up = db()->prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?');
$up->execute([$hash, $u['id']]);

json_out(['ok' => true]);
