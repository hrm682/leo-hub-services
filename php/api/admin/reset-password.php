<?php
declare(strict_types=1);
require __DIR__ . '/../../lib.php';
require_post();

$admin = require_admin();
$b = json_body();
$userId = (string) ($b['userId'] ?? '');
if ($userId === '') {
    fail('Falta el usuario a resetear');
}

$st = db()->prepare('SELECT id, email, full_name FROM users WHERE id = ?');
$st->execute([$userId]);
$target = $st->fetch();
if (!$target) {
    fail('Usuario no encontrado', 404);
}

// Asigna la contraseña genérica y obliga a cambiarla en el próximo ingreso.
$generic = (string) cfg()['generic_password'];
$hash = password_hash($generic, PASSWORD_BCRYPT);
$up = db()->prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?');
$up->execute([$hash, $userId]);

// Marca como resuelta cualquier solicitud pendiente de ese usuario.
$rr = db()->prepare("UPDATE password_reset_requests SET status = 'resuelto', resolved_by = ?, resolved_at = NOW() WHERE user_id = ? AND status = 'pendiente'");
$rr->execute([$admin['id'], $userId]);

// Bitácora + aviso al cliente.
$al = db()->prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?,?,?,?,?)');
$al->execute([uuid4(), $admin['id'], 'password_reset_by_admin', 'user', $userId]);
notify(
    $userId,
    'seguridad',
    'Tu contraseña fue restablecida',
    'El equipo te asignó una contraseña temporal. Al ingresar deberás crear una nueva.'
);

json_out(['ok' => true, 'genericPassword' => $generic]);
