<?php
declare(strict_types=1);
require __DIR__ . '/../lib.php';
require_post();

$b = json_body();
$email = strtolower(trim((string) ($b['email'] ?? '')));

// Respuesta siempre positiva (no revela si el correo existe).
$ok = ['ok' => true, 'message' => 'Si el correo existe, el equipo procesará tu solicitud.'];

if ($email === '') {
    json_out($ok);
}

$st = db()->prepare('SELECT id, full_name FROM users WHERE email = ?');
$st->execute([$email]);
$u = $st->fetch();
if (!$u) {
    json_out($ok);
}

// Evita duplicar solicitudes pendientes.
$dup = db()->prepare("SELECT id FROM password_reset_requests WHERE user_id = ? AND status = 'pendiente' LIMIT 1");
$dup->execute([$u['id']]);
if (!$dup->fetch()) {
    $ins = db()->prepare('INSERT INTO password_reset_requests (id, user_id) VALUES (?, ?)');
    $ins->execute([uuid4(), $u['id']]);

    // Notifica a todos los administradores en su panel.
    $admins = db()->query("SELECT user_id FROM user_roles WHERE role = 'admin'")->fetchAll();
    foreach ($admins as $a) {
        notify(
            $a['user_id'],
            'seguridad',
            'Solicitud de recuperación de contraseña',
            "El cliente {$u['full_name']} ({$email}) solicitó recuperar su contraseña. Resetéala desde el panel."
        );
    }
}

json_out($ok);
