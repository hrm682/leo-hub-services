<?php
// Utilidades compartidas: conexión MySQL (PDO), sesión segura, helpers de auth.
declare(strict_types=1);

function cfg(): array
{
    static $c = null;
    if ($c === null) {
        $path = __DIR__ . '/config.php';
        if (!file_exists($path)) {
            http_response_code(500);
            echo json_encode(['error' => 'Falta config.php (copia config.example.php)']);
            exit;
        }
        $c = require $path;
    }
    return $c;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = cfg();
        $pdo = new PDO(
            "mysql:host={$c['db_host']};dbname={$c['db_name']};charset=utf8mb4",
            $c['db_user'],
            $c['db_pass'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    }
    return $pdo;
}

function uuid4(): string
{
    $d = random_bytes(16);
    $d[6] = chr((ord($d[6]) & 0x0f) | 0x40);
    $d[8] = chr((ord($d[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($d), 4));
}

function start_secure_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = str_starts_with((string) (cfg()['app_origin'] ?? ''), 'https://');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'secure' => $secure,
        'samesite' => 'Lax',
    ]);
    session_name('LEOSESSID');
    session_start();
}

/** Lee el cuerpo JSON de la petición como array. */
function json_body(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '[]', true);
    return is_array($data) ? $data : [];
}

function json_out($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function fail(string $message, int $status = 400): void
{
    json_out(['error' => $message], $status);
}

/** Solo POST. */
function require_post(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        fail('Método no permitido', 405);
    }
}

/** Devuelve el usuario autenticado (por sesión) o null. */
function current_user(): ?array
{
    start_secure_session();
    $id = $_SESSION['user_id'] ?? null;
    if (!$id) {
        return null;
    }
    $st = db()->prepare('SELECT id, email, full_name, must_change_password FROM users WHERE id = ?');
    $st->execute([$id]);
    $u = $st->fetch();
    return $u ?: null;
}

function require_login(): array
{
    $u = current_user();
    if (!$u) {
        fail('No autenticado', 401);
    }
    return $u;
}

function user_roles(string $userId): array
{
    $st = db()->prepare('SELECT role FROM user_roles WHERE user_id = ?');
    $st->execute([$userId]);
    return array_column($st->fetchAll(), 'role');
}

function require_admin(): array
{
    $u = require_login();
    if (!in_array('admin', user_roles($u['id']), true)) {
        fail('Solo administradores', 403);
    }
    return $u;
}

/** Crea una notificación en el panel (para el cliente o para el admin). */
function notify(string $userId, string $type, string $title, string $content): void
{
    $st = db()->prepare(
        'INSERT INTO notifications (id, user_id, type, title, content) VALUES (?,?,?,?,?)'
    );
    $st->execute([uuid4(), $userId, $type, $title, $content]);
}
