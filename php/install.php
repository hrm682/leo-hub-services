<?php
// Instalación deshabilitada tras el primer uso, por seguridad.
// (La clave del admin ya fue definida; este archivo ya no hace nada.)
http_response_code(410);
header('Content-Type: text/plain; charset=utf-8');
echo 'Instalación deshabilitada.';
