<?php
// Copia este archivo a config.php y completa con los datos de tu MySQL de cPanel.
// NO subas config.php al repositorio (tiene credenciales).
return [
    'db_host' => 'localhost',
    'db_name' => 'TU_BASE_DE_DATOS',
    'db_user' => 'TU_USUARIO_MYSQL',
    'db_pass' => 'TU_PASSWORD_MYSQL',

    // Contraseña genérica que se asigna a los clientes importados / reseteados.
    // El sistema les obligará a cambiarla al primer ingreso.
    'generic_password' => 'LoMaximoLeo2026',

    // Origen del sitio (para cookies seguras). Ej: https://tudominio.com
    'app_origin' => 'https://tudominio.com',
];
