<?php
declare(strict_types=1);
require __DIR__ . '/../lib.php';
require_post();

$b = json_body();
$email = strtolower(trim((string) ($b['email'] ?? '')));
$password = (string) ($b['password'] ?? '');
if ($email === '' || $password === '') {
    fail('Correo y contraseña son obligatorios');
}

$st = db()->prepare('SELECT id, email, full_name, password_hash, must_change_password FROM users WHERE email = ?');
$st->execute([$email]);
$u = $st->fetch();

// Mensaje genérico para no revelar si el correo existe.
if (!$u || !$u['password_hash'] || !password_verify($password, $u['password_hash'])) {
    fail('Correo o contraseña incorrectos', 401);
}

start_secure_session();
session_regenerate_id(true);
$_SESSION['user_id'] = $u['id'];

json_out([
    'user' => [
        'id' => $u['id'],
        'email' => $u['email'],
        'fullName' => $u['full_name'],
    ],
    'roles' => user_roles($u['id']),
    'mustChangePassword' => (bool) $u['must_change_password'],
]);
