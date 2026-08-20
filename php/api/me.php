<?php
declare(strict_types=1);
require __DIR__ . '/../lib.php';

$u = current_user();
if (!$u) {
    json_out(['user' => null]);
}
json_out([
    'user' => [
        'id' => $u['id'],
        'email' => $u['email'],
        'fullName' => $u['full_name'],
    ],
    'roles' => user_roles($u['id']),
    'mustChangePassword' => (bool) $u['must_change_password'],
]);
