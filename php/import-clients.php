<?php
// Importa tus clientes existentes desde un CSV, con su vigencia (días restantes).
// Cada cliente recibe la CONTRASEÑA GENÉRICA (config) y se le obliga a cambiarla.
//
// Uso (CLI):   php import-clients.php clients.csv
// Formato CSV (con encabezado): email,full_name,phone,product_slug,remaining_days
//   ejemplo:   juan@correo.com,Juan Pérez,3001234567,netflix-premium,12
declare(strict_types=1);
require __DIR__ . '/lib.php';

if (PHP_SAPI !== 'cli') {
    fail('Ejecuta este script por consola (CLI).', 403);
}

$file = $argv[1] ?? (__DIR__ . '/clients.csv');
if (!file_exists($file)) {
    fwrite(STDERR, "No encuentro el CSV: {$file}\n");
    exit(1);
}

$generic = (string) cfg()['generic_password'];
$genericHash = password_hash($generic, PASSWORD_BCRYPT);

$fh = fopen($file, 'r');
$header = fgetcsv($fh); // descarta encabezado
$created = 0;
$services = 0;
$skipped = 0;
$line = 1;

while (($row = fgetcsv($fh)) !== false) {
    $line++;
    [$email, $fullName, $phone, $slug, $days] = array_pad($row, 5, '');
    $email = strtolower(trim((string) $email));
    if ($email === '') {
        continue;
    }
    $days = (int) $days;

    try {
        db()->beginTransaction();

        // Usuario (crea si no existe).
        $st = db()->prepare('SELECT id FROM users WHERE email = ?');
        $st->execute([$email]);
        $u = $st->fetch();
        if ($u) {
            $userId = $u['id'];
        } else {
            $userId = uuid4();
            db()->prepare('INSERT INTO users (id, email, full_name, phone, password_hash, must_change_password, email_verified) VALUES (?,?,?,?,?,1,1)')
                ->execute([$userId, $email, trim((string) $fullName), trim((string) $phone) ?: null, $genericHash]);
            db()->prepare('INSERT INTO user_roles (id, user_id, role) VALUES (?,?,\'cliente\')')
                ->execute([uuid4(), $userId]);
            $created++;
        }

        // Servicio con su vigencia (si hay producto y días).
        $slug = trim((string) $slug);
        if ($slug !== '' && $days > 0) {
            $p = db()->prepare('SELECT id, name FROM products WHERE slug = ?');
            $p->execute([$slug]);
            $prod = $p->fetch();
            if ($prod) {
                $ref = 'SRV-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
                db()->prepare(
                    'INSERT INTO customer_services (id, user_id, product_id, service_reference, status, start_date, expiration_date)
                     VALUES (?,?,?,?,\'activo\', NOW(), DATE_ADD(NOW(), INTERVAL ? DAY))'
                )->execute([uuid4(), $userId, $prod['id'], $ref, $days]);
                $services++;
            } else {
                fwrite(STDERR, "Línea {$line}: producto '{$slug}' no existe, servicio omitido.\n");
            }
        }

        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        $skipped++;
        fwrite(STDERR, "Línea {$line} ({$email}): {$e->getMessage()}\n");
    }
}
fclose($fh);

echo "Listo. Usuarios nuevos: {$created} | Servicios creados: {$services} | Errores: {$skipped}\n";
echo "Contraseña genérica asignada: {$generic} (se pedirá cambio al primer ingreso).\n";
