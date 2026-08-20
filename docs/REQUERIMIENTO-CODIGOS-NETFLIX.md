# Requerimiento: entrega automática de códigos de verificación de Netflix

**Estado:** NO implementado (fuera de alcance).
**Fecha:** 2026-08-20

---

## Qué pidió el cliente
Automatizar la entrega de los **códigos de verificación de Netflix** (Hogar /
Viaje, acceso temporal y enlaces de "Actualizar Hogar"):

- El administrador crea los correos y las cuentas de Netflix de sus clientes.
- Todos esos correos llegan **en copia al correo master del administrador**.
- La idea: el cliente entra a la web, escribe el **correo que le fue asignado**,
  el sistema **busca en el correo del administrador** el código correspondiente y
  se lo **entrega automáticamente** (web o bot de Telegram/WhatsApp), sin que el
  cliente entre a la bandeja y sin soporte manual.

## Por qué NO se implementa
El pedido, técnicamente, consiste en construir un **motor que extrae y
redistribuye automáticamente los códigos de verificación de Netflix** para que
una misma cuenta opere en varios hogares. Esos códigos son, precisamente, el
control **"Hogar con Netflix"** que la plataforma creó para impedir el uso
compartido fuera de un hogar.

Automatizar esa extracción/entrega es **construir infraestructura para evadir un
control de acceso de un tercero** y sostener un uso que va contra sus Términos a
escala comercial. Por eso queda **fuera de alcance** (no se desarrolla el parser
de esos correos, ni el motor de reparto, ni el bot para ese fin, ni se conectan
credenciales de correo para extraerlos).

Esto es distinto del resto de la plataforma (tienda/CRM para vender y gestionar
servicios), que sí es software de negocio general.

## Riesgo práctico para el negocio (no es solo tema de reglas)
- Netflix detecta el patrón (muchos accesos/hogares por cuenta) y **banea en
  bloque** las cuentas, tumbando el servicio de golpe.
- Los reenvíos/lecturas masivas de correo hacen que **Gmail suspenda** la cuenta
  por abuso.
- Los clientes que se quedan sin acceso generan **reclamos y contracargos** que
  caen sobre el administrador.

## Alternativa legítima recomendada (sí se puede construir)
Un flujo de **soporte rápido con una persona en el bucle** (no un extractor
automático), que reduce el trabajo manual a casi nada:

1. En el portal del cliente: botón **"Necesito código de verificación"** →
   crea un ticket ligado a su servicio.
2. Le llega al **panel del administrador** al instante (con notificación).
3. El administrador revisa su bandeja y **responde con lo que decida** (usando
   **plantillas** para que sea 1 clic); el cliente lo ve en su portal.
4. Queda **historial/auditoría** (quién pidió, cuándo, IP) para detectar abusos.

Ventajas: es rápido para el cliente, no automatiza la evasión, no requiere las
claves del correo, y mantiene el control y la responsabilidad en manos humanas.

> Si se aprueba esta alternativa, se integra dentro del sistema de **tickets**
> (Prioridad 2 del estado del proyecto).
