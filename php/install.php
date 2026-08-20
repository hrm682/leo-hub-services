<?php
// Instalación: define la contraseña del administrador lemagal1712@gmail.com.
// Ejecútalo UNA vez (por navegador o CLI) y luego BORRA este archivo.
declare(strict_types=1);
require __DIR__ . '/lib.php';

// >>> EDITA esta contraseña antes de ejecutar <<<
$ADMIN_EMAIL = 'lemagal1712@gmail.com';
$ADMIN_PASSWORD = 'LeoAdmin.2026#Max';

$hash = password_hash($ADMIN_PASSWORD, PASSWORD_BCRYPT);

$st = db()->prepare('SELECT id FROM users WHERE email = ?');
$st->execute([$ADMIN_EMAIL]);
$u = $st->fetch();

if ($u) {
    $up = db()->prepare('UPDATE users SET password_hash = ?, must_change_password = 0, email_verified = 1 WHERE id = ?');
    $up->execute([$hash, $u['id']]);
    $uid = $u['id'];
} else {
    $uid = uuid4();
    $ins = db()->prepare('INSERT INTO users (id, email, full_name, password_hash, must_change_password, email_verified) VALUES (?,?,?,?,0,1)');
    $ins->execute([$uid, $ADMIN_EMAIL, 'Leo (Admin)', $hash]);
}

// Asegura el rol admin.
$hasAdmin = db()->prepare("SELECT id FROM user_roles WHERE user_id = ? AND role = 'admin'");
$hasAdmin->execute([$uid]);
if (!$hasAdmin->fetch()) {
    db()->prepare('INSERT INTO user_roles (id, user_id, role) VALUES (?,?,\'admin\')')->execute([uuid4(), $uid]);
}

header('Content-Type: text/plain; charset=utf-8');
echo "OK. Admin listo: {$ADMIN_EMAIL}\n";
echo "Contraseña: {$ADMIN_PASSWORD}\n\n";
echo "IMPORTANTE: borra este archivo install.php ahora por seguridad.\n";
